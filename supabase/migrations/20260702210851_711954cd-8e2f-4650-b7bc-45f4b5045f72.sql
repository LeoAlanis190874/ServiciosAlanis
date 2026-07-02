
-- Ensure triggers exist for handle_new_user + super admin protection
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS protect_super_admin_profile_trg ON public.profiles;
CREATE TRIGGER protect_super_admin_profile_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_profile();

DROP TRIGGER IF EXISTS protect_super_admin_roles_trg ON public.user_roles;
CREATE TRIGGER protect_super_admin_roles_trg
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_roles();

-- Self-healing: ensure super admin always has admin role if the account exists
CREATE OR REPLACE FUNCTION public.ensure_super_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE public.is_super_admin_email(email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET is_active = true WHERE id = _uid AND is_active = false;
  END IF;
END; $$;

SELECT public.ensure_super_admin_role();
