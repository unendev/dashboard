# Nexus AI / GOC Project Handover Report

## 1. Project Overview
**Project Name:** AI-Powered Game Operations Center (GOC)
**Goal:** A real-time collaboration dashboard for multiplayer games (e.g., Don't Starve), featuring an AI tactical advisor that can read/write shared notes and todos.
**Tech Stack:**
*   **Framework:** Next.js 15 (App Router)
*   **Real-time Engine:** Liveblocks (Storage, Broadcast, Presence)
*   **AI Integration:** DeepSeek V3 (via standard OpenAI Interface)
*   **Styling:** Tailwind CSS + Shadcn/UI (Dark Tactical Theme)

---

## 2. Current Architecture & Implementation

### A. State Stream (Liveblocks)
We use Liveblocks `Storage` as the single source of truth for persistent data.
*   **Schema (`liveblocks.config.ts`):**
    *   `messages`: `LiveList` of chat history.
    *   `notes`: `string` (Shared notes).
    *   `playerNotes`: `LiveMap<userId, { content, name }>` (Individual notes).
    *   `todos`: `LiveList<{ id, text, completed }>` (Shared tasks).

### B. Intelligence Stream (AI Implementation)
**Current Strategy:** Manual Fetch + Regex Parsing (Zero SDK Dependency).
*   **Reason:** We attempted to use Vercel AI SDK (`ai` + `@ai-sdk/react`), but encountered persistent `TypeError` compatibility issues (`append is not a function`, `toDataStreamResponse is not a function`) likely due to version mismatches or Edge Runtime conflicts.
*   **Backend (`api/goc-chat/route.ts`):**
    *   Uses official `openai` library.
    *   Returns a standard `ReadableStream` (text/plain).
    *   **Prompt Engineering:** Instructs AI to use special text commands (e.g., `<<<UPDATE_NOTE: target|content>>>`) instead of native function calling.
*   **Frontend (`CommandCenter.tsx`):**
    *   Manually calls `fetch`.
    *   Uses `TextDecoder` to read the stream chunk by chunk.
    *   **Tool Parsing:** Uses robust Regex to detect `<<<...>>>` commands in the stream buffer.
    *   **Execution:** Executes Liveblocks mutations (`updateSharedNotes`, `addTodo`) immediately upon detection.
    *   **Cleanup:** Removes the raw command text from the display message so users see a clean UI.

### C. Collaborative Streaming (Broadcast)
To ensure all users see the AI typing in real-time:
1.  **Sender:** Broadcasts every received text chunk via `useBroadcastEvent` (`type: "AI_CHUNK"`).
2.  **Receivers:** Listen to events and update a local temporary state (`liveStreamingMessage`).
3.  **Finalization:** When the stream ends, the sender writes the full message to `Storage`. Receivers detect the Storage update and replace the temporary stream with the persistent message.

---

## 3. Core Files

| File | Responsibility |
| :--- | :--- |
| `app/components/goc/CommandCenter.tsx` | **The Brain.** Handles chat UI, manual fetch, stream parsing, regex command extraction, and broadcasting. |
| `app/components/goc/TacticalBoard.tsx` | **The State.** Displays/Edits Todos and Notes. Implements "Click-to-Edit" and Markdown rendering. |
| `app/api/goc-chat/route.ts` | **The Backend.** Calls DeepSeek. Dynamic System Prompt based on AI Mode (Advisor/Planner). |
| `app/api/liveblocks-auth/route.ts` | **Auth.** Generates random user identities (or uses `name` param) and authorizes Liveblocks session. |
| `app/components/shared/MarkdownView.tsx` | **UI.** Shared Markdown renderer with custom dark tactical styles. |

---

## 4. Current Pain Points (For the Next AI)

### 🔴 1. Fragility of Regex Parsing
*   **Issue:** Relying on `<<<UPDATE_NOTE: ...>>>` text patterns is inherently fragile. Although we improved the Regex to handle newlines and colons, AI models are non-deterministic and can still generate malformed output that breaks the parser (e.g., missing closing brackets, nested content).
*   **Desired State:** Native Function Calling (JSON-based) provided by Vercel AI SDK is superior but was abandoned due to implementation errors.

### 🔴 2. Data Consistency Risks
*   **Issue:** The "Collaborative Streaming" relies on the *Sender's* client to write the final message to Storage. If the Sender disconnects mid-stream, the message is lost for everyone (though they saw the temporary stream).
*   **Desired State:** Server-side persistence or more robust sync logic.

### 🔴 3. Code Complexity in `CommandCenter`
*   **Issue:** `CommandCenter.tsx` is now a "God Component". It handles UI, Stream Decoding, Regex Parsing, Liveblocks Mutations, and Broadcasting all in one massive `handleSubmit` function.
*   **Desired State:** Refactor stream parsing logic into a custom Hook (e.g., `useStreamParser`).

### 🔴 4. Vercel AI SDK Integration
*   **Issue:** We failed to correctly integrate the official SDK. The code currently "reinvents the wheel" (manual fetch).
*   **Desired State:** A proper setup using `useChat` + `streamText` + `tool()` that actually works would significantly simplify the codebase.

---

## 5. Instructions for the "Advanced AI"

If you are taking over, focus on:
1.  **Refactoring `CommandCenter.tsx`**: Break down the monolithic `handleSubmit`.
2.  **Re-attempting SDK Integration**: If you can solve the `TypeError` dependency hell, switching back to Vercel AI SDK is highly recommended for long-term maintenance.
3.  **Validating Regex**: If sticking to the current approach, double-check the Regex against complex Markdown input (e.g., tables, code blocks inside notes).
