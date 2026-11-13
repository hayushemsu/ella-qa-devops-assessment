# Deployment Runbook: Ella API

Service: NestJS API (port 4000) plus PostgreSQL 16, packaged with Docker Compose.
Files: `Dockerfile`, `docker-compose.yml` (full stack), `docker-compose.dev.yml` (database only).

## 1. Prerequisites

- Docker Desktop (or Docker Engine) running. `docker ps` must not return an error.
- A `.env` file created from `.env.example`.
- Ports 4000 (API) and 5433 (database, host side) free.

## 2. Build and deploy (local or a single server)

Swagger: http://localhost:4000/api

**Database tables.** A new database is empty. Run the migrations from the host while the database container is up:

`DB_HOST=localhost` and `DB_PORT=5433` must be set in `.env` for this step.

## 3. Release procedure (recommended for a server or cloud)

1. CI passes on the commit (lint, build, tests).
2. Build the image and tag it with the commit SHA, for example `shop-api:3f9c2ab`. Never deploy `latest`.
3. Back up the database before any release that includes a migration.
4. Apply migrations, then start the new container.
5. Smoke test: `GET /health` (once it exists) returns 200, then create a user and a product, buy one unit, and confirm the stock changed.
6. Watch error rate and logs for 15 minutes.

## 4. Rollback

1. Note the previous image tag (the last one that passed the smoke test).
2. Redeploy it: set the tag in the compose file or the platform's service definition, then run `docker compose up -d`.
3. Migrations: prefer backward-compatible migrations, so the old version still runs on the new schema. If a migration must be undone, run `npm run migration:revert` (reverts the last one) or restore the backup taken in step 3 above.
4. Repeat the smoke test and record what happened.

Rollback time target: under 10 minutes, because it only redeploys an image that already exists.

## 5. Health and monitoring

- **Today:** the API has no health endpoint. `docker ps` showing "Up" only means the process is alive, not that it works (see failure 3 below).
- **Recommended:** add `GET /health` that checks the database connection, then use it for a Docker `HEALTHCHECK`, the load balancer check and uptime monitoring.
- **Logs:** `docker logs -f shop-api`. In a cloud platform, ship container logs to CloudWatch, Azure Monitor or Cloud Logging, and alert on error rate and restarts.
- **Basic system health:** container CPU and memory (`docker stats`), database connections and disk space.
- **Business signal:** stock quantities must never go up after a sale (see BUG-009).

## 6. Common failures and fixes

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | `ports are not available ... 0.0.0.0:4000` | Another process (often a local `npm run start:dev`) uses port 4000 | Stop that process, then `docker compose up -d` |
| 2 | `password authentication failed for user "postgres"` | A local PostgreSQL on port 5432 answers instead of the container | Publish the container on another host port (5433) and set `DB_PORT` to match |
| 3 | Container is Up but the API does not answer; logs show `ECONNREFUSED ...:5433` | `.env` sets `DB_PORT=5433` (host port) but inside the Compose network the database listens on 5432 | Set `DB_PORT=5432` in the `api` service's `environment` block |
| 4 | `npm run build` fails with TS2352 at `users.service.ts:38` | Unsafe cast `as User` | Fix the typing (the workaround used here is `as unknown as User`) |
| 5 | `failed to connect to the docker API` | Docker Desktop is not running | Start Docker Desktop, wait for "Engine running" |
| 6 | Docker Desktop installer: "Virtual Machine Platform" missing | Windows feature disabled | Run `wsl --install` as administrator, restart |
| 7 | API starts but returns 500 with `relation "users" does not exist` | Migrations not applied | `npm run migration:run` |
| 8 | Container restarts in a loop | Application crash at startup | `docker logs shop-api`, fix the first error shown |

## 7. Cloud deployment plan (beginner level, AWS)

Goal: run the same container on AWS with a managed database.

1. **Push the image to Amazon ECR** (the container registry): create a repository, log in with the AWS CLI, then `docker build`, `docker tag` and `docker push`.
2. **Create the database in Amazon RDS** (PostgreSQL 16): small instance, private subnet, automated backups on. Put the password in **AWS Secrets Manager**.
3. **Run the container on AWS App Runner** (simplest) or **ECS on Fargate**: point it at the ECR image, set port 4000, and set the environment variables `DB_HOST` (the RDS endpoint), `DB_PORT=5432`, `DB_USERNAME`, `DB_DATABASE`, with `DB_PASSWORD` taken from Secrets Manager.
4. **Network:** allow the service to reach the database on port 5432 only (security group). Do not make the database public.
5. **Migrations:** run `npm run migration:run` once from a CI job or a one-off task against the RDS database before the first start.
6. **Health check:** configure the platform to call `/health` (add the endpoint first).
7. **Logs and alarms:** logs go to CloudWatch; create alarms for 5xx rate and for the container restarting.
8. **Deployments:** use the pipeline in `devops/ci-notes.md` to build, push and redeploy automatically. Rollback means redeploying the previous image tag.

Equivalent services on other clouds: Azure Container Apps with Azure Database for PostgreSQL, or Google Cloud Run with Cloud SQL.

## 8. Known gaps

- No `GET /health` endpoint yet.
- No authentication on any endpoint.
- No unit tests, and lint and build fail on the original code (see `devops/ci-notes.md`).
- The cloud plan was not executed. It describes the intended setup.