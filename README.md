# Briefly.AI 🚀

Briefly.AI is an advanced, full-stack, multi-modal AI application designed to provide a highly personalized, deeply integrated, and lightning-fast chat experience. 

Below is a comprehensive guide to the features, capabilities, and architecture that power this platform.

---

## ⚠️ Important Notes for Testers

Before exploring the application, please keep the following in mind:
* **Open Access (No Paywall):** I have deliberately removed all feature restrictions based on user subscription tiers. You can explore and test all premium features, models, and integrations without needing to process a Stripe payment.
* **Latency Expectations:** You may occasionally experience slow response times or delayed streaming. This is entirely due to the hardware limitations of the **free Hugging Face Spaces** hosting environment, not a bug in the application code.
* **Voice-to-Voice Interruptions:** While using the real-time Voice Chat feature, the AI may sometimes refuse to respond or drop the conversation. This is caused by strict token and rate limitations on the free API tiers, not a flaw in the application logic.

---

## 💬 Core Chat Experience

### 🌊 Live Chat Stream
Experience ultra-fast, real-time responses as the AI types its answers character by character, ensuring zero wait time for the user.

### 🧠 Live Thoughts & File Analysis Events
Watch the AI "think" in real-time. The UI displays transparent, live status updates when the AI is analyzing your prompt or extracting data from attached files before generating its final response.

### ⏸️ Stream Pause Button
Total control over your output. If the AI is generating a long response, you can hit the pause/stop button at any time to instantly halt the stream.

### 📄 Intelligent File Processing
Upload PDFs, images, and documents. The backend seamlessly extracts the context, parses the data, and integrates it directly into the AI's knowledge context for accurate answers.

### ✏️ Edit & 🔄 Regenerate
Not happy with a prompt or response? 
* **Edit:** Modify your past messages (even those with files attached) and the AI will fork the conversation and answer again.
* **Regenerate:** Ask the AI to try answering your last prompt again with a single click.

### 🔊 Voice Narration
Listen to your responses on the go. Click the narration button to have the AI read its generated text aloud with natural-sounding speech synthesis.

---

## 🧭 Navigation & Modes

### 📝 Realtime Chat Title Generation
Start a new chat, and the AI will automatically generate a concise, context-aware title for your conversation and instantly add it to your sidebar without requiring a page refresh.

### 🔍 Search Chats
Easily locate past conversations, ideas, or extracted data using the globally accessible chat search feature.

### 🕵️ Private Chat (Incognito Mode)
A truly stateless, zero-retention chat mode. No database tracking, no memory extraction, and no saved history. Close the tab, and the conversation is gone forever.

### 🎤 Voice Chat
Interact hands-free. Speak your prompts directly into the application, and the AI will process your voice and respond accordingly. Real-time audio streaming is powered by **LiveKit** for ultra-low latency communication.

---

## ⚙️ Personalization & Advanced AI

### 🎭 Custom Personalization Engine
Make the AI yours. Users can define global rules for the AI:
* **Custom Instructions:** Tell the AI who you are and how it should behave.
* **Verbosity:** Set the AI to be concise, normal, or highly detailed.
* **Writing Style:** Choose between professional, casual, academic, or creative tones.

### 🧠 Persistent Memory
The AI automatically extracts and remembers key facts about you across all conversations (e.g., your name, profession, dietary preferences) to provide highly contextual future answers.

### 🤖 Multi-Modal Selection
Users are not locked into one model. Select your preferred AI model from a dropdown (e.g., GPT-4, Claude 3, Llama, Gemini) based on your specific task requirements.

### 🔌 Multi-Tenant MCP Apps
Connect your favorite tools! The application supports Model Context Protocol (MCP), allowing secure, multi-tenant integration with external apps (Notion, Google Drive, Slack, Linear) tailored to your specific user account.

### ⚙️ n8n Automation Workflows
Build and trigger powerful background automations. The AI can interact with n8n to execute multi-step workflows based on your chat commands.

---

## 💰 Monetization

### 💳 Stripe Subscription Tiers
Built-in monetization with Stripe. Users can theoretically upgrade to premium tiers to unlock higher usage limits, advanced models, and exclusive integrations *(Note: Disabled for current testing purposes)*.

---

## 🏗️ Technical Architecture & Infrastructure

### 🧠 AI Orchestration (Backend)
* **LangGraph:** Powers the complex, multi-step agentic workflows (routing, file extraction, memory injection, tool usage).
* **LangSmith:** Integrated deeply for tracing, debugging, and monitoring the AI's internal reasoning and token usage.

### 🛡️ Backend Infrastructure
* **Database Management:** Secure, scalable, and highly structured data storage powered by **MongoDB** and **Mongoose** ORM.
* **Middleware & Security:** Robust custom middleware protecting endpoints.
* **Rate Limiting:** Protects the API from abuse and enforces subscription tier limits.
* **Redis Caching:** Lightning-fast state management and data retrieval to reduce database load.

### ⚡ Frontend Performance & UI
* **Modern Interface:** Beautifully styled with **Tailwind CSS**, fully accessible via **Headless UI**, and butter-smooth layout animations powered by **Framer Motion**.
* **React Query (TanStack):** Handles all asynchronous data fetching, caching, and state synchronization.
* **Optimistic Mutations:** Ensures the UI feels instantaneous (e.g., instantly deleting a chat while the server processes it in the background).
* **OneSignal Integration:** Delivers reliable push notifications to users for background task completions or important updates.

### 📈 Analytics & Monitoring
* **PostHog:** Tracks user product usage, feature adoption, and session recordings to improve UI/UX.
* **Sentry:** Captures real-time frontend and backend exceptions to ensure a bug-free experience.
