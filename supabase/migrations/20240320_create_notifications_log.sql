-- 1. Create the notifications_log table
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'fatura_fechamento', 'fatura_vencimento', 'despesa_vencendo', 'limite_85', 'meta_objetivo', 'relatorio_mensal'
    reference_id TEXT, -- ID of the fatura, transaction, or goal
    month_year TEXT, -- 'YYYY-MM' to prevent duplicate monthly alerts
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_type ON public.notifications_log(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_log_ref ON public.notifications_log(reference_id);

-- 3. RBAC (Row Level Security)
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications log"
    ON public.notifications_log FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Enable pg_cron and pg_net (optional but recommended for Edge Function triggers)
-- Note: These often require Superuser or dashboard execution.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. Example of pg_cron setup (to be run manually after creating the Edge Function)
-- SELECT cron.schedule(
--   'process-daily-notifications',
--   '0 9 * * *', -- Every day at 09:00
--   $$
--   SELECT
--     net.http_post(
--       url:='https://<project-ref>.supabase.co/functions/v1/process-daily-notifications',
--       headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
--     ) as request_id;
--   $$
-- );
