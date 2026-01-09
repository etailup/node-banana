# Coding Conventions

**Analysis Date:** 2026-01-09

## Naming Patterns

**Files:**
- PascalCase for components: `WorkflowCanvas.tsx`, `BaseNode.tsx`, `CostDialog.tsx`
- camelCase for utilities: `costCalculator.ts`, `gridSplitter.ts`, `imageStorage.ts`
- kebab-case for API routes: `save-generation/`, `browse-directory/`
- `*.test.ts` for test files, colocated in `__tests__/` directories

**Functions:**
- camelCase for all functions: `executeWorkflow()`, `updateNodeData()`, `calculateGenerationCost()`
- No special prefix for async functions
- `handle*` for event handlers: `handleChange`, `handleOpenModal`, `handleSubmit`

**Variables:**
- camelCase for variables: `nodeData`, `selectedNodes`, `isModalOpen`
- UPPER_SNAKE_CASE for constants: `PRICING`, `COMMON_ASPECT_RATIOS`, `MODEL_MAP`
- No underscore prefix for private members

**Types:**
- PascalCase for interfaces, no I prefix: `WorkflowNode`, `NodeType`, `BaseNodeData`
- PascalCase for type aliases: `WorkflowNodeData`, `AspectRatio`, `NodeStatus`
- Node data types: `{NodeName}NodeData` (e.g., `ImageInputNodeData`, `NanoBananaNodeData`)

## Code Style

**Formatting:**
- 2-space indentation
- Double quotes for strings: `"use client"`, `"text"`
- Semicolons required
- No Prettier config (uses IDE defaults)

**Linting:**
- Next.js built-in ESLint via `npm run lint`
- No custom `.eslintrc` file
- TypeScript strict mode enabled in `tsconfig.json`

## Import Organization

**Order:**
1. React/framework imports: `import { useState } from "react"`
2. External packages: `import { Handle, Position } from "@xyflow/react"`
3. Internal modules with path alias: `import { useWorkflowStore } from "@/store/workflowStore"`
4. Type imports: `import { PromptNodeData } from "@/types"`

**Grouping:**
- Blank line between groups
- Related imports grouped together

**Path Aliases:**
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Always use alias for internal imports

## Error Handling

**Patterns:**
- Try/catch at API route boundaries
- Status field updates for async operations: `status: 'loading' | 'complete' | 'error'`
- Error messages stored in node data for display

**API Routes:**
```typescript
return NextResponse.json({ success: true, data });
return NextResponse.json({ success: false, error: "message" }, { status: 500 });
```

**Store Actions:**
- Update node status on error
- Log errors for debugging
- Catch and handle async errors

## Logging

**Framework:**
- Custom logger in `src/utils/logger.ts`
- Session-based with unique IDs
- Console output in development

**Patterns:**
- Structured logging: `logger.info(category, message, context)`
- Categories: `workflow`, `node`, `api`, `file`, `validation`
- Sanitize sensitive data (truncate prompts, remove image data)

## Comments

**When to Comment:**
- Explain complex algorithms (e.g., topological sort in execution)
- Document connection validation rules
- Clarify non-obvious business logic

**JSDoc/TSDoc:**
- Used for public utility functions
- Include `@param`, `@returns` tags
- Example:
```typescript
/**
 * Generate a unique image ID for external storage
 */
export function generateImageId(): string { ... }
```

**TODO Comments:**
- Format: `// TODO: description`
- Found sparingly in codebase

## Function Design

**Size:**
- Most functions under 50 lines
- Exception: `executeWorkflow()` is large (~500 lines) - candidate for splitting

**Parameters:**
- Use destructuring for component props: `{ id, data, selected }`
- Options object for complex parameters

**Return Values:**
- Explicit returns
- Return early for guard clauses
- API routes return consistent `{ success, data/error }` shape

## Module Design

**Exports:**
- Named exports preferred
- Default exports for React components (optional)
- Barrel exports via `index.ts` for component directories

**Store Pattern:**
- Single large Zustand store (`workflowStore.ts`)
- Actions defined inline with state
- Selectors via `useWorkflowStore((state) => state.property)`

## React Patterns

**Client Directive:**
- `"use client"` at top of client components
- Server components by default in App Router

**Hooks:**
- `useCallback` for memoized handlers
- `useState` for local component state
- `useWorkflowStore` for global state

**Modals:**
- Use `createPortal` to render outside React Flow stacking context
- Track modal count in store to prevent keyboard shortcuts

---

*Convention analysis: 2026-01-09*
*Update when patterns change*
