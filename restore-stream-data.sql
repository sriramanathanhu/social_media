-- Insert stream apps data from backup
INSERT INTO stream_apps (id, user_id, app_name, rtmp_app_path, status) VALUES 
('ae00aa90-d946-4ed2-ad3b-925e3f1c0c97', 2, 'Social Media Public Stream', 'live', 'active'),
('d4832d1c-582c-42cd-b7d6-5ddcc00efffd', 2, 'socialmedia', 'socialmedia', 'active');

-- Insert live streams data from backup
INSERT INTO live_streams (id, user_id, title, stream_key, rtmp_url, status) VALUES 
('c1a8b9c8-7946-4c98-88c5-4a2d4759d4b7', 2, 'RMN', 'darshan', 'rtmp://37.27.201.26:1935/live', 'inactive'),
('25225966-1c23-4d00-943b-97d3395676ed', 2, 'RMN Test 2', 'live', 'rtmp://37.27.201.26:1935/socialmedia', 'inactive');