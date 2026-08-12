# Phase 1b - Attendance Check-In / Check-Out

## Scope

This sub-phase adds front-desk attendance operations on top of Phase 1a members. Self-service kiosk mode is deferred, so every check-in/out endpoint requires an authenticated STAFF+ actor.

## Schema Diff

- Added `CheckInMethod`: `QR`, `MEMBER_ID`, `USERNAME_SEARCH`.
- Added `Attendance` with `memberId`, `checkInAt`, nullable `checkOutAt`, `checkInMethod`, nullable `checkedInBy`, nullable stored `durationMinutes`, and `autoClosed`.
- Added a Postgres partial unique index:

```sql
CREATE UNIQUE INDEX attendance_one_open_session_per_member
ON "Attendance" ("memberId")
WHERE "checkOutAt" IS NULL;
```

## Check-In Sequence

```mermaid
sequenceDiagram
  actor Staff
  participant API
  participant MemberService
  participant AttendanceService
  participant DB

  Staff->>API: POST /attendance/check-in
  API->>API: Authenticate STAFF+
  API->>AttendanceService: Resolve member by memberId, QR, or query
  alt QR payload mismatch
    AttendanceService->>DB: Find member by current qrSecret
    DB-->>AttendanceService: No match
    AttendanceService-->>API: MEMBER_NOT_FOUND
    API-->>Staff: 404
  else Suspended member
    AttendanceService->>MemberService: Ensure member can check in
    MemberService-->>AttendanceService: MEMBER_SUSPENDED
    API-->>Staff: 409 MEMBER_SUSPENDED
  else Normal check-in
    AttendanceService->>DB: Insert Attendance with checkOutAt null
    DB-->>AttendanceService: Created
    AttendanceService-->>API: Attendance row
    API-->>Staff: 201
  else Duplicate open session
    AttendanceService->>DB: Insert Attendance with checkOutAt null
    DB-->>AttendanceService: Unique violation
    AttendanceService-->>API: ALREADY_CHECKED_IN
    API-->>Staff: 409
  end
```

## Check-Out Sequence

```mermaid
sequenceDiagram
  actor Staff
  participant API
  participant AttendanceService
  participant DB

  Staff->>API: POST /attendance/check-out
  API->>API: Authenticate STAFF+
  API->>AttendanceService: Resolve open attendance by memberId or attendanceId
  AttendanceService->>DB: Set checkOutAt, durationMinutes
  DB-->>AttendanceService: Closed Attendance
  AttendanceService-->>API: Attendance row
  API-->>Staff: 200
```

## Auto-Checkout Job

The API process schedules `autoCloseStaleAttendances()` every 15 minutes. It closes open sessions older than 12 hours at exactly `checkInAt + 12h`, stores the computed duration, and sets `autoClosed = true`.

## Reporting Date Rule

`getAttendanceForDate(date)` filters by `checkInAt` within that day's UTC range. Overnight sessions are attributed to their check-in date and are not split in this phase.
