# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Debug Print Statements in Production Code:**
- Issue: Multiple `print()` statements used for debugging remain in agent and main request handlers, exposing system information and LLM provider details to logs
- Files: `backend/app/agents/core.py` (lines 46-50, 81, 113, 155, 168), `backend/app/main.py` (line 80)
- Impact: Verbose logging of internal system state, API keys (partially masked), LLM models, and provider information could leak sensitive details; clutters production logs
- Fix approach: Replace with structured logging using Python's logging module with appropriate log levels; mask/redact sensitive information; remove debug statements before production deployment

**Default Credentials in Frontend:**
- Issue: Demo user hardcoded with plaintext password in frontend code that auto-authenticates
- Files: `frontend/lib/api.ts` (lines 78-82, 89, 105)
- Impact: Any client can authenticate as demo user; credentials are visible in compiled code; security posture relies on this being a demo-only feature
- Fix approach: Move demo auth logic to backend; use environment-based feature flags to enable/disable demo mode; never hardcode credentials in frontend code

**Manual SQL Migration in Database Init:**
- Issue: Raw SQL text() statements used in `init_db()` for schema migrations, bypassing ORM safety mechanisms
- Files: `backend/app/database.py` (lines 29-32)
- Impact: Potential SQL injection vectors if ever parameterized with user input; schema migration logic isn't tracked or version-controlled; can't be safely rolled back
- Fix approach: Implement Alembic for database migrations as noted in comment; move one-time migrations to version-controlled migration files; validate all SQL strings

**Generic Exception Handling:**
- Issue: Catch-all `Exception` type used in agent processing and generic error messages returned to user
- Files: `backend/app/agents/core.py` (line 223), `backend/app/main.py` (lines 305-308)
- Impact: Difficult to debug errors; loses error context; all errors treated identically; could mask programming errors
- Fix approach: Catch specific exception types; create custom exception hierarchy; log full tracebacks for internal errors while returning sanitized user messages

**Configuration with Unsafe Defaults:**
- Issue: Hardcoded `SECRET_KEY = "change-me-in-prod"` default could be used in production if environment not configured
- Files: `backend/app/config.py` (line 7)
- Impact: JWT tokens could be compromised; anyone knowing default secret can forge valid tokens
- Fix approach: Remove default value; raise error at startup if SECRET_KEY not set; validate in tests that defaults cannot be used for auth

## Known Issues

**LLM JSON Parsing Fragility:**
- Symptoms: Agent expects JSON wrapped in `:::` delimiters but regex pattern is greedy and may match across unintended content; retry logic relies on heuristic detection of LLM hallucination
- Files: `backend/app/agents/core.py` (lines 158-169)
- Trigger: When LLM outputs JSON-like content in response text or fails to follow instruction format
- Workaround: None; system attempts retry but may still fail; fallback is raw LLM response without command execution
- Recommended fix: Use formal tool-calling APIs instead of text parsing; implement stricter prompt engineering to ensure format compliance

**Task Update Inconsistency Between effort_score and estimated_duration:**
- Symptoms: Two separate fields track effort, can diverge if only one is updated; sync logic may not catch all cases
- Files: `backend/app/crud.py` (lines 118-121)
- Trigger: When updating tasks via API with only `effort_score` or only `estimated_duration`
- Impact: Frontend may display inconsistent effort values; ranking based on effort_score and time-based filtering based on estimated_duration won't align
- Fix approach: Consolidate to single effort field; migrate estimated_duration to effort_score; update all API clients

**Database Engine Echo Enabled in Production:**
- Symptoms: `echo=True` on SQLAlchemy engine logs all SQL statements including data
- Files: `backend/app/database.py` (line 12)
- Trigger: Any database query
- Impact: Performance degradation from logging; sensitive data may appear in logs (task content, user emails, etc.)
- Fix approach: Disable echo; use `echo=True` only for development; make configurable via environment

**No Timeout or Rate Limiting on LLM Calls:**
- Symptoms: LLM requests have 30-second timeout but no per-user rate limiting or max concurrent requests
- Files: `backend/app/agents/core.py` (line 64)
- Trigger: User sends many chat messages rapidly or LLM provider is slow
- Impact: Server could be overwhelmed by LLM request queue; no protection against abuse or denial-of-service
- Fix approach: Implement per-user rate limiting; add request queue size limits; implement exponential backoff for LLM retries

## Security Considerations

**JWT Secret Not Validated at Startup:**
- Risk: If environment variable not set, default insecure secret is used without warning; deployments might accidentally use default
- Files: `backend/app/config.py` (line 7), `backend/app/auth.py` (line 39, 55)
- Current mitigation: Comment says "change-me-in-prod" but no enforcement
- Recommendations: Remove default; add startup validation that raises error if SECRET_KEY not configured; add pre-deployment checks in CI

**CORS Configuration Hard-coded:**
- Risk: Frontend domain hard-coded in backend; any change requires code deployment
- Files: `backend/app/main.py` (lines 63-67)
- Current mitigation: None; Railway production URL is in list
- Recommendations: Use environment variable for allowed origins; support comma-separated list from config; validate origin against environment-based whitelist

**No Input Validation on Task Creation from LLM:**
- Risk: LLM-generated task data bypasses frontend validation and goes directly to database
- Files: `backend/app/agents/core.py` (line 185), `backend/app/main.py` (lines 182-188)
- Current mitigation: Pydantic model validation on TaskCreate, but LLM could provide edge cases
- Recommendations: Add explicit bounds checking for score fields (1-100); validate title length; sanitize all user-facing strings; add logging of LLM-generated data for audit

**OAuth Credential Handling:**
- Risk: Google OAuth token validation relies on optional dependency; graceful failure returns 500 error
- Files: `backend/app/main.py` (lines 35-39, 100-104)
- Current mitigation: Checks if `google_id_token` is None before using
- Recommendations: Make clear whether Google auth is required or optional; document dependency installation; return 501 (Not Implemented) if optional feature not available

**No HTTPS Enforcement:**
- Risk: Tokens transmitted over HTTP in development could be intercepted
- Files: Entire auth system
- Current mitigation: Works on localhost; Railway uses HTTPS
- Recommendations: Add HTTPS-only flag in production; add HSTS headers; reject HTTP in non-dev environments; document security assumptions

## Performance Bottlenecks

**N+1 Query Problem in Task Listing:**
- Problem: Getting tasks loads user relationship for each task without eager loading
- Files: `backend/app/crud.py` (lines 54-61)
- Cause: SQLModel relationships lazy-load by default; no explicit `joinedload()` or `selectinload()`
- Current symptoms: Single request for 100 tasks could trigger 100+ database queries
- Improvement path: Add SQLAlchemy relationship loading strategies; test with real data volume; implement query result caching

**LLM Provider Retry Without Exponential Backoff:**
- Problem: If LLM endpoint is slow or temporarily unavailable, request blocks for full 30 seconds before retry
- Files: `backend/app/agents/core.py` (line 64)
- Current impact: User-facing request times out; no adaptive behavior
- Improvement path: Implement circuit breaker pattern; add exponential backoff for retries; cache successful responses when appropriate

**Regex Parsing in Hot Path:**
- Problem: DOTALL regex search on potentially large LLM responses happens on every agent request
- Files: `backend/app/agents/core.py` (line 158, 169)
- Impact: If LLM output is very large, regex could be slow; happens synchronously
- Improvement path: Consider more efficient parsing; limit response size; precompile regex patterns

**Database Eager Fetching on Theme Load:**
- Problem: `getThemes()` in frontend creates default themes if empty, triggering 2 additional API calls
- Files: `frontend/lib/api.ts` (lines 187-198)
- Current impact: Theme load on fresh session takes 3x longer than necessary
- Improvement path: Move default theme creation to backend on user signup; cache themes in localStorage; fetch once per session

## Fragile Areas

**LLM Agent Intent Classification:**
- Files: `backend/app/agents/core.py` (lines 94-124)
- Why fragile: Intent classification depends on substring matching in unstructured LLM output; regex patterns are fragile and may misclassify requests; fallback is generic "chat" which doesn't handle the intent correctly
- Safe modification: Add comprehensive test cases for intent classification; consider using structured outputs if LLM supports it; add logging of confidence scores
- Test coverage gaps: No unit tests for `_classify_intent()`; no test cases for ambiguous inputs like "What tasks should I track?"

**Task Creation JSON Parsing:**
- Files: `backend/app/agents/core.py` (lines 171-226)
- Why fragile: Relies on exact format `:::{...}:::` in LLM output; JSON parsing can fail silently with try-except; retry logic uses fragile heuristics
- Safe modification: Add input validation for JSON structure before parsing; log parse errors with full context; implement JSON schema validation
- Test coverage gaps: No tests for malformed JSON from LLM; no tests for edge cases like nested JSON or special characters

**Frontend-Backend Communication Protocol:**
- Files: `frontend/components/ChatInterface.tsx` (lines 84-103), `backend/app/agents/core.py` (lines 219)
- Why fragile: Relying on custom command format `:::` is fragile; two separate code paths for tool action (client fallback and server signal); commands embedded in text response can be lost
- Safe modification: Use HTTP headers or separate response field for structured commands; implement version negotiation for protocol changes
- Test coverage gaps: No tests for command extraction; no tests for mixed command and text responses

**Demo User Auto-Auth:**
- Files: `frontend/lib/api.ts` (lines 74-120)
- Why fragile: Auto-creates user if doesn't exist; retries on 401 without clear failure path; clears token and retries which could cause infinite loops
- Safe modification: Add explicit demo mode flag; implement max retry count; log auth failures for debugging; separate demo flows from production auth
- Test coverage gaps: No tests for token expiration scenarios; no tests for concurrent auth requests

## Scaling Limits

**In-Memory Chat History:**
- Current capacity: Limited by browser memory (typically 50-100MB usable)
- Limit: Chat history stored in Zustand store; no persistence; no pagination; grows indefinitely per session
- Scaling path: Implement message pagination; persist history to IndexedDB; archive old messages; implement message compression

**Single Database Connection Pool:**
- Current capacity: Default SQLAlchemy async pool size (typically 5-10 connections)
- Limit: High concurrency (10+ simultaneous LLM requests) could exhaust pool
- Scaling path: Configure pool_size and max_overflow in SQLAlchemy; monitor pool utilization; add connection pooling middleware; implement queue management

**Synchronous LLM Requests Block Server:**
- Current capacity: Sequential LLM calls; each request waits for completion
- Limit: 10 concurrent users × 30 second LLM timeout = 300 seconds of queueing
- Scaling path: Implement request queuing with priority; add async request handling; implement request timeout at gateway level; cache frequent LLM responses

**No Pagination on Task Lists:**
- Current capacity: All tasks loaded into memory
- Limit: After 1000+ tasks, frontend becomes sluggish; database queries slow down
- Scaling path: Implement cursor-based pagination; load tasks on demand; implement virtual scrolling in frontend; archive completed tasks

## Dependencies at Risk

**Optional Google Auth Dependencies:**
- Risk: `google-auth` and `google.oauth2` may not be installed; graceful degradation returns error instead of disabling feature
- Impact: Google login fails even if properly configured if dependencies weren't installed
- Migration plan: Make Google auth optional with feature flag; document installation; consider switching to python-jose for token verification instead of separate dependency

**Deprecated FastAPI Usage:**
- Risk: `.dict()` method used on Pydantic v2 models (deprecated, use `.model_dump()`)
- Files: `backend/app/main.py` (line 300)
- Impact: Will break on Pydantic v3; migration warnings already present
- Migration plan: Update to `.model_dump()`; update Pydantic to latest v2; test compatibility before upgrade

**Async SQLite (aiosqlite) for Testing:**
- Risk: Production uses PostgreSQL but tests use SQLite; different SQL dialects and behaviors
- Impact: Passing tests may hide production bugs; schema migrations may not work on both
- Migration plan: Use PostgreSQL container in tests; implement test-database fixtures; validate migrations on both databases

## Missing Critical Features

**No Audit Logging:**
- Problem: Task modifications, LLM-generated commands, and auth events not logged for compliance/debugging
- Blocks: Cannot investigate security incidents; cannot track who deleted tasks; cannot debug agent decisions
- Implementation: Add audit table; log all mutations with user/timestamp/change; implement audit log viewer in admin UI

**No LLM Response Validation:**
- Problem: Agent accepts any JSON output from LLM without semantic validation
- Blocks: LLM could create invalid state (task with 0 length, negative scores); no protection against LLM hallucination
- Implementation: Validate all LLM-generated data against strict schema; implement score bounds; add confidence scoring

**No User Rate Limiting:**
- Problem: No protection against spam or abuse
- Blocks: Single user could flood server with requests; no cost control for LLM usage
- Implementation: Add per-user request limits; implement LLM token budgets; add request queuing with prioritization

**No Error Reporting/Monitoring:**
- Problem: Errors logged to stdout; no centralized error tracking
- Blocks: Cannot track error patterns; cannot be alerted to outages; users submit issues without context
- Implementation: Add Sentry/similar error tracking; implement structured logging; add health check endpoints

## Test Coverage Gaps

**Agent Intent Classification - Untested:**
- What's not tested: Edge cases like "Tell me what to track", "How's my progress", ambiguous requests
- Files: `backend/app/agents/core.py` (lines 94-124)
- Risk: Intent misclassification causes wrong agent handler to run; feature silently degrades
- Priority: High - affects core feature; easy to test

**LLM JSON Parsing - Minimal Coverage:**
- What's not tested: Malformed JSON, JSON with special characters, nested structures, empty response
- Files: `backend/app/agents/core.py` (lines 171-226)
- Risk: Parsing errors return generic user message; cannot debug
- Priority: High - affects task creation feature

**Frontend Token Refresh - Not Tested:**
- What's not tested: Token expiration, concurrent requests with 401, retry logic edge cases
- Files: `frontend/lib/api.ts` (lines 132-140)
- Risk: Infinite retry loops possible; concurrent requests could cause race conditions
- Priority: Medium - affects reliability; could lock out users

**Chat Message Encoding - Not Tested:**
- What's not tested: XSS in chat messages, special characters in JSON, very long messages
- Files: `frontend/components/ChatInterface.tsx` (lines 84-103)
- Risk: Unescaped content could break UI; malformed messages could crash parser
- Priority: Medium - affects UX; potential security issue

**Database Migration Safety - Not Tested:**
- What's not tested: Manual SQL migrations with various PostgreSQL versions, rollback scenarios, production-like datasets
- Files: `backend/app/database.py` (lines 29-32)
- Risk: Migrations could fail in production; data loss possible; cannot safely rollback
- Priority: High - affects data integrity; manual migrations are risky

**Task Score Boundaries - Not Validated:**
- What's not tested: Invalid scores (0, 101, negative), boundary conditions (1 vs 2 priority), sync between score fields
- Files: `backend/app/models.py` (lines 87, 91, 97), `backend/app/crud.py` (lines 103-121)
- Risk: Inconsistent data; ranking algorithms may break; UI display issues
- Priority: Medium - affects data quality; impacts user experience

---

*Concerns audit: 2026-01-31*
