-- Extract and insert data from backup
-- First add missing columns to existing tables

-- Add missing columns to social_accounts
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS last_used TIMESTAMP WITH TIME ZONE;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS group_id INTEGER;

-- Add missing columns to posts  
ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_accounts INTEGER[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Insert user data
INSERT INTO users (id, email, password_hash, created_at, updated_at, role, status) VALUES
(1, 'test@example.com', '$2a$12$R7VVNYPCBuNP0gMbdmJeburTt6qk6fcp960Zbg6K0bFVldaYfuJJC', '2025-07-04 21:15:58.927269', '2025-07-05 20:13:14.695999', 'admin', 'approved'),
(4, 'sri.ramanatha@nithyanandauniversity.org', '$2a$12$.TODVfgk8hEWTEfma1nTtOD8idMWhgJlwg2wzSOV7qVGCx4WpXeZO', '2025-07-05 20:03:44.317584', '2025-07-05 23:07:28.234753', 'user', 'approved'),
(2, 'sri.ramanatha@uskfoundation.or.ke', '$2a$12$3x.o6wmYteklUVy83JOi/uosSSjc/G6s0rB2mD2YPdmSTxSKws336', '2025-07-04 21:18:49.347182', '2025-07-06 00:56:56.464304', 'admin', 'approved'),
(5, 'newtest@test.com', '$2a$12$VGsHDF.vfnDb7Odko5Q9IO92UAtNXin46TqMEQLY1mbH8fbHiaPM6', '2025-07-06 15:47:32.749578', '2025-07-06 15:52:34.345237', 'user', 'approved'),
(3, 'sri.ramanatha@kailasaafrica.org', '$2a$12$CTo.UdntlIQ7pPCsByu55ehB4PH9NunW3P78OgRakTy7Rbeyxau7.', '2025-07-05 16:15:27.751028', '2025-07-11 03:04:05.076738', 'user', 'approved');

-- Update sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Insert social accounts data
INSERT INTO social_accounts (id, user_id, platform, instance_url, username, display_name, avatar_url, access_token, refresh_token, token_expires_at, status, last_used, created_at, updated_at, group_id) VALUES
(5, 2, 'mastodon', 'https://mastodon.social', 'SriNithyanandaTamil', 'KAILASA''s SPH Nithyananda', 'https://mastodon.social/avatars/original/missing.png', 'f1112e89caee91b2bac660cb4549c783:791f92884c59d4abce617420cc4a33b3ff2072c018acd26ac498ec47c582129eed21d73d1c837063fffde491e5bb1221', NULL, NULL, 'active', '2025-07-06 00:34:02.637249', '2025-07-05 15:23:16.555754', '2025-07-06 00:34:02.637249', 1),
(3, 2, 'mastodon', 'https://mastodon.social', 'nithyanandayoga', 'KAILASA''s Nithyananda Yoga', 'https://files.mastodon.social/accounts/avatars/114/790/722/466/991/781/original/e9748c350435b6ca.jpg', 'c818f04940b1892a49d620e1a7fe8407:41b155782219b8c63f7a0d3441c34ac33830f773dcc043580855dcc8513ab291b307727bd70f7f9a4e8c67c957db5284', NULL, NULL, 'active', '2025-07-06 00:34:04.595656', '2025-07-05 14:49:52.281569', '2025-07-06 00:34:04.595656', 1),
(4, 2, 'mastodon', 'https://mastodon.social', 'SriNithyananda', 'KAILASA''s SPH Nithyananda', 'https://files.mastodon.social/accounts/avatars/114/445/044/896/750/112/original/1fc187283524fb7f.jpg', '1c950a67403c75465bcaaa44442b6bad:6d19b1e79dc6f27b205681db427ce06988c65c78e6e32c2de0b650d4a34b79a0722847f430276eb209d28664a840c3e8', NULL, NULL, 'active', '2025-07-06 00:34:06.889365', '2025-07-05 15:14:32.210196', '2025-07-06 00:34:06.889365', 1),
(6, 3, 'x', NULL, 'kailasanation', 'United States Of KAILASA', NULL, '881941b50e76f31fd6a512052d5a5dbb:a4181ff40f505724d33266d81b796dd5105238c57f3cb78fc083a7b3800b79233b94da9d2c97b30a11ff5951acaa95acba399ee725f7b932b0aa370112fb6ef3a4866dd037a74870367c1e7012ecb097ce9e9c0a3cdf2b4f16178b0236a1df02', NULL, '2025-07-05 21:13:08.559', 'active', NULL, '2025-07-05 19:13:08.562357', '2025-07-05 19:13:08.562357', NULL),
(23, 2, 'pinterest', NULL, 'ramanathaananda', 'ramanathaananda', 'https://i.pinimg.com/600x600_R/30/52/20/305220a1685dd84587ed52ac0de3651f.jpg', '7cde027983985cd0722482570fec7b83:881a081e1b88e3bf8a2c5f2a87c1d126ad1ade72e29234f263e90c273a80d9e0c3f7de0b64a3ee56deac64bd8eb5ac2150937d1aebf0af4aca70c9b3d280a2388b4c863606550242d3ddbbbaeb04b5b70f0d92100d7823612b421671eb2d6bfd1ae9c2fe13c68fc74c69b943a20b720b', NULL, NULL, 'active', NULL, '2025-07-07 04:11:50.935485', '2025-07-07 04:11:50.935485', NULL);

-- Update sequence for social_accounts
SELECT setval('social_accounts_id_seq', (SELECT MAX(id) FROM social_accounts));

-- Insert posts data
INSERT INTO posts (id, user_id, content, status, target_accounts, published_at, scheduled_for, error_message, created_at, updated_at, media_urls, post_type, is_scheduled) VALUES
(1, 2, 'Nithyanandam', 'published', '{1}', '2025-07-05 14:00:16.996', NULL, NULL, '2025-07-05 14:00:16.405684', '2025-07-05 14:00:16.996848', '{}', 'text', false),
(2, 2, 'Nithyanandam', 'failed', '{1}', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 14:09:10.943592', '2025-07-05 14:09:11.286611', '{}', 'text', false),
(3, 2, 'Nithyanandam', 'published', '{1}', '2025-07-05 14:11:07.53', NULL, NULL, '2025-07-05 14:11:07.100521', '2025-07-05 14:11:07.531836', '{}', 'text', false),
(4, 2, 'Blessings', 'failed', '{2}', NULL, NULL, 'Some accounts failed to publish', '2025-07-05 14:15:02.107107', '2025-07-05 14:15:02.116709', '{}', 'text', false),
(5, 2, 'NIthyanandam', 'published', '{2}', '2025-07-05 14:15:29.568', NULL, NULL, '2025-07-05 14:15:29.22552', '2025-07-05 14:15:29.572049', '{}', 'text', false);

-- Update sequence for posts
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));