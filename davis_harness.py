"""Local Meridian benchmark runner for Davis AI.

Usage:
  set GEMINI_API_KEY=your_key
  python davis_harness.py
  python davis_harness.py --split train
  python davis_harness.py --split all

WARNING: run_code executes model-generated Python locally. Use only with trusted
model output on a machine you control. It is not a hardened production sandbox.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

MODEL = os.getenv("DAVIS_MODEL", "gemini-3.8-flash")
API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

SYSTEM = """You are a careful solver. Reply with ONE JSON object each turn, nothing else.
To compute anything, send {"action":"run_code","code":"<python>"} and print() your results.
Never do arithmetic in your head. When finished send:
{"action":"final","byzantine_worlds":[...],"p_h1_prior_0.05":float,"hstar":float|null,
 "confidence":0-1,"assumptions":[...],"conflicts":[...]}
byzantine_worlds = every Byzantine-assignment consistent with the messages
("none","A","B","C" or "D"). If the givens are inconsistent use []. If underdetermined, list all.
State every assumption you invent. Honest nodes tell the truth; a Byzantine node may say anything."""

def call_model(messages):
    if not API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY before running the Meridian harness.")
    system_text = next((m["content"] for m in messages if m["role"] == "system"), SYSTEM)
    contents = []
    for message in messages:
        if message["role"] == "system":
            continue
        role = "model" if message["role"] == "assistant" else "user"
        content = message.get("content", "")
        if not isinstance(content, str) or not content.strip():
            continue
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n\n" + content
        else:
            contents.append({"role": role, "parts": [{"text": content}]})
    payload = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.15}
    }
    endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + API_KEY
    request = urllib.request.Request(endpoint, data=json.dumps(payload).encode("utf-8"),
                                     headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1200]
        raise RuntimeError("Gemini HTTP " + str(exc.code) + ": " + detail) from exc
    parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    return "".join(part.get("text", "") for part in parts if isinstance(part, dict))

def run_code(code, timeout=10):
    if not isinstance(code, str) or len(code) > 12000:
        return "ERROR: code must be a string under 12,000 characters."
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as file:
        file.write(code)
        path = file.name
    try:
        env = {"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8"}
        result = subprocess.run([sys.executable, "-I", path], capture_output=True,
                                text=True, timeout=timeout, env=env)
        return (result.stdout + result.stderr)[:4000] or "(no output)"
    except subprocess.TimeoutExpired:
        return "ERROR: timeout"
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

def parse(reply):
    if not isinstance(reply, str):
        return None
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\{", reply):
        try:
            value, _ = decoder.raw_decode(reply[match.start():])
            if isinstance(value, dict):
                return value
        except json.JSONDecodeError:
            continue
    return None

def solve(problem_text, max_steps=8, verify=True):
    messages = [{"role": "system", "content": SYSTEM},
                {"role": "user", "content": problem_text}]
    final = None
    verified = False
    for _ in range(max_steps):
        reply = call_model(messages)
        messages.append({"role": "assistant", "content": reply})
        obj = parse(reply)
        if obj is None:
            messages.append({"role": "user", "content": "Invalid JSON. Reply with one JSON object only."})
            continue
        if obj.get("action") == "run_code":
            messages.append({"role": "user", "content": "OUTPUT:\n" + run_code(obj.get("code", ""))})
            continue
        if obj.get("action") == "final":
            if verify and not verified:
                verified = True
                final = obj
                messages.append({"role": "user", "content":
                    "Adversarial review: find missing worlds, unsupported assumptions or wrong numbers. "
                    "Re-check calculations with run_code, then return corrected final JSON."})
                continue
            return obj
    return final

def grade(answer, key, tolerance=0.02):
    if not answer:
        return 0.0
    score = 0.0
    worlds = answer.get("byzantine_worlds")
    if isinstance(worlds, list) and sorted(worlds) == sorted(key["consistent_byzantine_worlds"]):
        score += 0.4
    probability = answer.get("p_h1_prior_0.05")
    if isinstance(probability, (int, float)) and abs(probability - key["P_H1_all_honest_prior_0.05"]) <= tolerance:
        score += 0.3
    hstar, expected = answer.get("hstar"), key["hstar_at_prior_0.05"]
    if (hstar is None and expected is None) or (
        isinstance(hstar, (int, float)) and expected is not None and abs(hstar - expected) <= tolerance
    ):
        score += 0.2
    if isinstance(answer.get("assumptions"), list) and answer["assumptions"]:
        score += 0.1
    return round(score * 10, 1)

def brier(results):
    if not results:
        return 0.0
    return sum((confidence - (1.0 if score >= 9 else 0.0)) ** 2
               for confidence, score in results) / len(results)

def prompt_for(v):
    return (
        "Nodes A-D. Efficiencies " + str(v["efficiencies"]) +
        ". Temps(C) " + str(v["temps_C"]) + ". 7-day counts " + str(v["counts"]) +
        ". Background b=" + str(v["b_calibration"]) +
        "/day, +3% per C above 25. Signal s=1.5/day under H1 (prior 0.05). " +
        "Prior: 60% no Byzantine node, 40% exactly one (uniform). Messages: " +
        str(v["messages"]) + ". Silent: " + str(v["silent"]) + ".\n" +
        "Give: consistent Byzantine worlds, P(H1|data) assuming all nodes honest, and h* where PROBE ties " +
        "min(HOLD,SEAL) (HOLD=0.05*P*20000; SEAL=50; PROBE=5+P*(0.3h*20000+" +
        "(1-0.3h)*(0.9*50+0.1*0.05*20000))). Use null for hstar if PROBE never wins."
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", choices=["train", "heldout", "all"], default="heldout")
    parser.add_argument("--dataset", default=os.path.join(os.path.dirname(__file__), "meridian_variants.json"))
    args = parser.parse_args()
    with open(args.dataset, "r", encoding="utf-8") as file:
        variants = json.load(file)
    selected = variants if args.split == "all" else [v for v in variants if v["split"] == args.split]
    if not selected:
        raise SystemExit("No benchmark cases found for split " + args.split)
    results = []
    for variant in selected:
        answer = solve(prompt_for(variant))
        score = grade(answer, variant["key"])
        try:
            confidence = min(1.0, max(0.0, float((answer or {}).get("confidence", 0.5))))
        except (TypeError, ValueError):
            confidence = 0.5
        results.append((confidence, score))
        print("variant " + str(variant["id"]) + ": " + str(score) + "/10 | confidence=" + format(confidence, ".2f"))
    mean = sum(score for _, score in results) / len(results)
    print("mean: " + format(mean, ".2f") + "/10 | Brier: " + format(brier(results), ".3f") +
          " | cases: " + str(len(results)))

if __name__ == "__main__":
    main()
