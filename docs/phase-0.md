# Phase 0 - Foundations

## Architecture Choice

This project uses a monorepo:

- `apps/api`: Fastify API, Prisma schema, auth services, tests.
- `apps/web`: React/Vite frontend shell.
- `packages/shared`: shared DTOs and role contracts.

A monorepo is the right fit for a single-gym product built incrementally because API contracts, role names, auth payloads, Docker config, and frontend routes can change atomically in one codebase.

## Folder Structure

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   ├── src
│   │   │   ├── config
│   │   │   ├── controllers
│   │   │   ├── middlewares
│   │   │   ├── plugins
│   │   │   ├── repositories
│   │   │   ├── routes
│   │   │   ├── services
│   │   │   ├── types
│   │   │   └── utils
│   │   └── test
│   └── web
│       └── src
│           ├── app
│           ├── components
│           ├── features
│           ├── pages
│           ├── services
│           ├── store
│           ├── styles
│           └── types
├── packages
│   └── shared
└── docs
```

## ER Diagram

```mermaid
erDiagram
  Role ||--o{ User : grants
  User ||--o{ RefreshToken : owns
  User ||--o{ Session : starts
  User ||--o{ AuditLog : produces
  Session ||--o{ RefreshToken : contains

  Role {
    string id PK
    RoleName name UK
    datetime createdAt
    datetime updatedAt
  }

  User {
    string id PK
    string email UK
    string passwordHash
    string firstName
    string lastName
    boolean isActive
    string roleId FK
    datetime createdAt
    datetime updatedAt
  }

  RefreshToken {
    string id PK
    string tokenHash UK
    string userId FK
    string sessionId FK
    datetime expiresAt
    datetime revokedAt
    datetime rotatedAt
    string replacedByTokenId
    datetime createdAt
  }

  Session {
    string id PK
    string userId FK
    string ipAddress
    string userAgent
    datetime expiresAt
    datetime revokedAt
    datetime createdAt
    datetime updatedAt
  }

  AuditLog {
    string id PK
    string userId FK
    string action
    string entity
    string entityId
    json metadata
    string ipAddress
    string userAgent
    datetime createdAt
  }
```

## Auth Sequence

```mermaid
sequenceDiagram
  actor User
  participant Web
  participant API
  participant DB

  User->>Web: Submit email/password
  Web->>API: POST /auth/login
  API->>DB: Find active user by email + role
  API->>API: Verify bcrypt password
  API->>DB: Create Session
  API->>DB: Store hashed RefreshToken
  API-->>Web: Access token + httpOnly refresh cookie + user
  Web->>API: Authenticated request with Bearer token
  API->>API: Verify JWT + RBAC
  API-->>Web: Protected resource
  Web->>API: POST /auth/refresh
  API->>DB: Validate unexpired refresh token
  API->>DB: Revoke old token and store rotated token
  API-->>Web: New access token + rotated refresh cookie
  Web->>API: POST /auth/refresh with old rotated token
  API->>DB: Detect rotated token reuse
  API->>DB: Revoke session and remaining session refresh tokens
  API-->>Web: 401 Unauthorized
  Web->>API: POST /auth/logout
  API->>DB: Revoke refresh token and session
  API-->>Web: Clear refresh cookie
```
