# Phase 2b - Payments

## Scope

This sub-phase adds invoices, payments, refunds, receipts, member payment history, and cached payment analytics. Renewals, expiry jobs, grace-period enforcement, and reminders remain for 2c.

## Schema Diff

- Added `InvoiceStatus`: `PENDING`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`, `CANCELLED`.
- Added `PaymentMethod`: `CASH`, `UPI`, `CARD`, `ONLINE`.
- Added `Invoice` with `amountDueCents` and no mutable paid-total column.
- Added `Payment` as immutable payment events.
- Added `Refund` as separate auditable refund events.

## Money Invariant

Effective paid amount is always derived as:

```text
sum(Payment.amountCents) - sum(Refund.amountCents)
```

Overpayment is rejected. All money values are integer cents.

## Partial Payment Sequence

```mermaid
sequenceDiagram
  actor Staff
  participant API
  participant PaymentService
  participant DB

  Staff->>API: POST /invoices/:id/payments
  API->>PaymentService: amountCents + method
  PaymentService->>DB: Transaction: read invoice + payment/refund sums
  alt amount exceeds remaining balance
    PaymentService-->>API: REMAINING_BALANCE_EXCEEDED
    API-->>Staff: 409
  else accepted
    PaymentService->>DB: Insert Payment
    PaymentService->>DB: Recompute effective paid
    PaymentService->>DB: Update Invoice.status
    PaymentService-->>API: Invoice with derived amountPaidCents
    API-->>Staff: 201
  end
```

## Refund Sequence

```mermaid
sequenceDiagram
  actor Admin
  participant API
  participant PaymentService
  participant DB

  Admin->>API: POST /payments/:id/refund
  API->>PaymentService: amountCents + reason
  PaymentService->>DB: Transaction: read payment + existing refunds
  alt refund exceeds remaining refundable amount
    PaymentService-->>API: REFUND_AMOUNT_EXCEEDED
    API-->>Admin: 409
  else accepted
    PaymentService->>DB: Insert Refund
    PaymentService->>DB: Recompute invoice effective paid
    PaymentService->>DB: Update Invoice.status
    PaymentService-->>API: Invoice with refund history
    API-->>Admin: 201
  end
```

## Cache

Payment analytics uses cache-aside with 5-minute TTL and explicit invalidation on payment/refund writes.

Key shape:

- `payments:analytics:{range}`
