# Progress Log

## Day 1

- Created the initial project structure.
- Defined the project scope and stack.
- Prepared the repository for the first GitHub push.

## Day 2

- Scaffolded the Next.js frontend in `web/`.
- Scaffolded the Express + TypeScript backend in `api/`.
- Added a basic `/health` endpoint.
- Ran both applications locally.

## Day 3

- Added local PostgreSQL with Docker Compose.
- Added Prisma ORM to the API.
- Created the initial database schema and first migration.
- Connected the Express API to PostgreSQL.
- Updated `/health` to confirm database connectivity.

## Day 4

- Added the first monitor API routes.
- Created `POST /monitors` to save monitors in PostgreSQL.
- Created `GET /monitors` to list saved monitors.
- Validated monitor input for name, URL, and interval.
- Verified the health route reflects the monitor count.

## Day 5

- Replaced the default Next.js starter page with the PulseWatch dashboard.
- Connected the frontend to the monitor API.
- Displayed saved monitors from PostgreSQL in the browser.
- Added the first frontend form to create monitors.
- Resolved a local port conflict by moving the API to port 4001.
- Verified monitor creation works end-to-end from UI to database.

## Day 6

- Added monitor pause and resume support to the API.
- Added monitor delete support to the API.
- Added pause/resume and delete actions to the dashboard.
- Updated dashboard stats to reflect active monitors.
- Verified monitor state changes and deletion work end-to-end.
