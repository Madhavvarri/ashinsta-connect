-- Remove all simulated (Demo Mode) data
DELETE FROM public.comment_replies WHERE is_demo = true OR status = 'simulated';
DELETE FROM public.comments WHERE is_demo = true;
DELETE FROM public.instagram_accounts WHERE is_demo = true;
DELETE FROM public.activity_logs WHERE status = 'demo' OR type = 'reply_simulated' OR (metadata->>'demo') = 'true';

-- Drop the demo flags
ALTER TABLE public.comment_replies DROP COLUMN IF EXISTS is_demo;
ALTER TABLE public.comments DROP COLUMN IF EXISTS is_demo;
ALTER TABLE public.instagram_accounts DROP COLUMN IF EXISTS is_demo;

-- Real replies are only ever "sent" or "failed"
ALTER TABLE public.comment_replies ALTER COLUMN status SET DEFAULT 'failed';