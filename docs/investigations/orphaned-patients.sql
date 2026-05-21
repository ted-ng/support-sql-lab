-- Investigation
SELECT p.id, p.name, p.source_owner_key, p.import_batch, p.quarantined
FROM patients p
LEFT JOIN owner_mappings m ON m.source_owner_key = p.source_owner_key
WHERE m.source_owner_key IS NULL AND p.quarantined = 0;

-- Guarded repair
BEGIN TRANSACTION;
UPDATE patients
SET quarantined = 1
WHERE id IN (4101, 4102)
  AND quarantined = 0;
COMMIT;

-- Verification
SELECT SUM(CASE WHEN quarantined = 0 THEN 1 ELSE 0 END) AS active_orphans,
       SUM(CASE WHEN quarantined = 1 THEN 1 ELSE 0 END) AS quarantined_rows
FROM patients
WHERE id IN (4101, 4102);
