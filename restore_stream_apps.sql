-- Restore stream apps from backup
DELETE FROM stream_apps;

INSERT INTO stream_apps (id, user_id, app_name, description, rtmp_app_path, default_stream_key, status, settings, created_at, updated_at) VALUES
('ae00aa90-d946-4ed2-ad3b-925e3f1c0c97', 2, 'Social Media Public Stream', '', 'live', 'darshan', 'active', '{}', '2025-07-13 15:20:10.081986+00', '2025-07-13 16:51:59.547488+00'),
('d4832d1c-582c-42cd-b7d6-5ddcc00efffd', 2, 'socialmedia', '', 'socialmedia', 'live', 'active', '{}', '2025-07-13 17:42:20.054991+00', '2025-07-13 17:42:20.054991+00');