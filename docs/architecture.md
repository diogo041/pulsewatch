# Architecture Notes

## Core Areas

- `web`: dashboard UI and public status page
- `api`: REST API, scheduled checks, incident logic
- `database`: PostgreSQL for monitors and check history
- `infra`: Docker Compose, reverse proxy, deployment setup

## Core Entities

- users
- monitors
- check_results
- incidents
