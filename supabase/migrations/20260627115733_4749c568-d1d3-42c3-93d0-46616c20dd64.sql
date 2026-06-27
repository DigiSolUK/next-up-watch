UPDATE public.media_titles SET external_id='tv-79696' WHERE id='af3b1d72-f9ad-49de-a555-fd4cf35331c8';
UPDATE public.media_titles SET external_id='movie-278' WHERE id='ade94fdc-21bf-456b-8237-493d887b40e4';
UPDATE public.media_titles SET cast_members='{}' WHERE id='163168eb-09a5-429d-a1f1-e1d2a6e934bd';
UPDATE public.media_titles SET
  title='Westworld',
  poster_url=COALESCE('https://image.tmdb.org/t/p/w780/ALlSU9du9iRiKIIoY1sREGNqQ5.jpg', poster_url),
  description='A dark odyssey about the dawn of artificial consciousness and the evolution of sin. Set at the intersection of the near future and the reimagined past, it explores a world in which every human appetite, no matter how noble or depraved, can be indulged.',
  release_year=2016,
  genres='{"Sci-Fi & Fantasy","Western"}',
  cast_members='{"Evan Rachel Wood","Thandiwe Newton","Jeffrey Wright","Tessa Thompson","Aaron Paul","James Marsden"}',
  rating=8,
  external_source='tmdb',
  external_id='tv-63247'
WHERE id='940a6c49-5ec5-4a37-8cd7-8bec701663e1';
UPDATE public.media_titles SET
  title='True Detective',
  poster_url='https://image.tmdb.org/t/p/w780/dC7jkj2g1aU8sxKqM6D4g44xA6w.jpg',
  description='An American anthology police detective series utilizing multiple timelines in which investigations seem to unearth personal and professional secrets of those involved, both within or outside the law.',
  release_year=2014,
  genres='{"Drama","Mystery"}',
  cast_members='{"Jodie Foster","Kali Reis","Fiona Shaw","Finn Bennett","Isabella Star LaBlanc","John Hawkes"}',
  rating=8.3,
  external_source='tmdb',
  external_id='tv-46648'
WHERE id='e201d1f7-928c-443f-b8a3-c1f9cabafa23';

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
    SELECT u.id, u.email FROM auth.users u WHERE u.id = target_user_id
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_profiles (user_id) VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap(uuid) TO authenticated;