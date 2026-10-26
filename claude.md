# DigitalGP — Project Instructions

## Project purpose
Build a multi-tenant SaaS platform for Gram Panchayat public websites and administration dashboards.

## Technology
- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Next.js Route Handlers
- Vitest and Playwright
- GitHub-based collaboration

## Architecture rules
- Start with one Next.js application and one repository.
- Keep feature code modular and maintainable.
- Separate UI, business logic, database access and authorization.
- Validate all external input on the server.
- Enforce tenant scope and permissions on every protected server-side operation.
- Never trust tenant IDs supplied by the browser without verifying the authenticated user's access.
- Do not expose secrets or private records in public responses.
- Keep public published content separate from draft and private admin content.

## Team ownership
- Frontend developer owns UI components, page layouts, responsive design and frontend integration.
- Backend developer owns Prisma schema, migrations, authentication, authorization, backend services and API implementation.
- Both developers coordinate changes to shared types, API contracts, dependencies and configuration.
- Do not overwrite another developer's in-progress work.

## Development workflow
1. Read requirements and relevant existing files before coding.
2. Clarify assumptions before implementing ambiguous security or business rules.
3. Work on a task-specific feature branch.
4. Make small, reviewable changes.
5. Add tests for new business logic and access-control rules.
6. Run lint, tests and production build where available.
7. Document API or schema changes.
8. Use pull requests and review before merging into main.

## Security
- Never commit .env files, credentials or production secrets.
- Do not implement custom cryptography.
- Use least-privilege access.
- Prevent cross-tenant data leakage.
- Protect admin routes and APIs with server-side authorization.
- Do not run destructive migrations without explicit approval.

## Claude Code expectations
- Inspect before editing.
- State the planned files and approach for large tasks.
- Do not replace working code unnecessarily.
- Do not invent test results or claim a command succeeded unless it was run.
- Summarize changed files, tests run, known issues and next steps after each task.