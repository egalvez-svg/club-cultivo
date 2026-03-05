# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Club Cultivo is a **multi-tenant NestJS backend** for managing cannabis cultivation NGOs (clubs) in Uruguay. It handles patient management, cannabis strain/product tracking, production lot traceability, dispensations, payments, cash register sessions, REPROCAN records, appointments, reports, and audit logging. The app is in Spanish (error messages, comments, Swagger descriptions).

## Common Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Dev server (watch mode) | `npm run start:dev` |
| Build | `npm run build` |
| Lint (with auto-fix) | `npm run lint` |
| Format | `npm run format` |
| Run all unit tests | `npm test` |
| Run a single test file | `npx jest --config package.json <path>` (e.g. `npx jest src/auth/auth.service.spec.ts`) |
| Run e2e tests | `npm run test:e2e` |
| Test coverage | `npm run test:cov` |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `npx prisma migrate deploy` |
| Create migration | `npx prisma migrate dev --name <name>` |
| Seed database | `npx prisma db seed` |

## Architecture

### Tech Stack
- **NestJS 11** with TypeScript, SWC compiler
- **Prisma ORM** with PostgreSQL (`DATABASE_URL` env var)
- **Passport + JWT** for authentication (access token in Bearer header)
- **class-validator / class-transformer** for DTO validation (global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`)
- **Swagger** at `/api` endpoint
- **PDFKit** for report generation

### Multi-Tenancy Model
Every data entity is scoped to an `organizationId`. The JWT payload includes `{ sub, email, role, organizationId }`. Services receive `organizationId` from the authenticated user and filter all queries by it. There is a special `SYSTEM` organization for the SuperAdmin user.

### Auth & Authorization
- `JwtAuthGuard` (Passport) protects endpoints
- `RolesGuard` + `@Roles()` decorator for role-based access (`src/roles/guards/roles.guard.ts`, `src/roles/decorators/roles.decorator.ts`)
- `SUPER_ADMIN` role bypasses all role checks and can manage organizations
- Org-level roles: `ADMIN`, `OPERATOR`, `PATIENT` (stored in `user_roles` join table)

### Module Structure
Standard NestJS feature modules in `src/<feature>/` each with `module`, `controller`, `service`, and `dto/` subdirectory. Key modules:

- **auth** - Login, register, password reset, JWT refresh tokens
- **users** - User CRUD (shared between staff and patients)
- **patients** - Patient-specific operations (daily dose tracking, status)
- **organizations** - Org CRUD (SuperAdmin only)
- **roles** - Role assignment management
- **strains** - Cannabis strain catalog (indica/sativa/hybrid, THC/CBD %)
- **products** - Product definitions (flower/oil/extract with equivalent dry grams)
- **lots** - Production lots with hierarchy (cultivation → packaging), costs, release workflow
- **stock** - Stock movement ledger per lot
- **dispensations** - Core business transaction: creates dispensation + items + payment + stock movements + cash register entry in a single Prisma transaction
- **payments** - Payment records (cash, transfer, card)
- **cash-register** - Cash register sessions (open/close) and movements
- **reprocan** - REPROCAN registry records (Uruguayan cannabis patient registry)
- **reports** - Report generation (traceability, cultivation book, financial audit) with PDF
- **audit** - Audit event logging for entity changes
- **dashboard** - KPI aggregation endpoints
- **appointments** - Patient appointment scheduling

### Database
- Schema in `prisma/schema.prisma` — all models use `@@map("snake_case_table")` convention
- UUIDs for all primary keys
- Seed script (`prisma/seed.ts`) creates SYSTEM org, SUPER_ADMIN role, and default superadmin user
- Migrations in `prisma/migrations/`

### Key Patterns
- **PrismaService** (`src/prisma/prisma.service.ts`) extends `PrismaClient` and is injected everywhere via `PrismaModule` (global-style, exported)
- **Transactional operations**: Complex writes (e.g., dispensations) use `prisma.$transaction()` and pass the transaction client to other services
- **DTOs** use `class-validator` decorators; separate Create/Update DTOs per feature
- **AuditService** is injected into modules that need change tracking
