
-- Service role: full access everywhere
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated users: CRUD (policies still enforce per-row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Anon: read-only on public reference + public-facing tables
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.states TO anon;
GRANT SELECT ON public.cities TO anon;
GRANT SELECT ON public.languages TO anon;
GRANT SELECT ON public.currencies TO anon;
GRANT SELECT ON public.exchange_rates TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.category_translations TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.service_translations TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.professional_categories TO anon;
GRANT SELECT ON public.professional_coverage TO anon;
GRANT SELECT ON public.professional_verifications TO anon;
GRANT SELECT ON public.reviews TO anon;

-- Default privileges for future objects in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
