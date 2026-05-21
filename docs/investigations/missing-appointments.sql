-- Investigation
SELECT a.id, a.starts_at, a.status, a.mobile_sync_status,
       i.enabled AS integration_enabled
FROM appointments a
JOIN integrations i ON i.clinic_id = a.clinic_id AND i.kind = 'mobile'
WHERE a.clinic_id = 2 AND a.mobile_sync_status = 'failed'
ORDER BY a.starts_at;

-- Guarded repair
BEGIN TRANSACTION;
UPDATE appointments
SET mobile_sync_status = 'queued'
WHERE clinic_id = 2
  AND mobile_sync_status = 'failed'
  AND id IN (3001, 3002, 3003);
COMMIT;

-- Verification
SELECT mobile_sync_status, COUNT(*) AS appointment_count
FROM appointments
WHERE id IN (3001, 3002, 3003)
GROUP BY mobile_sync_status;
