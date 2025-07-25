-- Restore stream app keys from backup
DELETE FROM stream_app_keys;

INSERT INTO stream_app_keys (id, app_id, key_name, stream_key, description, is_active, usage_count, last_used_at, created_at, updated_at) VALUES
('ed3efe4f-f61f-480c-8bb4-843466e51605', 'ae00aa90-d946-4ed2-ad3b-925e3f1c0c97', 'YouTube', '5b4w-rb4a-mrae-ddpq-ewus', 'Stream key for YouTube', true, 6, '2025-07-13 17:31:34.691726+00', '2025-07-13 16:30:28.079562+00', '2025-07-13 17:31:34.691726+00'),
('834fde4f-12db-45d3-ace2-c428d31194c8', 'd4832d1c-582c-42cd-b7d6-5ddcc00efffd', 'primary', 'live', 'Primary stream key', true, 0, NULL, '2025-07-13 17:42:20.057337+00', '2025-07-13 17:42:20.057337+00'),
('8c6bdf90-2023-48a4-a16a-172a71c56e5d', 'd4832d1c-582c-42cd-b7d6-5ddcc00efffd', 'YouTube', '5b4w-rb4a-mrae-ddpq-ewus', 'Stream key for YouTube', true, 1, '2025-07-13 17:43:34.614186+00', '2025-07-13 17:43:12.817868+00', '2025-07-13 17:43:34.614186+00');