<div align="center">
  
# ⚡ Briefly.AI
**The Memory-Driven AI Workspace & Autonomous Task Agent**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![n8n](https://img.shields.io/badge/n8n-Automation-FF6D5A?style=flat&logo=n8n)](https://n8n.io/)
[![Groq](https://img.shields.io/badge/Groq-LPU-f97316?style=flat)](https://groq.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=flat&logo=redis)](https://redis.io/)

*Designed, architected, and engineered entirely as a solo full-stack initiative.*

</div>

---

## 🚀 Overview

**Briefly.AI** is not just another chatbot wrapper; it is a highly sophisticated, multi-modal AI workspace built for power users. Engineered to act as a persistent digital brain and background worker, Briefly.AI learns user preferences over time, reads complex web and document data, and autonomously writes and deploys background automations.

Built from the ground up, this project demonstrates the seamless integration of modern frontend performance techniques with complex backend agentic workflows.

<br/>

<div align="center">
  <a href="https://youtu.be/YOUR_VIDEO_ID_HERE" target="_blank">
    <img src="./assets/active-chat.png" alt="Watch the Demo Video" width="100%" />
  </a>
  <p><i>👆 Click the image above to watch the 2-minute technical demo (n8n, Voice UI, & Virtual Scrolling).</i></p>
</div>

---

## 🧠 Core Innovations & Complex Engineering

As a solo developer, I tackled several notoriously difficult computer science and UX challenges to bring this platform to a production-ready state:

### 1. High-Performance Infinite Chat Rendering
* **The Problem:** Rendering long conversations containing heavy markdown, code blocks, and media usually causes the browser to freeze, lag, and consume massive amounts of memory.
* **The Solution:** I engineered a custom virtualized rendering engine using `virtua`. Instead of loading the entire DOM, the application intelligently recycles memory and only renders the messages currently visible on the screen. Coupled with mathematically stable composite keys, the app maintains a flawless 60fps experience even during real-time LLM text streaming in massive chat histories.

### 2. Autonomous Background Worker (n8n Integration)
Briefly.AI doesn't just talk; it *does*. 
* **The Innovation:** I built a custom interceptor that connects the AI directly to an n8n automation instance. When a user requests a background task (e.g., "Check this RSS feed every hour and email me updates"), the AI fetches a universal JSON blueprint, prunes unnecessary nodes, rewires the logic, and deploys the active workflow to the server autonomously via REST APIs.

### 3. Persistent, Extractable Long-Term Memory
* **The Feature:** The AI continuously analyzes user conversations in the background to extract core facts, skills, and goals. 
* **The Complexity:** I developed a specialized prompt protocol that ignores temporal commands ("remind me tomorrow") and solely captures long-term identity traits. These traits are dynamically injected into the context window of future conversations, creating an AI that genuinely "remembers" its user. Users retain full CRUD control over these memories via a dedicated, real-time sync panel.

### 4. Stateful Caching & Voice Synthesis
* Integrated high-fidelity Text-to-Speech (TTS) using Deepgram. To minimize latency and API costs, I implemented a robust Redis caching layer. Subsequent requests for the same audio stream are served from memory in milliseconds.

<br/>

<div align="center">
  <img src="./assets/voice-mode.png" alt="Voice Chat Interface" width="80%" />
</div>

---

## 🛠️ Technical Architecture

### **Frontend Interface**
* **Framework:** Next.js 14 (App Router, React 18)
* **State Management:** `Zustand` for lightweight, lightning-fast global state, paired with URL-driven states and aggressive optimistic UI updates.
* **UI/UX:** Tailwind CSS, Headless UI, and Framer Motion for layout-aware, hardware-accelerated animations (e.g., floating modals, dynamic input states).

### **Backend & Agentic Logic**
* **Framework:** FastAPI (Python) for high-concurrency WebSocket and SSE (Server-Sent Events) streaming.
* **Agent Framework:** LangGraph / LangChain for multi-step reasoning.
* **Dynamic Tool Routing:** The system intelligently analyzes user queries to dynamically select and invoke the appropriate external tools and APIs, rather than relying on hardcoded static logic.

### **Data & Infrastructure**
* **Databases:** MongoDB Atlas (Primary Document Store) & Redis (High-speed caching & state invalidation).
* **Ingestion:** Integrated Jina AI Reader API to bypass anti-bot walls and stream pure Markdown directly into the LLM context.

### **Security & Authentication**
* **Authentication:** `Better Auth` for secure, scalable session management.
* **Access Control:** Strict authentication middleware securing all private routes and API endpoints.
* **Threat Mitigation:** Robust CORS configurations and a Redis-backed Rate Limiter to prevent API abuse, manage LLM token costs, and defend against DDoS attempts.
* **Session Security:** Built-in Better Auth security protocols including CSRF protection and secure cookie handling.

---

## 🎯 Key User Capabilities

* **Real-Time Voice Chat:** A dedicated voice interaction mode featuring high-fidelity text-to-speech (TTS) synthesis and audio recording, enabling hands-free, natural conversations.
* **Incognito Mode:** A truly stateless session architecture that bypasses the database entirely for private, untracked queries.
* **Multi-Modal Document Chat:** Upload PDFs, images, and raw data files. The system strictly validates MIME types before securely processing them for AI ingestion.
* **Deep Workspace Integrations:** Connects directly to external productivity stacks (Notion, Google Drive, Linear, Slack) using OAuth and MCP (Model Context Protocol).
* **Dynamic UI Controls:** Context-aware input fields that seamlessly transition between Text, Audio Recording, and Streaming-Pause states based on the real-time status of the backend LLM.

---

*This project was developed independently to push the boundaries of what a solo engineer can build using modern AI orchestration and optimized UI techniques.*