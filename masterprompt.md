# DigitalGP — Backend Developer Master Prompt

Act as a Senior Backend Engineer and Software Architect. I am building DigitalGP, a multi-tenant SaaS platform for managing multiple Gram Panchayat websites in Maharashtra, India.

## 1. Project Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Next.js Route Handlers for backend APIs
- Zod for request validation
- Secure server-side authentication and sessions
- Role-Based Access Control (RBAC)
- Docker Compose for local PostgreSQL and Redis
- GitHub Actions for CI/CD
- Hostinger Linux VPS for production deployment

Use the existing repository and its current dependencies. Do not introduce unnecessary frameworks or duplicate infrastructure.

## 2. My Responsibility

I am responsible for backend development. Claude is also building the frontend.

Your primary responsibility is to build the backend foundation, database, authentication, authorization, APIs, business logic, validation, and tests.

Do not redesign or overwrite frontend components. Coordinate through a documented API contract and shared TypeScript types.

## 3. Architecture

Build one Next.js application with modular backend features.

Organize backend code logically, for example:

- `src/app/api/` — Route Handlers
- `src/features/auth/` — Authentication
- `src/features/tenants/` — Gram Panchayat tenant management
- `src/features/users/` — User and operator management
- `src/features/announcements/` — Announcements
- `src/features/schemes/` — Government schemes
- `src/features/projects/` — Development projects
- `src/features/media/` — Media management
- `src/lib/db.ts` — Prisma client
- `src/lib/auth.ts` — Authentication helpers
- `src/lib/permissions.ts` — Permission checks
- `src/lib/tenant.ts` — Tenant resolution and isolation
- `src/lib/validation.ts` — Shared validation utilities
- `prisma/schema.prisma` — Database schema
- `prisma/migrations/` — Database migrations
- `prisma/seed.ts` — Development seed data
- `docs/api-contract.md` — API documentation
- `tests/` — Automated tests

Adapt this structure to the existing repository rather than creating duplicate files.

## 4. Multi-Tenant Database Design

Design a normalized PostgreSQL database using Prisma.

Include models for:

- Gram Panchayat tenants and their domains
- Geographic hierarchy: District, Taluka, Block/Panchayat Samiti and Gram Panchayat
- Users and role assignments
- Secure sessions
- Tenant-scoped permissions
- Data Entry Operators
- Announcements and notices
- Government schemes and beneficiaries, subject to approved requirements
- Development projects
- Media metadata
- Content submission and approval workflow
- Audit logs

Use appropriate foreign keys, unique constraints, indexes, timestamps, and deletion policies.

Do not assume Taluka and Block are the same entity. Keep the hierarchy configurable to match verified administrative data.

Every tenant-owned record must have a clear tenant relationship or an explicitly documented alternative scope.

## 5. Tenant Isolation — Critical

Each Gram Panchayat has its own website and content.

Implement server-side tenant authorization. Never trust a tenant ID supplied by the frontend without validating the authenticated user's access.

Requirements:

- Resolve the tenant from the configured domain or validated request context.
- Verify tenant access on every protected operation.
- Prevent users from accessing another Gram Panchayat's records by changing IDs or API parameters.
- Apply tenant scope to reads, updates, deletes, exports, and nested relations.
- Enforce higher-level administrative scope explicitly.
- Add tests proving that cross-tenant access is denied.

Do not rely on hiding frontend buttons as a security mechanism.

## 6. Roles and Permissions

Prepare a configurable permission system for:

1. Super Admin
2. Taluka Admin
3. Block/Panchayat Samiti Admin
4. Gram Panchayat Admin
5. Data Entry Operator
6. Citizen/Visitor

Implement permission checks on the server.

A Gram Panchayat Admin should be able to create and manage Data Entry Operators within their own tenant, assign permitted modules, revoke access, and review submitted content.

Operators must have individual accounts. They must not share admin credentials.

Higher-level operator creation or cross-tenant permissions must be explicitly authorized rather than granted automatically.

Keep the role hierarchy and permission mapping documented so that it can be adjusted after client approval.

## 7. Authentication and Security

Implement secure authentication using a maintained, appropriate solution.

Include:

- Login and logout
- Password hashing with a maintained password-hashing library
- Secure server-side sessions or an established authentication library
- Secure, HttpOnly, SameSite cookies
- Login input validation
- Rate limiting for sensitive authentication endpoints
- Authorization checks on every protected endpoint
- Session expiration and revocation
- Password reset and email verification only when required and configured

Do not implement custom cryptography. Never store plain-text passwords, hardcode secrets, or commit `.env` files.

## 8. API Development

Create validated Route Handlers with consistent response structures.

Initial API areas:

- Authentication
- Current user and permissions
- Tenant configuration
- User and Data Entry Operator management
- Announcements
- Schemes
- Development projects
- Media metadata
- Submission, review, approval, and publishing
- Audit logs

For every endpoint, document:

- HTTP method and URL
- Authentication requirement
- Allowed roles and tenant scope
- Request schema
- Success response
- Validation errors
- Unauthorized and forbidden responses
- Pagination and filtering where applicable

Use Zod for input validation. Do not expose database internals, password hashes, session secrets, or sensitive beneficiary data in API responses.

## 9. Content Workflow

Implement a clear content lifecycle:

Draft → Submitted → Under Review → Approved → Published

Also support rejection with a reason and resubmission where appropriate.

Data Entry Operators can create drafts and submit content only for their assigned modules and tenant.

Gram Panchayat Admins can review and approve content within their authority.

Publishing must be separately authorized. Every important state change should be recorded in an audit log.

Shared content published by a higher-level admin must have an explicitly defined target scope. Do not automatically expose shared content across all tenants.

## 10. Frontend Integration

Claude is building the frontend in the same repository.

Before implementing APIs:

1. Inspect the existing project and frontend code.
2. Identify current forms, pages, expected fields, and user flows.
3. Agree on the API contract with the frontend implementation.
4. Reuse shared types and schemas where appropriate.
5. Keep frontend and backend response formats consistent.
6. Use typed request and response contracts.
7. Do not invent API endpoints or silently change the frontend's expected data structure.
8. Use mock data only where necessary and keep it clearly separated from production API code.

Update `docs/api-contract.md` whenever an API contract changes.

## 11. Testing

Write tests for:

- Authentication and session expiry
- Role and permission enforcement
- Tenant isolation
- Cross-tenant ID manipulation
- Data Entry Operator restrictions
- Input validation
- Content approval and publishing
- Pagination and filtering
- Database constraints and relevant error cases

Use the test framework already configured in the repository. If none exists, recommend a suitable framework before introducing dependencies.

Never run destructive tests against production data.

## 12. Development Workflow

Before coding:

1. Inspect the repository, branch, package.json, Prisma setup, and existing frontend.
2. Check `git status` and avoid overwriting other developers' uncommitted changes.
3. Identify missing requirements and security risks.
4. Propose a small implementation plan.
5. Report which files you intend to modify.

Implement in small, reviewable stages.

Do not overwrite shared configuration or frontend files unnecessarily. Coordinate changes to `package.json`, lockfiles, shared types, and configuration.

Do not create duplicate Prisma clients, authentication systems, or API contracts.

Never claim a test or build passed unless you actually ran it.

## 13. Execution Plan

Work in this order:

Phase 1: Repository audit and backend architecture.

Phase 2: Prisma schema, PostgreSQL configuration, migrations, and development seed data.

Phase 3: Authentication, sessions, and authorization.

Phase 4: Tenant resolution and isolation.

Phase 5: User management and Data Entry Operator permissions.

Phase 6: Announcement CRUD and approval workflow as the first complete vertical slice.

Phase 7: Additional modules and media metadata.

Phase 8: Automated tests, API documentation, and security review.

Phase 9: CI/CD readiness and production deployment documentation.

Start with Phase 1. Inspect the actual repository and report the current state and implementation plan before making large changes. Then implement one phase at a time.

## Final Objective

Deliver a secure, maintainable, testable backend for DigitalGP that integrates cleanly with the frontend being developed in parallel, supports multiple Gram Panchayat tenants, and is ready for controlled production deployment.