# Environment Configuration Notes

Source: `.env.example`, read by the NestJS app (`src/app.module.ts`), the TypeORM CLI (`data-source.ts`) and Docker Compose. The repository ships a single example file. The staging and testing values below are my recommendations, not files that exist in the repository.

## Variables

| Variable | Purpose | Example (development) |
|---|---|---|
| `PORT` | Port the API listens on | `4000` |
| `DB_HOST` | PostgreSQL host | `localhost` (API on the host) or `db` (API in Compose) |
| `DB_PORT` | PostgreSQL port | `5432` by default; `5433` on my machine, see note |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` (development only) |
| `DB_DATABASE` | Database name | `ella` |

The same five `DB_*` values are used by three consumers: the app at runtime, the migration CLI, and the PostgreSQL container (which creates the user and database on first start) together with its healthcheck.

## What changes between environments

| Setting | Development | Testing (automated) | Staging | Production |
|---|---|---|---|---|
| `PORT` | 4000 | 4000, or a random free port in CI | 4000 inside the container | 4000 inside the container |
| `DB_HOST` | `localhost`, or `db` in Compose | `localhost` or the CI service name | Managed database endpoint | Managed database endpoint |
| `DB_PORT` | 5432 (5433 if a local PostgreSQL exists) | 5432 | 5432 | 5432 |
| `DB_USERNAME` | `postgres` | `postgres` | Dedicated application user | Dedicated application user, least privilege |
| `DB_PASSWORD` | Simple, committed example only | Throwaway value | Secret from a secret manager | Secret from a secret manager, rotated |
| `DB_DATABASE` | `ella` | `ella_test`, separate database | `ella_staging` | `ella` |
| Data | Disposable | Created and removed by the tests | Anonymised or synthetic | Real customer data |
| Schema changes | `migration:run` by hand | Run on a fresh database every time | Migration step in the pipeline, then smoke test | Same migration, after approval and a backup |

## Rules

1. **Never commit `.env`.** `.env.example` holds names and safe defaults only. Staging and production secrets live in GitHub Secrets or the cloud provider's secret manager and are injected at deploy time.
2. **Testing uses its own database** (`ella_test`), so test runs can never touch development or staging data. In CI the database is an ephemeral service container.
3. **`synchronize` stays `false`** (as in `data-source.ts`). Tables come only from migrations, so every environment gets the same schema in the same way.
4. **Inside Docker Compose, `DB_HOST` is `db`** (the service name) and **`DB_PORT` must be 5432**, the container's own port. The host-side mapping (such as 5433) does not exist inside the network. This caused a real failure, described in `devops/docker-troubleshooting.md`.
5. **Staging mirrors production**: same image, same migrations, same configuration shape, smaller size.
6. **Production database access** should use TLS and an application user without schema-changing rights. Note: `data-source.ts` has no `ssl` option today, so this needs a small code change.

## Suggested files

- `.env.example`: documented defaults for development (exists).
- `.env.test`: values for the automated suite (`DB_DATABASE=ella_test`).
- Staging and production: no file in the repository, only injected secrets.

## Local note

On my machine a local PostgreSQL was already using port 5432. I published the container on 5433 and set `DB_PORT=5433` in `.env`. That value is specific to this machine and must not become the shared default.