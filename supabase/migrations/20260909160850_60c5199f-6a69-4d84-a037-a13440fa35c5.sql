-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  default_automation_active BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- instagram_accounts
CREATE TABLE public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  profile_picture TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX instagram_accounts_user_id_idx ON public.instagram_accounts(user_id);
CREATE INDEX instagram_accounts_ig_user_idx ON public.instagram_accounts(instagram_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts TO authenticated;
GRANT ALL ON public.instagram_accounts TO service_role;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig_select_own" ON public.instagram_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ig_insert_own" ON public.instagram_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ig_update_own" ON public.instagram_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ig_delete_own" ON public.instagram_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER instagram_accounts_updated_at BEFORE UPDATE ON public.instagram_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- automation_rules
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','exact','starts_with','ends_with')),
  reply_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  cooldown_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_minutes >= 0 AND cooldown_minutes <= 10080),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX automation_rules_user_id_idx ON public.automation_rules(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_select_own" ON public.automation_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rules_insert_own" ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rules_update_own" ON public.automation_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rules_delete_own" ON public.automation_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  instagram_comment_id TEXT NOT NULL,
  username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  post_id TEXT NOT NULL DEFAULT '',
  replied BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_user_id_created_idx ON public.comments(user_id, created_at DESC);
CREATE UNIQUE INDEX comments_user_ig_comment_idx ON public.comments(user_id, instagram_comment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_own" ON public.comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comment_replies
CREATE TABLE public.comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  reply_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated','sent','failed')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comment_replies_user_id_idx ON public.comment_replies(user_id, created_at DESC);
CREATE INDEX comment_replies_rule_id_idx ON public.comment_replies(rule_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_replies TO authenticated;
GRANT ALL ON public.comment_replies TO service_role;
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies_select_own" ON public.comment_replies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "replies_insert_own" ON public.comment_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "replies_update_own" ON public.comment_replies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "replies_delete_own" ON public.comment_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- activity_logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info' CHECK (status IN ('info','success','warning','error','demo')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_user_id_created_idx ON public.activity_logs(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_own" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_delete_own" ON public.activity_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);