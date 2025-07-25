-- Restore all posts from backup
DELETE FROM posts WHERE id BETWEEN 1 AND 100;

INSERT INTO posts (id, user_id, content, status, target_accounts, published_at, scheduled_for, error_message, created_at, updated_at, media_urls, post_type, is_scheduled) VALUES
(1, 2, 'Nithyanandam', 'published', '[1]', '2025-07-05 14:00:16.996', NULL, NULL, '2025-07-05 14:00:16.405684', '2025-07-05 14:00:16.996848', '[]', 'text', false),
(2, 2, 'Nithyanandam', 'failed', '[1]', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 14:09:10.943592', '2025-07-05 14:09:11.286611', '[]', 'text', false),
(3, 2, 'Nithyanandam', 'published', '[1]', '2025-07-05 14:11:07.53', NULL, NULL, '2025-07-05 14:11:07.100521', '2025-07-05 14:11:07.531836', '[]', 'text', false),
(4, 2, 'Blessings', 'failed', '[2]', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 14:15:02.107107', '2025-07-05 14:15:02.116709', '[]', 'text', false),
(5, 2, 'NIthyanandam', 'published', '[2]', '2025-07-05 14:15:29.568', NULL, NULL, '2025-07-05 14:15:29.22552', '2025-07-05 14:15:29.572049', '[]', 'text', false),
(6, 2, 'Blessings!!', 'published', '[2]', '2025-07-05 14:20:40.943', NULL, NULL, '2025-07-05 14:20:39.036221', '2025-07-05 14:20:40.946033', '[]', 'text', false),
(7, 2, 'Nithyanandam', 'published', '[3]', '2025-07-05 14:55:15.601', NULL, NULL, '2025-07-05 14:55:15.192271', '2025-07-05 14:55:15.602733', '[]', 'text', false),
(8, 2, 'Nithyanandam', 'failed', '[3, 2]', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 15:05:38.86557', '2025-07-05 15:05:39.678403', '[]', 'text', false),
(9, 2, 'Blessings!!', 'failed', '[3, 2]', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 15:06:22.702678', '2025-07-05 15:06:23.174219', '[]', 'text', false),
(10, 2, 'Blessings!!', 'failed', '[3, 2]', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 15:08:27.379457', '2025-07-05 15:08:28.127271', '[]', 'text', false);