# Nexus /log Page Overhaul Plan

## 1. Objective
Transform the `/log` page to support:
1.  **Vertical Split Layout**: Top (Memos) / Bottom (Todos).
2.  **Desktop Interoperability**: Embed a `WidgetTodo` section that syncs with the desktop Timer app via `/api/widget/todo`.
3.  **Smart Task Creation**: Simplify task entry using a single "Smart Input" field powered by AI to parse Task Name, Category, and Time.

## 2. Architecture

### 2.1 Backend
*   **New Route**: `app/api/log/smart-create/route.ts`
    *   **Method**: `POST`
    *   **Input**: `{ text: string, date: string }`
    *   **Logic**:
        1.  Fetch all `LogCategory` names (hierarchical) to build a context string.
        2.  Call AI (DeepSeek/Gemini) with a system prompt: "Parse this task string into JSON: { name, categoryPath, initialTime, instanceTags }."
        3.  Return structured JSON.
*   **Existing Route**: `/api/widget/todo` (Already exists, no change needed).

### 2.2 Frontend Components
*   **New Component**: `app/components/features/todo/WidgetTodoSection.tsx`
    *   Ported from `timer/src/pages/Todo.tsx`.
    *   Uses `swr` to fetch `/api/widget/todo`.
    *   Features: List, Add, Toggle, Delete, Grouping.
    *   Styling: Adapt to Nexus dark theme (Tailwind).
*   **New Component**: `app/components/features/log/SmartCreateLogForm.tsx`
    *   Replaces (or supplements) `CreateLogFormWithCards`.
    *   UI: Large Textarea + "Smart Create" button.
    *   State: `inputText`, `isParsing`.
    *   Flow: User types -> Click Create -> API Parse -> Confirm/Auto-submit -> `onAddToTimer`.
*   **Modified Component**: `app/log/sections/NotesSection.tsx`
    *   Rename to `LeftSidebarSection.tsx` (optional) or just modify structure.
    *   Implement Split View:
        *   `div.flex.flex-col.h-full`
        *   `div.flex-1` -> `SimpleMdEditor` (Notes)
        *   `div.h-[50%]` -> `WidgetTodoSection` (Todo)

## 3. Implementation Steps

### Step 1: Backend - AI Parsing
- Create `app/api/log/smart-create/route.ts`.
- Implement `generateText` using `getAIModel`.
- Define the prompt carefully to handle "Task (Category) Time" format.

### Step 2: Frontend - WidgetTodoSection
- Create `app/components/features/todo/WidgetTodoSection.tsx`.
- Copy logic from `timer/src/pages/Todo.tsx`.
- Replace `localStorage` logic with purely SWR or keep it for optimistic UI (preferred).
- Ensure styling matches `project-nexus` globals.

### Step 3: Frontend - Smart Input
- Create `app/components/features/log/SmartCreateLogForm.tsx`.
- Implement the API call to `/api/log/smart-create`.
- Integrate into `CreateLogModal.tsx`.

### Step 4: Page Layout Integration
- Modify `app/log/page.tsx` or `NotesSection.tsx` to include `WidgetTodoSection`.
- Adjust grid/flex layout to ensure height is distributed correctly (Up/Down).

## 4. Verification
- **Test 1**: Verify `/api/widget/todo` access from the new component.
- **Test 2**: Create a task via Smart Input "Buy milk (Life) 10m" -> Verify it appears in Timer.
- **Test 3**: Verify Todo items sync between Nexus Web and Timer Desktop (open both).
