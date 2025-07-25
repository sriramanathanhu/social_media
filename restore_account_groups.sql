-- Restore account groups from backup
DELETE FROM account_groups;

INSERT INTO account_groups (id, user_id, name, description, color, created_at, updated_at) VALUES
(1, 2, 'Mastadon', '', '#1976D2', '2025-07-05 23:54:47.859275', '2025-07-05 23:54:47.859275');

-- Reset sequence
SELECT setval('account_groups_id_seq', 2, false);