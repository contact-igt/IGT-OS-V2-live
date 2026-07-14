CREATE TABLE IF NOT EXISTS public.active_timers (
    task_id UUID PRIMARY KEY,
    user_id UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    accumulated_minutes INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.campaign_weekly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID,
    leads INTEGER,
    spend NUMERIC,
    cpl NUMERIC,
    date DATE
);
CREATE TABLE IF NOT EXISTS public.ad_account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    balance NUMERIC,
    platform VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
