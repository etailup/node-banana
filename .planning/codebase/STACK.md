# Technology Stack

**Analysis Date:** 2026-01-09

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript (JSX/TSX) - React components throughout `src/`
- CSS (Tailwind) - `src/app/globals.css`, `postcss.config.mjs`

## Runtime

**Environment:**
- Node.js 18+ - Referenced in README, no explicit .nvmrc
- Next.js 16 App Router - Server-side rendering and API routes
- React 19.2.0 - Client-side rendering

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.0.6 - Full-stack web framework with App Router (`next.config.ts`)
- React 19.2.0 - UI framework
- @xyflow/react 12.9.3 - Node-based visual editor / React Flow canvas

**Testing:**
- Vitest 4.0.16 - Unit testing framework (`vitest.config.ts`)
- @vitest/coverage-v8 4.0.16 - V8 coverage provider

**Build/Dev:**
- TypeScript 5.9.3 - Static type checking
- Turbopack - Rust-based bundler (enabled in `next.config.ts`)
- PostCSS 8.5.6 - CSS preprocessor with Autoprefixer 10.4.22
- Tailwind CSS 4.1.17 - Utility-first CSS framework

## Key Dependencies

**Critical:**
- `@xyflow/react` 12.9.3 - Node editor canvas (`src/components/WorkflowCanvas.tsx`)
- `zustand` 5.0.9 - State management (`src/store/workflowStore.ts`)
- `@google/genai` 1.30.0 - Google Gemini AI SDK (`src/app/api/generate/route.ts`)
- `konva` 10.0.12 + `react-konva` 19.2.1 - Canvas drawing (`src/components/nodes/AnnotationNode.tsx`)

**Infrastructure:**
- `jszip` 3.10.1 - ZIP file compression for workflow export
- `next` 16.0.6 - App routing and server functions

## Configuration

**Environment:**
- `.env.local` files for secrets (gitignored)
- Required: `GEMINI_API_KEY`
- Optional: `OPENAI_API_KEY`

**Build:**
- `tsconfig.json` - TypeScript config with path aliases (`@/*` → `src/*`)
- `next.config.ts` - Next.js with Turbopack, 50MB body size limit
- `postcss.config.mjs` - PostCSS with Tailwind CSS
- `vitest.config.ts` - Vitest with V8 coverage

## Platform Requirements

**Development:**
- macOS/Linux/Windows (any platform with Node.js 18+)
- No external dependencies beyond npm

**Production:**
- Designed for local execution (desktop app workflow)
- Can deploy to Vercel or similar Next.js hosting
- Requires access to Google Gemini API

---

*Stack analysis: 2026-01-09*
*Update after major dependency changes*
