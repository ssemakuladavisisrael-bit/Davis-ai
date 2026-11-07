# Davis AI - Intelligent Conversational Assistant

Davis AI is a full-stack, responsive AI chatbot web application inspired by the modern conversational experience of ChatGPT, powered by Google Gemini 3.8 Flash.

It is designed to help users with:
- 🎓 **Learning & Explanations**: Understand complex ideas with intuitive analogies and structured breakdowns.
- 💻 **Programming & Debugging**: Generate clean, documented code in any language with syntax highlighting and one-click copy.
- ✍️ **Writing & Editing**: Compose emails, articles, essays, and polish tone.
- 💡 **Brainstorming**: Spark creative ideas for projects, businesses, and everyday dilemmas.
- 🌍 **Everyday Advice**: Meal planning, productivity routines, travel ideas, and more.

---

## 🚀 Beginner Quickstart

### 1. Configure Your Gemini API Key

Davis AI uses a secure server-side architecture so your Google Gemini API key is never exposed to browser code.

#### Option A: Running in Google AI Studio
1. Open the **Settings** menu in Google AI Studio.
2. Navigate to the **Secrets** tab.
3. Add a secret named `GEMINI_API_KEY` and paste your API key (obtained from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
4. AI Studio will automatically inject it into the server environment at runtime.

#### Option B: Running Locally on Your Computer
1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your key:
   ```env
   GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
   PORT=3000
   ```
   *(Never commit `.env` containing your real keys to public repositories).*

---

### 2. How to Run the App

1. Install dependencies (if running locally for the first time):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and visit:
   ```
   http://localhost:3000
   ```

---

### 3. How to Test & Use Davis AI

- **Start a Conversation**: Type your prompt into the message box at the bottom and press `Enter` (or click the Send button). Press `Shift + Enter` to insert a newline.
- **Starter Suggestions**: Click any of the prompt cards on the welcome screen to test coding, writing, or everyday questions.
- **Multi-Turn Memory**: Ask follow-up questions (e.g. *"Can you rewrite that in Python?"* or *"Explain step 2 in more detail"*). Davis AI maintains conversational context across turns.
- **Code Blocks**: Generated code blocks feature syntax language headers and a one-click **Copy code** button.
- **Response Actions**:
  - **Copy**: Copy the entire formatted answer.
  - **Read**: Listen to Davis AI read the response aloud via speech synthesis.
  - **Feedback**: Rate answers with thumbs up or down.
  - **Regenerate**: Click the retry button to generate a new answer.
- **Conversation Management**:
  - Click **New Chat** (or press `⌘K` / `Ctrl+K`) to start a fresh thread.
  - Rename or delete past conversations in the left sidebar.
  - Search conversation history using the sidebar search box.
- **Tone & Persona**: Click **Settings** in the bottom left to switch between **Balanced**, **Creative**, or **Precise** tones.

---

### 4. How to Publish the App

#### Option A: In Google AI Studio
1. Click the **Deploy** button in the upper-right corner of Google AI Studio.
2. Select Cloud Run deployment.
3. Your app will build, deploy, and generate a live, shareable URL.

#### Option B: Production Container / Self-Hosting
1. Build the production client:
   ```bash
   npm run build
   ```
2. Start the full-stack server:
   ```bash
   npm start
   ```

---

## 🛡️ Security & Privacy
- **Server-Side Proxy**: All Gemini calls run through `server.ts`. No API keys or authorization headers are accessible to client-side JavaScript.
- **Local Storage**: Conversation sessions are stored in your browser's `localStorage` for privacy and persistence.


## 🎬 Video Studio

Davis AI now includes a realistic AI video workflow powered by Google Veo 3.1.

- Open **Create Video** from the chat header.
- Enter a topic, audience, duration and style.
- Gemini creates the storyboard, hook, narration and visual directions.
- **Generate full realistic AI video** sends the storyboard to the server.
- Veo 3.1 generates an initial 8-second photorealistic clip with native audio, then Davis AI can extend the Veo-generated video in roughly 7-second increments for longer videos.
- The generated result is returned as an MP4 for preview and download.
- The Gemini API key stays server-side.

### Important setup

The server must have a working `GEMINI_API_KEY` with access to Veo 3.1. Video generation is asynchronous and can take significantly longer than normal chat responses. Veo 3.1 currently supports 720p, 1080p and 4K for supported 8-second generations; the long-video extension workflow uses 720p. See Google's official Veo documentation for current availability, limits and pricing.

### Video architecture

`Prompt → Gemini storyboard → Veo 3.1 realistic generation → Veo extension for longer duration → MP4 preview/download`

The browser never receives `GEMINI_API_KEY`.

## 🧠 Davis Verification Mode & Meridian Benchmark

The chat header includes an optional **Verify** mode. When enabled, Davis AI:
1. Generates an initial answer using the selected Gemini model.
2. Sends that draft through a separate adversarial review pass.
3. Returns the reviewed answer in the existing chat stream.

Verification mode is opt-in because it makes an additional Gemini generation request and may increase latency and API usage. It is a review aid, not a guarantee of correctness. It does not claim to execute code in the live chat path.

### Local Meridian evaluation

The repository includes:
- `davis_harness.py` — local Gemini-connected benchmark runner, tool loop, grader and Brier calibration metric.
- `meridian_variants.json` — the 10 supplied Meridian cases, with the held-out cases kept separate.

Set `GEMINI_API_KEY` in your terminal environment, then run:

```bash
python davis_harness.py
python davis_harness.py --split train
python davis_harness.py --split all
```

You can select another Gemini model with `DAVIS_MODEL`. The harness runs model-requested Python locally with a timeout. This is **not a hardened sandbox**; use it only for trusted local benchmark runs, never as a public server-side code execution endpoint. Keep API keys out of source control.

