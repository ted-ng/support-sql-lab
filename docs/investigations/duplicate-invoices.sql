-- Investigation
SELECT i.id, i.invoice_number, i.status, i.total_cents,
       p.id AS payment_id, p.intent_id, p.amount_cents,
       w.id AS delivery_id, w.attempt, w.status AS delivery_status
FROM invoices i
JOIN payments p ON p.id = i.payment_id
JOIN webhook_deliveries w ON w.event_key = p.webhook_event_key
WHERE p.intent_id = 'pi_demo_duplicate'
ORDER BY i.created_at, w.attempt;

-- Guarded repair
BEGIN TRANSACTION;
UPDATE invoices
SET status = 'void',
    void_reason = 'Duplicate invoice - webhook retry'
WHERE id IN (10137, 10138)
  AND payment_id = 5021
  AND status = 'open';
COMMIT;

-- Verification
SELECT SUM(CASE WHEN status != 'void' THEN 1 ELSE 0 END) AS active_invoices,
       SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END) AS void_invoices,
       MIN(total_cents) AS invoice_total,
       (SELECT amount_cents FROM payments WHERE id = 5021) AS payment_total
FROM invoices
WHERE payment_id = 5021;
