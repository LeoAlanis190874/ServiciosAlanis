
-- ============================================================
-- SERVICIOS ALANIS — Base de datos inicial
-- ============================================================

-- ===== Extensiones =====
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('cliente', 'profesional', 'admin');
CREATE TYPE public.request_status AS ENUM ('draft','open','quoted','assigned','in_progress','completed','cancelled','disputed');
CREATE TYPE public.quote_status AS ENUM ('pending','accepted','rejected','withdrawn','expired');
CREATE TYPE public.urgency_level AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.notification_channel AS ENUM ('in_app','email','sms','push');
CREATE TYPE public.verification_status AS ENUM ('unverified','pending','verified','rejected');

-- ===== Trigger genérico updated_at =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================
-- REFERENCIA INTERNACIONAL: idiomas, monedas, países, estados, ciudades
-- ============================================================

CREATE TABLE public.languages (
  code TEXT PRIMARY KEY,           -- ISO 639-1 (es, en, pt)
  name TEXT NOT NULL,
  native_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "languages_public_read" ON public.languages FOR SELECT USING (true);

CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,           -- ISO 4217 (USD, MXN, EUR)
  name TEXT NOT NULL,
  symbol TEXT,
  decimal_digits SMALLINT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies_public_read" ON public.currencies FOR SELECT USING (true);

CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL REFERENCES public.currencies(code),
  quote_currency TEXT NOT NULL REFERENCES public.currencies(code),
  rate NUMERIC(18,8) NOT NULL,
  as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, as_of)
);
GRANT SELECT ON public.exchange_rates TO anon, authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rates_public_read" ON public.exchange_rates FOR SELECT USING (true);

CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 TEXT NOT NULL UNIQUE,       -- 'MX','US','ES'
  iso3 TEXT UNIQUE,
  name TEXT NOT NULL,
  phone_code TEXT,
  default_currency TEXT REFERENCES public.currencies(code),
  default_language TEXT REFERENCES public.languages(code),
  default_timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries_public_read" ON public.countries FOR SELECT USING (true);

CREATE TABLE public.states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, name)
);
CREATE INDEX idx_states_country ON public.states(country_id);
GRANT SELECT ON public.states TO anon, authenticated;
GRANT ALL ON public.states TO service_role;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "states_public_read" ON public.states FOR SELECT USING (true);

CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cities_state ON public.cities(state_id);
CREATE INDEX idx_cities_country ON public.cities(country_id);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT USING (true);

-- ============================================================
-- IDENTIDAD: profiles + user_roles + has_role
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  preferred_language TEXT REFERENCES public.languages(code) DEFAULT 'es',
  preferred_currency TEXT REFERENCES public.currencies(code) DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  country_id UUID REFERENCES public.countries(id),
  state_id UUID REFERENCES public.states(id),
  city_id UUID REFERENCES public.cities(id),
  address_line TEXT,
  postal_code TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-crear profile en signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  -- Rol por defecto: cliente
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (is_active = true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Políticas user_roles
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- CATÁLOGO: categories + services (con i18n)
-- ============================================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code),
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (category_id, language_code)
);
CREATE INDEX idx_cat_trans_cat ON public.category_translations(category_id);
GRANT SELECT ON public.category_translations TO anon, authenticated;
GRANT ALL ON public.category_translations TO service_role;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_trans_public_read" ON public.category_translations FOR SELECT USING (true);
CREATE POLICY "cat_trans_admin_all" ON public.category_translations FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  base_price_min NUMERIC(14,2),
  base_price_max NUMERIC(14,2),
  base_currency TEXT REFERENCES public.currencies(code),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_category ON public.services(category_id);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "services_admin_all" ON public.services FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.service_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code),
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (service_id, language_code)
);
CREATE INDEX idx_srv_trans_srv ON public.service_translations(service_id);
GRANT SELECT ON public.service_translations TO anon, authenticated;
GRANT ALL ON public.service_translations TO service_role;
ALTER TABLE public.service_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_trans_public_read" ON public.service_translations FOR SELECT USING (true);
CREATE POLICY "srv_trans_admin_all" ON public.service_translations FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Cobertura del profesional (categorías y zonas)
CREATE TABLE public.professional_categories (
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(14,2),
  currency_code TEXT REFERENCES public.currencies(code),
  years_experience SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (professional_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_categories TO authenticated;
GRANT ALL ON public.professional_categories TO service_role;
ALTER TABLE public.professional_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof_cat_public_read" ON public.professional_categories FOR SELECT USING (true);
CREATE POLICY "prof_cat_self_write" ON public.professional_categories FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "prof_cat_admin_all" ON public.professional_categories FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.professional_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id UUID REFERENCES public.countries(id),
  state_id UUID REFERENCES public.states(id),
  city_id UUID REFERENCES public.cities(id),
  service_radius_km INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prof_cov_prof ON public.professional_coverage(professional_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_coverage TO authenticated;
GRANT ALL ON public.professional_coverage TO service_role;
ALTER TABLE public.professional_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof_cov_public_read" ON public.professional_coverage FOR SELECT USING (true);
CREATE POLICY "prof_cov_self_write" ON public.professional_coverage FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());

-- Verificación KYC profesional
CREATE TABLE public.professional_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.verification_status NOT NULL DEFAULT 'unverified',
  document_type TEXT,
  document_url TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prof_verif_prof ON public.professional_verifications(professional_id);
GRANT SELECT, INSERT, UPDATE ON public.professional_verifications TO authenticated;
GRANT ALL ON public.professional_verifications TO service_role;
ALTER TABLE public.professional_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_self_read" ON public.professional_verifications FOR SELECT
  USING (professional_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "verif_self_write" ON public.professional_verifications FOR INSERT
  WITH CHECK (professional_id = auth.uid());
CREATE POLICY "verif_admin_update" ON public.professional_verifications FOR UPDATE
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_verif_updated BEFORE UPDATE ON public.professional_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SOLICITUDES Y COTIZACIONES
-- ============================================================

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  service_id UUID REFERENCES public.services(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.request_status NOT NULL DEFAULT 'open',
  urgency public.urgency_level NOT NULL DEFAULT 'normal',
  budget_min NUMERIC(14,2),
  budget_max NUMERIC(14,2),
  budget_currency TEXT REFERENCES public.currencies(code),
  country_id UUID REFERENCES public.countries(id),
  state_id UUID REFERENCES public.states(id),
  city_id UUID REFERENCES public.cities(id),
  address_line TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  preferred_date DATE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_quote_id UUID,            -- FK añadida más abajo
  assigned_professional_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_client ON public.service_requests(client_id);
CREATE INDEX idx_requests_category ON public.service_requests(category_id);
CREATE INDEX idx_requests_status ON public.service_requests(status);
CREATE INDEX idx_requests_country ON public.service_requests(country_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  estimated_days INT,
  message TEXT,
  status public.quote_status NOT NULL DEFAULT 'pending',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, professional_id)
);
CREATE INDEX idx_quotes_request ON public.quotes(request_id);
CREATE INDEX idx_quotes_prof ON public.quotes(professional_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_requests
  ADD CONSTRAINT fk_requests_assigned_quote
  FOREIGN KEY (assigned_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

-- RLS service_requests
CREATE POLICY "requests_client_read" ON public.service_requests FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "requests_open_prof_read" ON public.service_requests FOR SELECT
  USING (status IN ('open','quoted') AND public.has_role(auth.uid(),'profesional'));
CREATE POLICY "requests_assigned_prof_read" ON public.service_requests FOR SELECT
  USING (assigned_professional_id = auth.uid());
CREATE POLICY "requests_admin_all" ON public.service_requests FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "requests_client_insert" ON public.service_requests FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "requests_client_update" ON public.service_requests FOR UPDATE
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- RLS quotes
CREATE POLICY "quotes_prof_read" ON public.quotes FOR SELECT USING (professional_id = auth.uid());
CREATE POLICY "quotes_client_read" ON public.quotes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = quotes.request_id AND r.client_id = auth.uid()));
CREATE POLICY "quotes_admin_all" ON public.quotes FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "quotes_prof_insert" ON public.quotes FOR INSERT
  WITH CHECK (professional_id = auth.uid() AND public.has_role(auth.uid(),'profesional'));
CREATE POLICY "quotes_prof_update" ON public.quotes FOR UPDATE
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "quotes_client_update_status" ON public.quotes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = quotes.request_id AND r.client_id = auth.uid()));

-- ============================================================
-- MENSAJERÍA
-- ============================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, client_id, professional_id)
);
CREATE INDEX idx_conv_request ON public.conversations(request_id);
CREATE INDEX idx_conv_parties ON public.conversations(client_id, professional_id);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_parties_read" ON public.conversations FOR SELECT
  USING (client_id = auth.uid() OR professional_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "conv_parties_insert" ON public.conversations FOR INSERT
  WITH CHECK (client_id = auth.uid() OR professional_id = auth.uid());
CREATE POLICY "conv_admin_all" ON public.conversations FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_parties_read" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.id = messages.conversation_id
                   AND (c.client_id = auth.uid() OR c.professional_id = auth.uid()))
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "messages_sender_insert" ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.conversations c
                          WHERE c.id = messages.conversation_id
                            AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())));
CREATE POLICY "messages_admin_all" ON public.messages FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- RESEÑAS
-- ============================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, reviewer_id, reviewee_id)
);
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "reviews_reviewer_insert" ON public.reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_reviewer_update" ON public.reviews FOR UPDATE
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_admin_all" ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- NOTIFICACIONES
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  type TEXT NOT NULL,                -- ej: 'new_quote', 'message', 'request_assigned'
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_self_read" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_self_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_admin_all" ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- ADMIN LOGS
-- ============================================================

CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_admin ON public.admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_entity ON public.admin_logs(entity_type, entity_id);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_logs_admin_read" ON public.admin_logs FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_logs_admin_insert" ON public.admin_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());
