# Investigation report: Duplicate invoices after webhook retry

Domain: Billing · Webhooks · Idempotency

Hypothesis: The payment webhook was processed more than once because invoice creation did not enforce a payment-level idempotency key.

## Evidence

- Three invoices reference payment `5021`.
- Three webhook deliveries reference the same synthetic event key.
- All invoices equal the single payment amount.
- The earliest invoice remains paid.

## Repair

- Two known open duplicates were changed to `void`.
- The payment row and processor reference were not modified.
- A transaction enforced an exact two-row change.

## Verification

- Active invoices: 1
- Voided duplicates: 2
- Invoice total equals payment total: yes

Synthetic demonstration data only.
