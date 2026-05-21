-- Investigation
SELECT p.id AS payment_id, p.client_id AS payment_client_id,
       i.id AS invoice_id, i.client_id AS invoice_client_id,
       p.amount_cents, p.processor_reference
FROM payments p
JOIN invoices i ON i.payment_id = p.id
WHERE p.id = 6001 AND p.client_id != i.client_id;

-- Guarded repair
BEGIN TRANSACTION;
UPDATE payments
SET client_id = (
  SELECT client_id FROM invoices WHERE payment_id = 6001 LIMIT 1
)
WHERE id = 6001
  AND processor_reference = 'proc_demo_6001';
COMMIT;

-- Verification
SELECT p.client_id AS payment_client_id,
       i.client_id AS invoice_client_id,
       CASE WHEN p.client_id = i.client_id THEN 1 ELSE 0 END AS ownership_matches
FROM payments p
JOIN invoices i ON i.payment_id = p.id
WHERE p.id = 6001;
