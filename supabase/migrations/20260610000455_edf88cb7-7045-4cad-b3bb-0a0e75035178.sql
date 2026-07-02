
-- Super admin email constante
CREATE OR REPLACE FUNCTION public.is_super_admin_email(_email TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(_email) = 'serviciosalanis.noreply@gmail.com'
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_email(text) FROM PUBLIC, anon;

-- Trigger handle_new_user actualizado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Cliente por defecto
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente')
  ON CONFLICT DO NOTHING;

  -- Super admin automático
  IF public.is_super_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Si el usuario quiere registrarse también como profesional, lo hará vía el flujo de la app.
-- Proteger al super admin: nadie puede borrar/cambiar sus roles
CREATE OR REPLACE FUNCTION public.protect_super_admin_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = COALESCE(OLD.user_id, NEW.user_id);
  IF public.is_super_admin_email(_email) THEN
    IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot remove admin role from super admin';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'Cannot modify admin role of super admin';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_roles() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON public.user_roles;
CREATE TRIGGER trg_protect_super_admin
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_roles();

-- Función auxiliar: comprobar si el usuario actual es super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = _user_id AND public.is_super_admin_email(u.email)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;

-- Proteger profile del super admin de desactivación
CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.id;
  IF public.is_super_admin_email(_email) AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Cannot deactivate super admin profile';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_super_admin_profile ON public.profiles;
CREATE TRIGGER trg_protect_super_admin_profile
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_profile();

-- Si el super admin ya existe en auth.users (caso de pre-registro), asegurar su rol ahora
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE public.is_super_admin_email(u.email)
ON CONFLICT DO NOTHING;
