# Codebase Structure

**Analysis Date:** 2026-01-09

## Directory Layout

```
node-banana/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout, metadata
│   │   ├── page.tsx            # Main workflow page
│   │   ├── globals.css         # Tailwind base styles
│   │   └── api/                # API routes
│   │       ├── generate/       # Image generation
│   │       ├── llm/            # Text generation
│   │       ├── workflow/       # Save/load workflows
│   │       └── ...             # Other routes
│   ├── components/             # React components
│   │   ├── nodes/              # Node type implementations
│   │   ├── edges/              # Edge type implementations
│   │   ├── modals/             # Modal dialogs
│   │   ├── quickstart/         # Onboarding UI
│   │   └── *.tsx               # Top-level components
│   ├── store/                  # Zustand state
│   │   ├── workflowStore.ts    # Central workflow state
│   │   └── annotationStore.ts  # Drawing state
│   ├── types/                  # TypeScript definitions
│   │   ├── index.ts            # Main types
│   │   └── quickstart.ts       # Quickstart types
│   ├── utils/                  # Utilities
│   │   ├── costCalculator.ts   # Pricing calculation
│   │   ├── gridSplitter.ts     # Grid detection
│   │   ├── imageStorage.ts     # Image persistence
│   │   └── logger*.ts          # Logging
│   └── lib/                    # Feature libraries
│       └── quickstart/         # Quickstart logic + tests
├── public/                     # Static assets
├── examples/                   # Community workflows
├── .planning/                  # Project planning docs
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── next.config.ts              # Next.js config
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components, API handlers
- Key files: `page.tsx` (main entry), `layout.tsx` (root layout)
- Subdirectories: `api/` for server routes

**src/components/**
- Purpose: React UI components
- Contains: All visual components
- Key files: `WorkflowCanvas.tsx`, `Header.tsx`, `FloatingActionBar.tsx`
- Subdirectories: `nodes/`, `edges/`, `modals/`, `quickstart/`

**src/components/nodes/**
- Purpose: Node type implementations (7 types)
- Contains: `BaseNode.tsx` (wrapper), `*Node.tsx` (specific types)
- Key files: `NanoBananaNode.tsx`, `PromptNode.tsx`, `ImageInputNode.tsx`

**src/store/**
- Purpose: Zustand state management
- Contains: Store definitions and actions
- Key files: `workflowStore.ts` (2000+ lines, central state)

**src/types/**
- Purpose: TypeScript type definitions
- Contains: All interfaces and type unions
- Key files: `index.ts` (main types), `quickstart.ts`

**src/utils/**
- Purpose: Business logic utilities
- Contains: Standalone helper functions
- Key files: `costCalculator.ts`, `gridSplitter.ts`, `imageStorage.ts`

**src/lib/quickstart/**
- Purpose: Quickstart/onboarding feature
- Contains: Templates, prompts, validation
- Subdirectories: `__tests__/` for test files

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` - Main application entry
- `src/app/layout.tsx` - Root layout and providers

**Configuration:**
- `tsconfig.json` - TypeScript config (path alias: `@/*`)
- `next.config.ts` - Next.js with Turbopack
- `vitest.config.ts` - Test configuration
- `.env.local` - Environment variables (gitignored)

**Core Logic:**
- `src/store/workflowStore.ts` - All workflow state and execution
- `src/components/WorkflowCanvas.tsx` - Canvas orchestration
- `src/types/index.ts` - Type definitions

**API Routes:**
- `src/app/api/generate/route.ts` - Image generation
- `src/app/api/llm/route.ts` - Text generation
- `src/app/api/workflow/route.ts` - File operations

**Testing:**
- `src/lib/quickstart/__tests__/*.test.ts` - Unit tests

**Documentation:**
- `README.md` - User-facing documentation
- `CLAUDE.md` - AI assistant instructions

## Naming Conventions

**Files:**
- PascalCase.tsx - React components (`WorkflowCanvas.tsx`)
- camelCase.ts - Utilities and stores (`costCalculator.ts`)
- kebab-case directories - API routes (`save-generation/`)
- *.test.ts - Test files (colocated in `__tests__/`)

**Directories:**
- camelCase - Feature directories (`quickstart/`)
- Plural for collections (`nodes/`, `edges/`, `modals/`)

**Special Patterns:**
- `route.ts` - Next.js API route handler
- `index.ts` - Barrel exports
- `__tests__/` - Test directory

## Where to Add New Code

**New Node Type:**
- Implementation: `src/components/nodes/{Name}Node.tsx`
- Types: Add to `src/types/index.ts` (NodeType union, data interface)
- Registration: `src/components/WorkflowCanvas.tsx` (nodeTypes)
- Store logic: `src/store/workflowStore.ts` (createDefaultNodeData, executeWorkflow)

**New API Route:**
- Handler: `src/app/api/{route-name}/route.ts`
- Export: `GET`, `POST`, etc. functions

**New Utility:**
- Implementation: `src/utils/{name}.ts`
- Tests: `src/utils/__tests__/{name}.test.ts`

**New Component:**
- Implementation: `src/components/{Name}.tsx`
- Or in feature directory: `src/components/{feature}/{Name}.tsx`

## Special Directories

**examples/**
- Purpose: Community workflow examples
- Source: JSON workflow files
- Committed: Yes

**.planning/**
- Purpose: Project planning documentation
- Source: GSD planning system
- Committed: Yes

**.next/**
- Purpose: Next.js build output
- Source: Generated during build
- Committed: No (gitignored)

---

*Structure analysis: 2026-01-09*
*Update when directory structure changes*
