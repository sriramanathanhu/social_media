-- Insert all users from backup
INSERT INTO users (email, password_hash, role, status) VALUES 
('sri.ramanatha@uskfoundation.or.ke', '$2a$12$3x.o6wmYteklUVy83JOi/uosSSjc/G6s0rB2mD2YPdmSTxSKws336', 'admin', 'approved'),
('sri.ramanatha@kailasaafrica.org', '$2a$12$CTo.UdntlIQ7pPCsByu55ehB4PH9NunW3P78OgRakTy7Rbeyxau7.', 'user', 'approved'),
('sri.ramanatha@nithyanandauniversity.org', '$2a$12$.TODVfgk8hEWTEfma1nTtOD8idMWhgJlwg2wzSOV7qVGCx4WpXeZO', 'user', 'approved'),
('newtest@test.com', '$2a$12$VGsHDF.vfnDb7Odko5Q9IO92UAtNXin46TqMEQLY1mbH8fbHiaPM6', 'user', 'approved');