# Phase 1c - Attendance History + Analytics

## Scope

This sub-phase adds read and aggregate endpoints on top of the existing Attendance table. No Attendance schema changes were needed.

## Endpoints

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/members/:id/attendance?page=&pageSize=` | STAFF+ for any member; linked MEMBER for self only |
| `GET` | `/attendance/daily?date=YYYY-MM-DD` | STAFF+ |
| `GET` | `/attendance/monthly?month=YYYY-MM` | STAFF+ |

## Date Rules

- Daily attendance is attributed by `checkInAt`, including overnight sessions.
- Monthly aggregates are returned as dense chart data: every day in the month appears, including zero-count days.
- Invalid dates and months are rejected with `400 VALIDATION_ERROR`.

## Caching

Redis cache-aside keys:

- `attendance:daily:{date}`
- `attendance:monthly:{month}`

TTL is 5 minutes. Explicit invalidation happens after every successful check-in, checkout, and auto-checkout using the attendance row's check-in date:

- delete `attendance:daily:{checkInDate}`
- delete `attendance:monthly:{checkInMonth}`

Redis failures during invalidation do not block attendance writes; correctness falls back to TTL if Redis is temporarily unavailable.
