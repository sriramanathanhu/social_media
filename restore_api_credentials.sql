-- Restore API credentials from backup
DELETE FROM api_credentials;

INSERT INTO api_credentials (id, platform, client_id, client_secret, created_by, status, created_at, updated_at) VALUES
(4, 'x', 'MWNMaWZTZjN2WjlCanhzamZfUWw6MTpjaQ', 'un_2oE_ROT0MblmMa-TrJSvMv4B2I6DIeWfaIJ8P1s-3phtNPg', 2, 'active', '2025-07-05 18:11:10.308001', '2025-07-05 18:11:10.308001');

-- Reset sequence
SELECT setval('api_credentials_id_seq', 5, false);