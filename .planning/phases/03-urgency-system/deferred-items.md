# Deferred Items - Phase 03 Urgency System

## Pre-existing TypeScript Errors (Out of Scope)

Found during 03-01 execution. These are pre-existing errors unrelated to urgency system work.

### useVoiceInput.ts
- `TS2687: All declarations of 'length' must have identical modifiers` (lines 34, 40)
- `TS2687: All declarations of 'isFinal' must have identical modifiers` (line 43)
- `TS2687: All declarations of 'transcript' must have identical modifiers` (line 47)
- `TS2687: All declarations of 'confidence' must have identical modifiers` (line 48)

### app/api/config/route.ts
- `TS2322: Type '...| null' is not assignable to type 'AuthProvider'`
- `TS2677: A type predicate's type must be assignable to its parameter's type`

### __tests__/lib/auth.test.ts
- `TS2339: Property '__mock' does not exist on type` (lines 81, 95, 108)

### src/app/page.tsx
- `TS2614: Module '"@/components/TaskForm"' has no exported member 'TaskForm'`

### e2e/ specs
- Multiple type errors related to Playwright API usage

**Status:** Not fixed - pre-existing, out of scope for Phase 3
