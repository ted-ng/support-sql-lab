import type { LabScenario } from "./types.js";

export const scenarios: LabScenario[] = [
  {
    id: "duplicate-invoices",
    title: "Duplicate invoices after webhook retry",
    domain: "Billing · Webhooks · Idempotency",
    symptom: "One successful card payment produced three active invoices after the gateway retried its webhook.",
    hypothesis: "The payment webhook was processed more than once because invoice creation did not enforce a payment-level idempotency key.",
    safety: ["Read-only investigation completed", "Keep the earliest invoice", "Do not delete payments", "Void only known duplicate invoice IDs"],
    investigationSteps: ["Find invoices sharing a payment", "Inspect webhook attempts", "Compare invoice and payment totals", "Identify earliest invoice", "Preview and verify repair"],
    investigationSql: `SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.status AS invoice_status,
  i.total_cents,
  p.id AS payment_id,
  p.intent_id,
  p.amount_cents,
  w.id AS delivery_id,
  w.attempt,
  w.status AS delivery_status
FROM invoices i
JOIN payments p ON p.id = i.payment_id
JOIN webhook_deliveries w ON w.event_key = p.webhook_event_key
WHERE p.intent_id = 'pi_demo_duplicate'
ORDER BY i.created_at, w.attempt;`,
    repairSql: `BEGIN TRANSACTION;
UPDATE invoices
SET status = 'void',
    void_reason = 'Duplicate invoice - webhook retry'
WHERE id IN (10137, 10138)
  AND payment_id = 5021
  AND status = 'open';
COMMIT;`,
    verificationSql: `SELECT
  SUM(CASE WHEN status != 'void' THEN 1 ELSE 0 END) AS active_invoices,
  SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END) AS void_invoices,
  MIN(total_cents) AS invoice_total,
  (SELECT amount_cents FROM payments WHERE id = 5021) AS payment_total
FROM invoices
WHERE payment_id = 5021;`,
    expectedAffectedRows: 2
  },
  {
    id: "missing-appointments",
    title: "Missing appointments in mobile app",
    domain: "Appointments · Sync · Queues",
    symptom: "Three web appointments are absent from the mobile application after a sync worker interruption.",
    hypothesis: "Appointments remained in a failed sync state and were not requeued after integration recovery.",
    safety: ["Confirm appointments exist in the source table", "Do not change appointment times", "Requeue only failed rows for one clinic"],
    investigationSteps: ["Find failed sync rows", "Confirm source appointments", "Check integration health", "Preview scoped requeue", "Verify queued rows"],
    investigationSql: `SELECT a.id, a.starts_at, a.status, a.mobile_sync_status, i.enabled AS integration_enabled
FROM appointments a
JOIN integrations i ON i.clinic_id = a.clinic_id AND i.kind = 'mobile'
WHERE a.clinic_id = 2 AND a.mobile_sync_status = 'failed'
ORDER BY a.starts_at;`,
    repairSql: `BEGIN TRANSACTION;
UPDATE appointments
SET mobile_sync_status = 'queued'
WHERE clinic_id = 2
  AND mobile_sync_status = 'failed'
  AND id IN (3001, 3002, 3003);
COMMIT;`,
    verificationSql: `SELECT mobile_sync_status, COUNT(*) AS appointment_count
FROM appointments
WHERE id IN (3001, 3002, 3003)
GROUP BY mobile_sync_status;`,
    expectedAffectedRows: 3
  },
  {
    id: "orphaned-patients",
    title: "Orphaned patient records after import",
    domain: "Data quality · Imports",
    symptom: "Two imported patient rows reference source owners that never completed migration.",
    hypothesis: "The import accepted patient rows before owner identity mapping was available.",
    safety: ["Preserve imported payloads", "Do not invent owner mappings", "Quarantine only unmatched rows"],
    investigationSteps: ["Find missing owner mappings", "Inspect import batch", "Confirm no appointments reference rows", "Preview quarantine", "Verify active orphan count"],
    investigationSql: `SELECT p.id, p.name, p.source_owner_key, p.import_batch, p.quarantined
FROM patients p
LEFT JOIN owner_mappings m ON m.source_owner_key = p.source_owner_key
WHERE m.source_owner_key IS NULL AND p.quarantined = 0;`,
    repairSql: `BEGIN TRANSACTION;
UPDATE patients
SET quarantined = 1
WHERE id IN (4101, 4102)
  AND quarantined = 0;
COMMIT;`,
    verificationSql: `SELECT SUM(CASE WHEN quarantined = 0 THEN 1 ELSE 0 END) AS active_orphans,
SUM(CASE WHEN quarantined = 1 THEN 1 ELSE 0 END) AS quarantined_rows
FROM patients
WHERE id IN (4101, 4102);`,
    expectedAffectedRows: 2
  },
  {
    id: "wrong-client-payment",
    title: "Payment applied to wrong client",
    domain: "Billing · Data correction",
    symptom: "A payment references a different client than its linked invoice after a manual support correction.",
    hypothesis: "The payment client ID was edited without validating the invoice ownership.",
    safety: ["Confirm one invoice and one payment", "Do not alter amount or processor reference", "Update only the known payment ID"],
    investigationSteps: ["Join payment and invoice owners", "Confirm processor reference", "Check payment amount", "Preview client correction", "Verify ownership match"],
    investigationSql: `SELECT p.id AS payment_id, p.client_id AS payment_client_id,
i.id AS invoice_id, i.client_id AS invoice_client_id,
p.amount_cents, p.processor_reference
FROM payments p
JOIN invoices i ON i.payment_id = p.id
WHERE p.id = 6001 AND p.client_id != i.client_id;`,
    repairSql: `BEGIN TRANSACTION;
UPDATE payments
SET client_id = (SELECT client_id FROM invoices WHERE payment_id = 6001 LIMIT 1)
WHERE id = 6001
  AND processor_reference = 'proc_demo_6001';
COMMIT;`,
    verificationSql: `SELECT p.client_id AS payment_client_id, i.client_id AS invoice_client_id,
CASE WHEN p.client_id = i.client_id THEN 1 ELSE 0 END AS ownership_matches
FROM payments p JOIN invoices i ON i.payment_id = p.id WHERE p.id = 6001;`,
    expectedAffectedRows: 1
  },
  {
    id: "password-reset",
    title: "Customer cannot reset password",
    domain: "Customer access · Authentication",
    symptom: "A customer is locked out and the only active reset token has already expired.",
    hypothesis: "The account remained locked after repeated attempts and the reset workflow did not issue a fresh token.",
    safety: ["Never expose password hashes", "Invalidate expired tokens", "Unlock only the known synthetic user"],
    investigationSteps: ["Inspect account lock state", "Find reset-token expiry", "Confirm email destination", "Preview unlock and token refresh", "Verify one active token"],
    investigationSql: `SELECT u.id, u.email, u.locked, t.id AS token_id, t.expires_at, t.used_at
FROM users u
LEFT JOIN password_reset_tokens t ON t.user_id = u.id
WHERE u.id = 7001
ORDER BY t.created_at DESC;`,
    repairSql: `BEGIN TRANSACTION;
UPDATE users SET locked = 0 WHERE id = 7001 AND email = 'client@example.test';
UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = 7001 AND used_at IS NULL;
INSERT INTO password_reset_tokens (id, user_id, token_digest, created_at, expires_at, used_at)
VALUES (7102, 7001, 'synthetic_digest_not_a_secret', datetime('now'), datetime('now', '+30 minutes'), NULL);
COMMIT;`,
    verificationSql: `SELECT u.locked,
SUM(CASE WHEN t.used_at IS NULL AND t.expires_at > datetime('now') THEN 1 ELSE 0 END) AS active_tokens
FROM users u LEFT JOIN password_reset_tokens t ON t.user_id = u.id
WHERE u.id = 7001 GROUP BY u.locked;`,
    expectedAffectedRows: 3
  }
];

export const getScenario = (id: string) => scenarios.find((scenario) => scenario.id === id);
