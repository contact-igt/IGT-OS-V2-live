-- Cleaned PostgreSQL Seed Data for IGT OS

INSERT INTO public.users (id, name, email, role, department, password_hash, must_change_password, is_active) VALUES 
('101', 'Sushil Athithiyaa', 'sushilathithiyaa@invictusglobaltech.com', 'admin', 'bd', '!UNSET-run-db:init', false, true),
('102', 'Anitha Yogan', 'contact@invictusglobaltech.com', 'ops', 'operations', '!UNSET-run-db:init', false, true),
('103', 'Abhilash B Nair', 'connect@invictusglobaltech.com', 'ops', 'operations', '!UNSET-run-db:init', false, true),
('104', 'Karan K', 'karankumar.igt@gmail.com', 'team', 'design', '!UNSET-run-db:init', false, true),
('105', 'NaveenRaj R', 'naveenraj.igt@gmail.com', 'team', 'development', '!UNSET-run-db:init', false, true),
('106', 'Iyyappan', 'iyyappan.igt@gmail.com', 'team', 'development', '!UNSET-run-db:init', false, true),
('107', 'Veeravel S', 'veeravel.igt@gmail.com', 'team', 'development', '!UNSET-run-db:init', false, true),
('108', 'Jashwanth Boddupally', 'jashwanth.boddupally.igt@gmail.com', 'team', 'development', '!UNSET-run-db:init', false, false),
('109', 'Basheer', 'basheerinvictus@gmail.com', 'team', 'video', '!UNSET-run-db:init', false, true),
('110', 'Pranesh Krishnan', 'praneshkrishnan.igt@gmail.com', 'team', 'video', '!UNSET-run-db:init', false, true),
('111', 'Aiswarya Saiju', 'aiswarya.saiju.igt@gmail.com', 'team', 'performance_marketing', '!UNSET-run-db:init', false, true),
('112', 'Anju S', 'abhilash.igt@gmail.com', 'team', 'performance_marketing', '!UNSET-run-db:init', false, true),
('113', 'Rutuja Rajbhar', 'rutuja.rajbhar.igt@gmail.com', 'team', 'performance_marketing', '!UNSET-run-db:init', false, true),
('114', 'Tania Viquar', 'tania.viquar.igt@gmail.com', 'team', 'sales', '!UNSET-run-db:init', false, true),
('115', 'Dikshita Rajpurohit', 'dikshitarajpurohit.igt@gmail.com', 'team', 'performance_marketing', '!UNSET-run-db:init', false, true),
('116', 'Mohammad Thariq', 'thariq.dev@gmail.com', 'team', 'development', '!UNSET-run-db:init', false, true);

-- 2. Seed Clients
INSERT INTO public.clients (id, name, short_code, category, monthly_retainer_inr, contract_status) VALUES 
('11111111-1111-1111-1111-111111111111', 'Pixel Eye Hospital', 'PXLE', 'eye_care', 62099, 'active'),
('11111111-1111-1111-1111-111111111112', 'Namokar Eye & Oculoplasty Centre', 'NMKR', 'eye_care', 30000, 'active'),
('11111111-1111-1111-1111-111111111113', 'Optimus Eye Hospital', 'OPMS', 'eye_care', 58000, 'active'),
('11111111-1111-1111-1111-111111111114', 'Antardrashti Netralaya', 'ANTR', 'eye_care', 20000, 'active'),
('11111111-1111-1111-1111-111111111115', 'Aarav Eye Care', 'AARV', 'eye_care', 20000, 'active'),
('11111111-1111-1111-1111-111111111116', 'Phoenix Fitness', 'PHNX', 'fitness', 44000, 'active'),
('11111111-1111-1111-1111-111111111117', 'Rio Children''s Hospital', 'RIOC', 'healthcare', 40000, 'active'),
('11111111-1111-1111-1111-111111111118', 'VLS / BLS Law Academy', 'VLSL', 'edtech', 25000, 'active'),
('11111111-1111-1111-1111-111111111119', 'Oftal / Ophthall', 'OFTH', 'eye_care', 0, 'active'),
('11111111-1111-1111-1111-11111111111a', 'YM Motors', 'YMMR', 'automotive', 0, 'active'),
('11111111-1111-1111-1111-11111111111b', 'MPM Constructions', 'MPMC', 'construction', 0, 'active'),
('11111111-1111-1111-1111-11111111111c', 'Sujit Annan', 'SJTN', 'eye_care', 0, 'active');

