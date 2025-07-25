-- Restore all existing users from backup
-- First, remove the temporary admin user we created
DELETE FROM users WHERE email = 'admin@example.com';

-- Reset the sequence to start from the correct ID
SELECT setval('users_id_seq', 1, false);

-- Restore all original users with their exact IDs and data
INSERT INTO users (id, email, password_hash, created_at, updated_at, role, status) VALUES
(1, 'test@example.com', '$2a$12$R7VVNYPCBuNP0gMbdmJeburTt6qk6fcp960Zbg6K0bFVldaYfuJJC', '2025-07-04 21:15:58.927269', '2025-07-05 20:13:14.695999', 'admin', 'approved'),
(2, 'sri.ramanatha@uskfoundation.or.ke', '$2a$12$3x.o6wmYteklUVy83JOi/uosSSjc/G6s0rB2mD2YPdmSTxSKws336', '2025-07-04 21:18:49.347182', '2025-07-06 00:56:56.464304', 'admin', 'approved'),
(3, 'sri.ramanatha@kailasaafrica.org', '$2a$12$CTo.UdntlIQ7pPCsByu55ehB4PH9NunW3P78OgRakTy7Rbeyxau7.', '2025-07-05 16:15:27.751028', '2025-07-11 03:04:05.076738', 'user', 'approved'),
(4, 'sri.ramanatha@nithyanandauniversity.org', '$2a$12$.TODVfgk8hEWTEfma1nTtOD8idMWhgJlwg2wzSOV7qVGCx4WpXeZO', '2025-07-05 20:03:44.317584', '2025-07-05 23:07:28.234753', 'user', 'approved'),
(5, 'newtest@test.com', '$2a$12$VGsHDF.vfnDb7Odko5Q9IO92UAtNXin46TqMEQLY1mbH8fbHiaPM6', '2025-07-06 15:47:32.749578', '2025-07-06 15:52:34.345237', 'user', 'approved'),
(6, 'sri.shivathama@uskfoundation.or.ke', '$2a$12$hW31meZ7BfJfwPPqXtOEDu8ge/TM8HYcaC5fJpdZS1Oq/lhi8mwtS', '2025-07-14 13:45:18.054306', '2025-07-14 13:45:45.905546', 'user', 'approved');

-- Update the sequence to the next available ID
SELECT setval('users_id_seq', 7, false);