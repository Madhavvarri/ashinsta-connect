ALTER TABLE public.instagram_accounts
  ADD COLUMN IF NOT EXISTS granted_scopes text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  instagram_account_id uuid REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  conversation_id text NOT NULL DEFAULT '',
  message_id text NOT NULL,
  sender_id text NOT NULL DEFAULT '',
  recipient_id text NOT NULL DEFAULT '',
  sender_username text NOT NULL DEFAULT '',
  message_text text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT 'incoming',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_messages TO authenticated;
GRANT ALL ON public.instagram_messages TO service_role;

ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_own ON public.instagram_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY messages_insert_own ON public.instagram_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_update_own ON public.instagram_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_delete_own ON public.instagram_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS instagram_messages_user_sent_idx
  ON public.instagram_messages (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS instagram_messages_conversation_idx
  ON public.instagram_messages (user_id, conversation_id, sent_at);