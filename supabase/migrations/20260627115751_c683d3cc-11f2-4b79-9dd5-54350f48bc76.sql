CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.profiles (id, email)
    SELECT u.id, u.email FROM auth.users u WHERE u.id = target_user_id
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_profiles (user_id) VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_bootstrap(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap(uuid) TO authenticated;