# CI/CD Notes

## What the pipeline does

File: `.github/workflows/ci.yml`. It runs on every push and every pull request, on a clean Ubuntu runner with Node 22.

| Step | Command | Fails when |
|---|---|---|
| Install | `npm ci` | The lock file and package.json disagree, or a package cannot be installed |
| Lint | `npm run lint` | ESLint reports an error |
| Build | `npm run build` | TypeScript does not compile |
| Unit tests | `npm test` | Any Jest test fails |

GitHub Actions stops at the first failing step and marks the run red, so a broken change cannot look green.

## Why the build step matters (a real finding)

The original code does not compile. `users.service.ts` line 38 used `as User` on an object that lacks `createdAt` and `updatedAt`, which is TypeScript error TS2352. That would fail the **Build** step here, and it also fails `docker compose up --build`. I changed it to `as unknown as User` only so the app would start. The cast hides a real bug (BUG-001), so it is a workaround and not a fix.

## Decisions

- `npm ci` instead of `npm install`: reproducible installs from the lock file.
- Node 22 (LTS). My local machine runs Node 26, so CI also proves the project works on a supported LTS version.
- npm cache enabled to keep runs fast.
- `--passWithNoTests` is temporary, so the pipeline does not fail while no unit tests exist. It must be removed once they do, because it can hide a missing suite.
- Status: the workflow was written locally and has not yet run on GitHub. It will run on the first push.

## Suggested improvements

1. **API tests in CI.** Add a job with a PostgreSQL service container, run migrations, start the API, then run the Jest + Supertest suite in `qa/automation-framework`. Known-defect tests are expected to fail today, so mark them as expected failures, or run only the regression group until the bugs are fixed.
2. **Branch protection.** Require the CI check to pass before merging to `main`.
3. **Coverage and reports.** Publish coverage and JUnit results as build artifacts.
4. **Dependency and image scanning.** `npm audit` and an image scan on every build.

## Extending toward continuous deployment

1. **Build an image on every merge to `main`.** Build the Dockerfile and push it to a registry (GitHub Container Registry or Amazon ECR), tagged with the commit SHA, for example `shop-api:3f9c2ab`. Never deploy `latest`.
2. **Deploy to staging automatically.** After CI passes, a second job deploys that exact image to staging, runs migrations, and waits for `GET /health` to return 200.
3. **Smoke test staging.** Run a short test (create user, create product, buy, check stock) and the k6 load test against staging. Failure stops the pipeline.
4. **Promote to production with approval.** Use a GitHub Environment named `production` with required reviewers, so a person approves the release. Deploy the **same image** that passed staging.
5. **Roll back by redeploying the previous tag.** Keep the last known good image. If the health check or the error rate fails after a release, the pipeline redeploys it automatically.
6. **Keep secrets out of the repository.** Store database credentials and cloud keys in GitHub Secrets (or the cloud's secret manager) and inject them at deploy time.
7. **Gradual rollout.** Once on a cloud platform, use blue-green or canary releases.

## Findings from running the pipeline steps locally

| Step | Result on the original code |
|---|---|
| Install (`npm ci`) | Passes |
| Lint | **Fails**: 6 errors and 1 warning that need a code change (see below) |
| Build | **Fails** with TS2352 at `users.service.ts:38`. Passes after the `as unknown as User` workaround |
| Unit tests | `No tests found, exiting with code 1`: the repository contains no unit tests |

### Lint details

Running ESLint on Windows reported 806 problems. 799 were auto-fixable `prettier/prettier` errors caused by CRLF line endings: Windows Git checks files out as CRLF, while the Prettier rules expect LF. A Linux CI runner checks out LF, so these do not occur in CI. The real findings are:

- `transactions.controller.ts`: unused import `Put`
- `users.service.ts` (2) and `products.service.ts` (2): `(error as any).code` triggers `no-unsafe-member-access`
- `transactions.service.ts`: `.message` read from an `any` value
- `main.ts`: warning, `bootstrap()` is a floating promise
- A few real Prettier issues: extra blank lines in `product.entity.ts` and `transactions.module.ts`, and one long line in `transactions.service.ts`

### Decisions

- The CI Lint step runs ESLint in **check-only** mode (`npx eslint`), not the project's `npm run lint` if that script uses `--fix`. A pipeline should report problems, not edit code on the runner.
- Application code was **not** changed to make CI green, so the bug reproductions in `qa/BUGS.md` still match the original code. The one exception is the one-word cast needed to compile.
- `npm test` runs with `--passWithNoTests` so the missing unit tests do not hide the other results. Remove the flag once tests exist.

### Recommendations

1. Replace `(error as any).code` with a typed check (`error instanceof QueryFailedError` and `error.driverError.code`), remove the unused `Put` import, and `void` or `await` the `bootstrap()` call. Lint then passes.
2. Add a `.gitattributes` file with `* text=auto eol=lf` so every developer gets the same line endings.
3. Add real unit tests, starting with the stock calculation and the duplicate-email path, then remove `--passWithNoTests`.
4. Make the CI check required before merging.