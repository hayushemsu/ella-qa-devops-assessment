# Test Strategy: Ella API (E-commerce Backend)

**Scope:** NestJS REST API with three modules (Users, Products, Transactions) on PostgreSQL 16.
**Author:** Hayat Shemsu | **Version:** 1.0

## 1. Objectives and risk profile

The most valuable thing the API does is turn a purchase into a correct record and a correct stock level. Exploratory testing confirmed this is also where the worst defects are. A purchase increases stock instead of decreasing it (BUG-009, Critical). A product update overwrites the price with the quantity (BUG-008). Validation is inconsistent across the DTOs.

Risk drives the priority order of this strategy:

| Priority | Area | Why |
|---|---|---|
| 1 | Transactions and stock integrity | Money and inventory; concurrency risk (no lock, no DB transaction) |
| 2 | Product price and quantity handling | Wrong prices flow into every sale |
| 3 | Input validation on all DTOs | Bad data and HTTP 500s caused by client errors |
| 4 | User creation and uniqueness | Fake success response on duplicate email (BUG-001) |
| 5 | Non-functional (performance, observability) | No health endpoint, raw DB errors returned to clients |

## 2. Test levels

**Unit tests (developers and QA, Jest).** Service logic with mocked repositories: stock arithmetic, status change to OUT_OF_STOCK, duplicate-email handling, price update mapping. These run in CI on every push and should finish in seconds. Target: every branch in the three services, including the error branches (23505 handling, NotFound, Conflict).

**API / integration tests (Jest + Supertest).** Real HTTP calls against a running API with a real PostgreSQL database. This is the main automated layer. It covers status codes, response shape (`{statusCode, message, data}`), validation rules, business rules and cross-module effects (a purchase reduces stock and appears under the user). The suite in `qa/automation-framework` has three groups: the critical flow, known-defect tests (one per bug, failing until fixed), and an expected-behaviour regression set.

**End-to-end flow.** The critical flow user, product, transaction, stock check is implemented as one ordered test. There is no UI in scope, so E2E means API-level journeys.

**Performance tests (k6).** One script for POST /transactions with a ramping load (up to 20 virtual users). Thresholds: error rate under 1% and p95 latency under 500 ms. Planned additions: GET /products read load, and a concurrency test where many users buy the last unit, to prove or disprove the race condition.

**Exploratory testing.** Session-based testing with Swagger and curl, guided by the risk table above, combined with code review of services and DTOs. This found all 10 reported defects.

## 3. Test types by quality attribute

- **Functional:** positive, negative and boundary cases for every endpoint.
- **Validation and robustness:** wrong types, empty and blank strings, negatives, fractions, huge numbers, malformed JSON, non-numeric ids.
- **Data integrity:** stock before and after, transaction totals, unique constraints (user email, product name).
- **Security (basic):** error messages must not leak database internals; note that there is no authentication, so every endpoint is public.
- **Reliability:** behaviour when the database is down, and partial-failure behaviour (the transaction is saved before the stock update).
- **Performance:** latency, throughput and error rate under load; behaviour at the limit.

## 4. Tooling

| Need | Tool | Reason |
|---|---|---|
| Manual API exploration | Swagger UI, curl | Already built into the project |
| Automated API tests | Jest + Supertest | Same language as the codebase, easy for developers to read and extend |
| Unit tests | Jest (already configured) | `npm test` works out of the box |
| Load tests | k6 (run locally or from the grafana/k6 image) | Scripts are plain JavaScript; thresholds fail the run automatically |
| CI | GitHub Actions | Repository is on GitHub |
| Reporting | Jest console output and JUnit XML, k6 summary export | Easy to attach to CI runs |

Playwright or Cypress were considered and not needed: there is no front end, and Supertest is lighter for pure API testing.

## 5. Environments and data

| Environment | Purpose | Database | Notes |
|---|---|---|---|
| Local | Development and exploratory testing | Docker PostgreSQL (`docker-compose.dev.yml`) | Host port 5433 if a local Postgres already uses 5432 |
| CI | Build, lint, unit tests, then API tests | Ephemeral PostgreSQL service container | Fresh database on every run |
| Staging | Pre-release, performance tests, final regression | Dedicated database, production-like size | Never shares data with production |
| Production | Live traffic | Managed PostgreSQL | Read-only smoke checks only |

**Test data rules:** every test creates its own data with unique names and emails (timestamp suffix), so tests do not collide on unique constraints. Known weakness: BUG-005 depends on database state (an empty product name can only be created once). A production-grade suite should reset or migrate a clean database before each run.

## 6. Entry and exit criteria

- **Entry:** build passes, migrations apply, the API starts and Swagger loads.
- **Exit for a release:** no open Critical or High defects; all known-defect tests either pass or have an approved waiver; unit and API suites green in CI; performance thresholds met on staging.

## 7. Defect management

Severity levels: Critical (data or money wrong, no workaround), High (wrong behaviour with a workaround, or bad data accepted), Medium (client error shown as server error, leaks internals), Low (cosmetic or minor data quality). Each report has steps, actual and expected results, root cause where known, impact and evidence. See `qa/BUGS.md`.

## 8. Mitigating deployment risk

1. **CI gate:** install, lint, build, unit tests and API tests must pass before merge. The original code fails `npm run build` (TS2352), which proves the value of this gate.
2. **Small, frequent releases** with one change at a time, so a failure has an obvious cause.
3. **Database migrations:** reviewed, applied automatically in staging first, backward compatible, with a rollback plan.
4. **Health and smoke checks:** add `GET /health`; after each deployment run a short smoke test (create user, create product, buy, verify stock) against the new version.
5. **Rollback:** keep the previous Docker image tag, so rollback means redeploying that tag. See `devops/deployment-runbook.md`.
6. **Gradual rollout** (canary or blue-green) once on a cloud platform, with automatic rollback on a rising error rate.
7. **Monitoring after release:** error rate, p95 latency, and a business signal such as stock levels that never go up after sales.

## 9. Risks and assumptions

- No authentication or authorization exists, so security testing is limited to input handling and error leakage.
- No requirements document was provided; expected behaviour was inferred from the code structure and common REST conventions.
- The race condition on the last item is predicted from the code, not yet proven. It needs a concurrency test.
- The k6 script was written but its run was not completed in the available time.