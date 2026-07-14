-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Seed Users (Auth)
-- Using fixed UUIDs for relationships
-- admin
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sushil@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Sushil Athithiyaa", "role": "admin"}'),
-- ops
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anitha@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Anitha Yogan", "role": "ops"}'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'abhilash@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Abhilash B Nair", "role": "ops"}'),
-- team
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'karan@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Karan K", "role": "team"}'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'naveen@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Naveen", "role": "team"}'),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iyyappan@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Iyyappan", "role": "team"}'),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'veeravel@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Veeravel", "role": "team"}'),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'basheer@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Basheer", "role": "team"}'),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pranesh@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Pranesh", "role": "team"}'),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aiswarya@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Aiswarya Saiju", "role": "team"}'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anju@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Anju", "role": "team"}'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rutuja@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Rutuja", "role": "team"}'),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tania@invictus.com', crypt('password123', gen_salt('bf')), now(), '{"name": "Tania", "role": "team"}');

-- Ensure public.users are updated with departments
UPDATE public.users SET department = 'bd' WHERE email = 'sushil@invictus.com';
UPDATE public.users SET department = 'operations' WHERE email IN ('anitha@invictus.com', 'abhilash@invictus.com');
UPDATE public.users SET department = 'design' WHERE email = 'karan@invictus.com';
UPDATE public.users SET department = 'development' WHERE email IN ('naveen@invictus.com', 'iyyappan@invictus.com', 'veeravel@invictus.com');
UPDATE public.users SET department = 'video' WHERE email IN ('basheer@invictus.com', 'pranesh@invictus.com');
UPDATE public.users SET department = 'performance_marketing' WHERE email IN ('aiswarya@invictus.com', 'anju@invictus.com', 'rutuja@invictus.com');
UPDATE public.users SET department = 'sales' WHERE email = 'tania@invictus.com';

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

-- 3. Seed Tasks
INSERT INTO public.tasks (client_id, title, category, assigned_to, created_by, priority, status) VALUES 
('11111111-1111-1111-1111-111111111111', 'WhatsNexus — Lead Tracking Onboarding (Pooja)', 'whatsapp_automation', '{00000000-0000-0000-0000-000000000003}', '00000000-0000-0000-0000-000000000001', 'high', 'in_progress'),
('11111111-1111-1111-1111-111111111111', 'Monthly Performance Report — June', 'strategy', '{00000000-0000-0000-0000-000000000001}', '00000000-0000-0000-0000-000000000001', 'medium', 'todo'),
('11111111-1111-1111-1111-111111111111', 'Reels — July batch (2 videos)', 'video_editing', '{00000000-0000-0000-0000-000000000008}', '00000000-0000-0000-0000-000000000002', 'high', 'todo'),
('11111111-1111-1111-1111-111111111113', 'Website — Service Landing Pages completion', 'web_development', '{00000000-0000-0000-0000-000000000006}', '00000000-0000-0000-0000-000000000001', 'high', 'in_progress'),
('11111111-1111-1111-1111-111111111113', 'Video Shoot — Coordinate Lucknow videographer', 'operations', '{00000000-0000-0000-0000-000000000003}', '00000000-0000-0000-0000-000000000001', 'critical', 'todo'),
('11111111-1111-1111-1111-111111111113', 'GMB Daily Updates — Week of Jul 7', 'social_media', '{00000000-0000-0000-0000-000000000010}', '00000000-0000-0000-0000-000000000002', 'medium', 'todo'),
('11111111-1111-1111-1111-111111111113', 'Google+Meta Campaigns — July optimization', 'performance_marketing', '{00000000-0000-0000-0000-000000000012, 00000000-0000-0000-0000-000000000010}', '00000000-0000-0000-0000-000000000001', 'high', 'in_progress'),
('11111111-1111-1111-1111-111111111114', 'Campaign Launch — Google + Meta (July resumption)', 'performance_marketing', '{00000000-0000-0000-0000-000000000012, 00000000-0000-0000-0000-000000000011}', '00000000-0000-0000-0000-000000000001', 'critical', 'todo'),
('11111111-1111-1111-1111-111111111114', 'Monthly Report Setup — baseline', 'strategy', '{00000000-0000-0000-0000-000000000001}', '00000000-0000-0000-0000-000000000001', 'high', 'todo'),
('11111111-1111-1111-1111-111111111116', 'Desk Body Reset Campaign — Meta', 'performance_marketing', '{00000000-0000-0000-0000-000000000010, 00000000-0000-0000-0000-000000000011}', '00000000-0000-0000-0000-000000000001', 'high', 'todo'),
('11111111-1111-1111-1111-111111111116', 'Women''s Health Campaign — Meta', 'performance_marketing', '{00000000-0000-0000-0000-000000000010}', '00000000-0000-0000-0000-000000000001', 'high', 'todo'),
('11111111-1111-1111-1111-111111111116', 'July Social Media Posts — 12 posts', 'social_media', '{00000000-0000-0000-0000-000000000002}', '00000000-0000-0000-0000-000000000001', 'medium', 'in_progress'),
('11111111-1111-1111-1111-111111111117', 'Website — High-risk Pregnancy Section', 'web_development', '{00000000-0000-0000-0000-000000000006, 00000000-0000-0000-0000-000000000007}', '00000000-0000-0000-0000-000000000001', 'high', 'in_progress'),
('11111111-1111-1111-1111-111111111117', 'Sales Team Lead Tracking — weekly sheet setup', 'operations', '{00000000-0000-0000-0000-000000000003}', '00000000-0000-0000-0000-000000000001', 'critical', 'todo'),
('11111111-1111-1111-1111-111111111117', 'Meta + Google Campaigns — July', 'performance_marketing', '{00000000-0000-0000-0000-000000000011, 00000000-0000-0000-0000-000000000012}', '00000000-0000-0000-0000-000000000001', 'high', 'in_progress'),
('11111111-1111-1111-1111-111111111112', 'July Social Posts — 12 posts', 'social_media', '{00000000-0000-0000-0000-000000000002}', '00000000-0000-0000-0000-000000000001', 'medium', 'in_progress'),
('11111111-1111-1111-1111-111111111115', 'Proof of Results — Campaign Review Report', 'strategy', '{00000000-0000-0000-0000-000000000001}', '00000000-0000-0000-0000-000000000001', 'critical', 'todo');
