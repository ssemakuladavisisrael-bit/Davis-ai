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

Davis AI now includes a built-in **Video Studio**.

- Open **Create Video** from the chat header.
- Enter a topic, audience, duration and style.
- Gemini creates a structured storyboard with a hook, scenes, narration and visual directions.
- Render the storyboard directly in the browser as a 16:9 WebM video.
- Preview the result and download it from the app.
- Gemini remains server-side; the browser never receives `GEMINI_API_KEY`.

### Video architecture

The current version intentionally uses a browser renderer so it can create a working video without exposing API secrets. The next upgrade can connect the storyboard scenes to an image/video generation provider and add generated voice-over, subtitles and richer transitions.
