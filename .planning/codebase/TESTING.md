# Testing Patterns

**Analysis Date:** 2026-01-09

## Test Framework

**Runner:**
- Vitest 4.0.16
- Config: `vitest.config.ts` in project root

**Assertion Library:**
- Vitest built-in expect
- Matchers: `toBe`, `toEqual`, `toHaveLength`, `toContainEqual`, `toHaveProperty`

**Run Commands:**
```bash
npm test                              # Run all tests in watch mode
npm run test:run                      # Run tests once
npm run test:coverage                 # Run with coverage report
```

## Test File Organization

**Location:**
- Colocated in `__tests__/` directories within feature folders
- Pattern: `src/lib/{feature}/__tests__/*.test.ts`

**Naming:**
- `{module-name}.test.ts` for all tests
- No distinction between unit/integration in filename

**Current Test Files:**
```
src/lib/quickstart/__tests__/
  ├── templates.test.ts     # Template data validation
  ├── prompts.test.ts       # Prompt generation tests
  └── validation.test.ts    # JSON validation tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";

describe("validation", () => {
  describe("validateWorkflowJSON", () => {
    describe("root validation", () => {
      it("should reject null input", () => {
        const result = validateWorkflowJSON(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          path: "",
          message: "Workflow must be an object",
        });
      });
    });
  });
});
```

**Patterns:**
- Nested `describe()` blocks for logical grouping
- `it()` with descriptive "should" naming
- Arrange/Act/Assert structure (implicit)
- One concept per test

## Mocking

**Framework:**
- No mocks currently used
- Tests work with actual functions and data

**What to Mock (if needed):**
- API calls (fetch)
- File system operations
- External services

**What NOT to Mock:**
- Pure functions
- Validation logic
- Data structures

## Fixtures and Factories

**Test Data:**
- Inline test data in test files
- No separate fixtures directory

**Pattern Example:**
```typescript
const validWorkflow = {
  version: 1,
  nodes: [],
  edges: [],
};
```

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness

**Configuration:**
```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  include: ["src/lib/quickstart/**"],
  exclude: ["node_modules", "src/__tests__"],
}
```

**View Coverage:**
```bash
npm run test:coverage
open coverage/index.html
```

## Test Types

**Unit Tests:**
- Current focus: Quickstart validation functions
- Test single functions in isolation
- Examples: `validateWorkflowJSON()`, `repairWorkflowJSON()`, `parseJSONFromResponse()`

**Integration Tests:**
- Not currently implemented
- Needed for: API routes, workflow execution

**E2E Tests:**
- Not currently implemented
- Would use Playwright if added

## Test Coverage Gaps

**Untested Areas:**
- `src/store/workflowStore.ts` - Core execution logic (HIGH PRIORITY)
- `src/app/api/**` - All API routes
- `src/components/**` - All React components
- `src/utils/costCalculator.ts` - Cost calculation
- `src/utils/gridSplitter.ts` - Grid detection

**Tested Areas:**
- `src/lib/quickstart/validation.ts` - Workflow JSON validation
- `src/lib/quickstart/templates.ts` - Template data structures
- `src/lib/quickstart/prompts.ts` - Prompt generation

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");
});
```

**Error Testing:**
```typescript
it("should reject invalid input", () => {
  const result = validateWorkflowJSON(null);
  expect(result.valid).toBe(false);
  expect(result.errors).toContainEqual({
    path: "",
    message: "Workflow must be an object",
  });
});
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions

---

*Testing analysis: 2026-01-09*
*Update when test patterns change*
