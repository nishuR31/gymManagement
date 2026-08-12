# Backend Batch 1

## Scope

Completes Payments, membership renewal/grace coupling, Gym Vault/Inventory, Staff, staff attendance, leave requests, workout templates/assignments, and diet templates/assignments.

## Core Invariants

- Invoice paid amount is derived from `Payment` minus `Refund`; `Invoice` has no paid-total column.
- Payment writes lock/recompute inside a serializable transaction and reject overpayment.
- Refunds are separate audited events and cannot exceed the refundable amount for a payment.
- Member check-in now requires an active subscription or a subscription inside plan `gracePeriodDays`.
- Product stock is derived from `SUM(StockMovement.quantityDelta)`.
- Inventory sales lock the product row, derive stock, reject oversell, then create stock movement plus invoice/payment rows.
- Staff attendance mirrors member attendance with one open row enforced by a partial unique index.

## Payment Flow

```mermaid
sequenceDiagram
  actor Staff
  participant API
  participant Service
  participant DB

  Staff->>API: POST /invoices/:id/payments
  API->>Service: amountCents, method
  Service->>DB: SERIALIZABLE tx + lock invoice
  Service->>DB: SUM(payments) - SUM(refunds)
  alt amount exceeds remaining
    Service-->>API: REMAINING_BALANCE_EXCEEDED
  else accepted
    Service->>DB: insert Payment
    Service->>DB: recompute status
    Service->>DB: update Invoice.status
    Service->>DB: invalidate analytics cache
    Service-->>API: invoice with derived totals
  end
```

## Refund Flow

```mermaid
sequenceDiagram
  actor Admin
  participant API
  participant Service
  participant DB

  Admin->>API: POST /payments/:id/refund
  Service->>DB: SERIALIZABLE tx + lock invoice
  Service->>DB: compute payment refundable amount
  alt refund too large
    Service-->>API: REFUND_AMOUNT_EXCEEDED
  else accepted
    Service->>DB: insert Refund
    Service->>DB: recompute invoice status
    Service->>DB: invalidate analytics cache
    Service-->>API: invoice with refund history
  end
```

## Inventory Sale Flow

```mermaid
sequenceDiagram
  actor Staff
  participant API
  participant InventoryService
  participant DB

  Staff->>API: POST /inventory/sale
  API->>InventoryService: memberId, productId, quantity, method
  InventoryService->>DB: SERIALIZABLE tx + lock product
  InventoryService->>DB: SUM stock movements
  alt quantity exceeds stock
    InventoryService-->>API: INSUFFICIENT_STOCK
  else accepted
    InventoryService->>DB: create paid Invoice
    InventoryService->>DB: create Payment
    InventoryService->>DB: create SALE StockMovement
    InventoryService->>DB: invalidate inventory + payment caches
    InventoryService-->>API: movement + invoiceId
  end
```

## ER Delta

```mermaid
erDiagram
  Member ||--o{ Invoice : has
  MembershipSubscription ||--o{ Invoice : may_create
  Invoice ||--o{ Payment : has
  Payment ||--o{ Refund : has
  Product ||--o{ StockMovement : derives_stock
  User ||--o{ StockMovement : records
  User ||--o| StaffProfile : has
  StaffProfile ||--o{ StaffAttendance : has
  StaffProfile ||--o{ LeaveRequest : requests
  User ||--o{ LeaveRequest : reviews
  Member ||--o{ MemberWorkoutPlan : receives
  WorkoutPlanTemplate ||--o{ MemberWorkoutPlan : instantiates
  StaffProfile ||--o{ MemberWorkoutPlan : assigns
  Member ||--o{ MemberDietPlan : receives
  DietPlanTemplate ||--o{ MemberDietPlan : instantiates
  StaffProfile ||--o{ MemberDietPlan : assigns
```
