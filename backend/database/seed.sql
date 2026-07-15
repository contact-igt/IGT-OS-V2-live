-- Cleaned PostgreSQL Seed Data for IGT OS

INSERT INTO public.users (id, name, email, role, department, password_hash, must_change_password, is_active) VALUES 
('00000000-0000-0000-0000-000000000001', 'Sushil Athithiyaa', 'sushilathithiyaa@invictusglobaltech.com', 'admin', 'bd', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000002', 'Anitha Yogan', 'contact@invictusglobaltech.com', 'ops', 'operations', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000003', 'Abhilash B Nair', 'connect@invictusglobaltech.com', 'ops', 'operations', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000004', 'Karan K', 'karankumar.igt@gmail.com', 'team', 'design', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000005', 'NaveenRaj R', 'naveenraj.igt@gmail.com', 'team', 'development', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000006', 'Iyyappan', 'iyyappan.igt@gmail.com', 'team', 'development', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000007', 'Veeravel S', 'veeravel.igt@gmail.com', 'team', 'development', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000008', 'Jashwanth Boddupally', 'jashwanth.boddupally.igt@gmail.com', 'team', 'development', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, false),
('00000000-0000-0000-0000-000000000009', 'Basheer', 'basheerinvictus@gmail.com', 'team', 'video', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000010', 'Pranesh Krishnan', 'praneshkrishnan.igt@gmail.com', 'team', 'video', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000011', 'Aiswarya Saiju', 'aiswarya.saiju.igt@gmail.com', 'team', 'performance_marketing', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000012', 'Anju S', 'abhilash.igt@gmail.com', 'team', 'performance_marketing', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000013', 'Rutuja Rajbhar', 'rutuja.rajbhar.igt@gmail.com', 'team', 'performance_marketing', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000014', 'Tania Viquar', 'tania.viquar.igt@gmail.com', 'team', 'sales', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000015', 'Dikshita Rajpurohit', 'dikshitarajpurohit.igt@gmail.com', 'team', 'performance_marketing', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true),
('00000000-0000-0000-0000-000000000016', 'Mohammad Thariq', 'thariq.dev@gmail.com', 'team', 'development', '$2b$10$PNDqZTw4sI/N4mJxREDw3uHkqgPCc/Il8KVsL2x3fGgLKsMTpPdHW', false, true);

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

-- 4. Seed Invoices
INSERT INTO public.invoices (invoice_number, client_id, amount_inr, status, issue_date, due_date) VALUES 
('INV-2026-001', '11111111-1111-1111-1111-111111111111', 75000, 'paid', '2026-06-01', '2026-06-15'),
('INV-2026-042', '11111111-1111-1111-1111-111111111111', 75000, 'pending', '2026-07-01', '2026-07-15'),
('INV-2026-085', '11111111-1111-1111-1111-111111111111', 75000, 'draft', '2026-08-01', '2026-08-15');

-- 5. Seed Campaigns
INSERT INTO public.campaigns (client_id, campaign_name, campaign_type, start_date, budget_inr, spend_inr, leads, cpl_inr, status) VALUES 
('11111111-1111-1111-1111-111111111111', 'Pixel Eye Meta', 'meta', '2026-07-01', 100000, 45000, 320, 140, 'running'),
('11111111-1111-1111-1111-111111111113', 'Namokar Google', 'google', '2026-07-01', 80000, 25000, 150, 166, 'running'),
('11111111-1111-1111-1111-111111111111', 'Optimus Google', 'google', '2026-07-01', 70000, 30000, 210, 142, 'running');

-- 6. Seed Deliverables
INSERT INTO public.client_deliverables (client_id, deliverable_name, deliverable_type, quantity_per_month, unit, is_active) VALUES 
('11111111-1111-1111-1111-111111111111', 'Performance Marketing', 'monthly_recurring', 1, 'campaigns', true),
('11111111-1111-1111-1111-111111111111', 'SEO & Content', 'monthly_recurring', 4, 'blogs', true),
('11111111-1111-1111-1111-111111111111', 'Social Media Management', 'monthly_recurring', 15, 'posts', false);

-- 7. Seed Time Logs (we need actual task_ids for foreign keys. Using subselects)
INSERT INTO public.time_logs (task_id, user_id, duration_minutes, started_at) VALUES 
((SELECT id FROM public.tasks LIMIT 1), '00000000-0000-0000-0000-000000000001', 120, '2026-07-12 10:00:00'),
((SELECT id FROM public.tasks OFFSET 1 LIMIT 1), '00000000-0000-0000-0000-000000000003', 45, '2026-07-12 14:30:00'),
((SELECT id FROM public.tasks OFFSET 2 LIMIT 1), '00000000-0000-0000-0000-000000000002', 240, '2026-07-11 16:00:00');

