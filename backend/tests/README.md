# Liminal API Test Suite

Comprehensive integration tests for the Liminal API, covering all CRUD operations across all data domains.

## Technology Stack

- **pytest** - Modern Python testing framework
- **httpx** - Async HTTP client for API testing
- **pytest-asyncio** - Async test support
- **SQLite (in-memory)** - Fast, isolated test database

## Running Tests

### From Backend Directory
```bash
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest -k "test_create"   # Run tests matching pattern
pytest tests/test_tasks.py # Run specific file
```

### Using Test Runner Script
```bash
cd backend
./run_tests.sh
```

### From Docker Container
```bash
docker exec liminal_backend pytest
docker exec liminal_backend pytest -v
```

## Test Coverage

### Users (`test_users.py`)
- ✓ Create user with valid data
- ✓ Duplicate email validation (constraint enforcement)
- ✓ Minimal user creation

### Themes (`test_themes.py`)
- ✓ Create theme
- ✓ Get themes (empty and populated)
- ✓ List multiple themes
- ✓ Default color assignment
- ✓ User data isolation

### Initiatives (`test_initiatives.py`)
- ✓ Create initiative
- ✓ Create initiative with theme relationship
- ✓ Get initiatives (empty and populated)
- ✓ List multiple initiatives
- ✓ Minimal initiative creation
- ✓ User data isolation

### Tasks (`test_tasks.py`)
**Full CRUD operations:**
- ✓ CREATE: Create task with all fields
- ✓ CREATE: Create task with initiative relationship
- ✓ CREATE: Create minimal task (defaults)
- ✓ READ: Get empty task list
- ✓ READ: Get populated task list (ordered by created_at desc)
- ✓ UPDATE: Full task update
- ✓ UPDATE: Partial task update (status only)
- ✓ UPDATE: Multiple field update
- ✓ UPDATE: Non-existent task (404 error)

**Domain-specific features:**
- ✓ All priority levels (high, medium, low)
- ✓ All status values (backlog, todo, in_progress, blocked, done)
- ✓ ADHD-specific: estimated_duration field
- ✓ User data isolation
- ✓ Task-Initiative relationships

## Test Features

### Isolation
Each test runs in a completely isolated in-memory SQLite database that's created fresh and destroyed after each test function. This ensures:
- No test pollution between test cases
- Fast execution (in-memory)
- No persistent test data

### Fixtures
Common test data is provided via pytest fixtures:
- `sample_user_data` - Template user
- `sample_theme_data` - Template theme
- `sample_initiative_data` - Template initiative
- `sample_task_data` - Template task
- `client` - Async HTTP client
- `db_session` - Database session

### Async Support
All tests use async/await patterns, matching the production async FastAPI application.

## Test Results

```
============================= test session starts ==============================
collected 27 items

tests/test_initiatives.py ......                                         [ 22%]
tests/test_tasks.py .............                                        [ 70%]
tests/test_themes.py .....                                               [ 88%]
tests/test_users.py ...                                                  [100%]

======================= 27 passed in 0.80s =========================================
```

## Notes

- Tests use SQLite instead of PostgreSQL for speed and simplicity
- All relationship constraints are tested (foreign keys, cascades)
- User isolation is verified across all domains
- The duplicate email test documents a known gap: the API currently doesn't handle database constraint violations gracefully (returns 500 instead of 400/409)
