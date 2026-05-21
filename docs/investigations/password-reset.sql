-- Investigation: never select password_hash or raw token material.
SELECT u.id, u.email, u.locked, t.id AS token_id, t.expires_at, t.used_at
FROM users u
LEFT JOIN password_reset_tokens t ON t.user_id = u.id
WHERE u.id = 7001
ORDER BY t.created_at DESC;

-- Guarded repair
BEGIN TRANSACTION;
UPDATE users
SET locked = 0
WHERE id = 7001
  AND email = 'client@example.test';

UPDATE password_reset_tokens
SET used_at = datetime('now')
WHERE user_id = 7001
  AND used_at IS NULL;

INSERT INTO password_reset_tokens
  (id, user_id, token_digest, created_at, expires_at, used_at)
VALUES
  (7102, 7001, 'synthetic_digest_not_a_secret',
   datetime('now'), datetime('now', '+30 minutes'), NULL);
COMMIT;

-- Verification
SELECT u.locked,
       SUM(CASE WHEN t.used_at IS NULL
                    AND t.expires_at > datetime('now')
                THEN 1 ELSE 0 END) AS active_tokens
FROM users u
LEFT JOIN password_reset_tokens t ON t.user_id = u.id
WHERE u.id = 7001
GROUP BY u.locked;
