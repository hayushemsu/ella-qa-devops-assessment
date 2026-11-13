# Ella Tech QA / DevOps Assessment: Submission

**Candidate:** Hayat Shemsu | **Repository:** fork of ellatech-eth/QA-Assessment

## 1. Approach in short

1. Set up the project (Node, Docker, PostgreSQL) and read the code before testing.
2. Explored the API by hand (Swagger and curl), guided by risk: stock and money first, then validation.
3. Confirmed suspicious lines in the code with real requests, so every bug report has a root cause and evidence.
4. Turned each finding into an automated test (Jest + Supertest) that fails until the bug is fixed.
5. Wrote the DevOps parts from what I actually ran: CI steps locally, the Docker stack, and real failures.

## 2. Contents

| Path | Content |
|---|---|
| `qa/test-strategy.md` | Test strategy: levels, tools, environments, deployment risk |
| `qa/automation-framework/` | Jest + Supertest suite (critical flow, known defects, regression) |
| `qa/BUGS.md` | 11 bug reports with severity, steps, root cause and evidence |
| `qa/performance-test.js` | k6 load test for POST /transactions |
| `qa/code-review-guidelines.md` | Review standards and a mock pull request review |
| `.github/workflows/ci.yml` | CI: install, lint, build, unit tests |
| `devops/ci-notes.md` | CI findings and how to extend toward continuous deployment |
| `devops/docker-troubleshooting.md` | Seven real problems, diagnosis and fixes |
| `devops/environment-notes.md` | Environment variables for development, testing, staging |
| `devops/deployment-runbook.md` | Build, deploy, rollback, common failures, cloud plan |

## 3. Key findings

11 bugs. The most serious:

- **BUG-009 (Critical):** a purchase increases stock instead of decreasing it (`+=` instead of `-=` in `transactions.service.ts`). The shop can sell more than it owns.
- **BUG-001 (High):** a duplicate email returns 201 "created" with a fake user (id 0) and saves nothing.
- **BUG-007 and BUG-008 (High):** negative prices are accepted, and updating a product overwrites its price with its quantity.
- **BUG-004, BUG-006 (Medium):** a bad id or a fractional quantity returns HTTP 500 and leaks the database error.
- **BUG-011 (Medium):** timestamps change with the server's time zone (seen when comparing a local run with the Docker run).

DevOps findings: the original code fails `npm run build` (TS2352) and lint (6 errors), and there are no unit tests. The Docker stack failed in three ways that I fixed or documented (port conflicts and a wrong `DB_PORT` inside Compose).

## 4. How to run

Prerequisites: Node.js, Docker Desktop, a `.env` copied from `.env.example`.

1. Start the database: `docker compose -f docker-compose.dev.yml up -d`
2. Install and migrate: `npm install` then `npm run migration:run`
3. Start the API: `npm run start:dev` (Swagger at http://localhost:4000/api)
4. Run the automated tests: `cd qa/automation-framework`, then `npm install`, then `npm test`
5. Full stack in Docker: `docker compose up -d --build`

**Expected result of `npm test` today: 13 failed, 11 passed.** The failures are the known-defect tests (each name carries its BUG number) and they will pass once the bugs are fixed. The regression group of 7 tests passes.

## 5. Changes I made to the original code

- `src/users/users.service.ts` line 38: `as User` changed to `as unknown as User`, only so the project compiles. This hides BUG-001 and is not a fix.
- `docker-compose.dev.yml` and `docker-compose.yml`: database host port 5433 instead of 5432 (a local PostgreSQL used 5432), and `DB_PORT=5432` added to the `api` service.
- `.env` uses `DB_PORT=5433` on my machine (not committed).

No other application code was changed, so the bugs reproduce on the original behaviour.

## 6. Assumptions and limitations

- No requirements document existed, so expected behaviour was inferred from the code and REST conventions.
- **The k6 load test was written but not run to completion.** I ran out of time debugging k6 on Windows (it was not on PATH, and the Docker run rejected the script file). The script is complete and valid, but I have no baseline numbers, so there is no performance analysis. This is a gap, not a result.
- The race condition on the last unit (no lock, no database transaction) comes from reading the code. It is not proven by a concurrency test.
- BUG-005 depends on database state: it returns 201 on a clean database and 409 once an empty-name product exists.
- The cause of BUG-011 (date columns without time zone) is suspected, not confirmed in the entity files.
- The CI workflow was written and its steps run locally, but it has not run on GitHub yet.
- Not done: Postman collection, manual test case table, unit tests, `GET /health` endpoint, and a real cloud deployment (the plan is described only).

## 7. What I would do with more time

1. Run the k6 test, record baseline numbers, and add a concurrency test for the last-unit race.
2. Fix the bugs on a branch (the fixes are one line each) and watch the known-defect tests turn green.
3. Add unit tests with mocked repositories, then remove `--passWithNoTests` from CI.
4. Add API tests to CI with a PostgreSQL service container, and a `GET /health` endpoint with a Docker healthcheck.
5. Reset the database before each test run, to make the tests fully independent.
6. Add a Postman collection and a table of manual test cases for the Transactions module.