# Architecture

**Analysis Date:** 2026-01-09

## Pattern Overview

**Overall:** Monolithic Full-Stack Single-Page Application

**Key Characteristics:**
- Client-driven architecture with Zustand state management
- Next.js App Router for both UI and API routes
- Node-based visual workflow editor pattern
- Local-first with optional cloud AI services

## Layers

**Presentation Layer (React Components):**
- Purpose: UI rendering, user interaction, state binding
- Contains: Node components, canvas, modals, toolbars
- Location: `src/components/`
- Depends on: Store layer for state
- Used by: Root page component

**State Management Layer (Zustand):**
- Purpose: Central application state and business logic
- Contains: Workflow state, node/edge CRUD, execution logic
- Location: `src/store/workflowStore.ts`, `src/store/annotationStore.ts`
- Depends on: API layer for external calls
- Used by: All components via `useWorkflowStore()` hook

**API Layer (Next.js Routes):**
- Purpose: Server-side processing, external API calls
- Contains: Image generation, LLM, file operations
- Location: `src/app/api/`
- Depends on: External services (Gemini, OpenAI)
- Used by: Store layer via fetch calls

**Type System Layer:**
- Purpose: Single source of truth for TypeScript interfaces
- Contains: Node types, data interfaces, handle types
- Location: `src/types/index.ts`, `src/types/quickstart.ts`
- Depends on: Nothing
- Used by: All layers

**Utility Layer:**
- Purpose: Reusable business logic
- Contains: Cost calculation, grid splitting, image storage
- Location: `src/utils/`
- Depends on: Node.js built-ins
- Used by: Store and API layers

## Data Flow

**Workflow Execution Flow:**

1. User triggers execution (Cmd/Ctrl+Enter) via `FloatingActionBar` or `WorkflowCanvas`
2. `executeWorkflow()` called from Zustand store
3. Topological sort on node graph (dependency ordering)
4. For each node in order:
   - Check if in locked group → skip if locked
   - Check for pause edges → pause if found
   - `getConnectedInputs(nodeId)` retrieves upstream data
   - Execute node-specific logic (API call or transform)
5. `updateNodeData()` updates status (loading → complete/error)
6. `addIncurredCost()` tracks generation costs

**Node Data Flow via getConnectedInputs():**

- Image sources: `imageInput.data.image`, `annotation.data.outputImage`, `nanoBanana.data.outputImage`
- Text sources: `prompt.data.prompt`, `llmGenerate.data.outputText`
- Returns: `{ images: string[], text: string | null }`

**State Management:**
- Client-side: Zustand store with React subscriptions
- File-based: Workflow JSON saved to disk
- LocalStorage: Settings, costs, configs

## Key Abstractions

**Node System:**
- Purpose: Encapsulate workflow step types
- Examples: `ImageInputNode`, `NanoBananaNode`, `PromptNode`, `OutputNode`
- Pattern: BaseNode wrapper with type-specific content
- Location: `src/components/nodes/`

**Edge System:**
- Purpose: Define connections between nodes
- Examples: `EditableEdge` (with controls), `ReferenceEdge` (dashed)
- Pattern: React Flow edge components
- Location: `src/components/edges/`

**Group System:**
- Purpose: Logical node grouping with lock state
- Pattern: Groups stored in `Record<string, NodeGroup>`
- Behavior: Locked groups skip execution

**Store Actions:**
- Purpose: State mutations and async operations
- Examples: `addNode()`, `updateNodeData()`, `executeWorkflow()`
- Pattern: Zustand actions with `get()` and `set()`

## Entry Points

**Main Client Entry:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to root URL
- Responsibilities: Initialize app, render WorkflowCanvas

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page renders
- Responsibilities: Metadata, global providers, Toast

**API Routes:**
- Location: `src/app/api/[route]/route.ts`
- Triggers: Fetch calls from client
- Responsibilities: Server-side processing, external API calls

## Error Handling

**Strategy:** Try/catch at boundaries with status updates

**Patterns:**
- API routes return `{ success, error, data }` JSON
- Node execution updates `status: 'error'` with error message
- Store catches async errors and updates node state
- Logging captures errors for debugging

## Cross-Cutting Concerns

**Logging:**
- Client: `src/utils/logger.ts` with session tracking
- Server: `src/utils/logger-server.ts`
- Categories: workflow, node, api, file, validation

**Validation:**
- Connection validation in `WorkflowCanvas.tsx` (`isValidConnection()`)
- Workflow validation in `workflowStore.ts` (`validateWorkflow()`)
- Quickstart validation in `src/lib/quickstart/validation.ts`

**Cost Tracking:**
- Calculation: `src/utils/costCalculator.ts`
- Storage: localStorage per workflow
- Display: `CostIndicator` component

---

*Architecture analysis: 2026-01-09*
*Update when major patterns change*
