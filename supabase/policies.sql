-- Row Level Security for the Craft menu app.
-- Visitors (anon) can only READ the menu. Only a signed-in admin (Supabase Auth user)
-- can create / change / delete. Run in the Supabase SQL editor.

alter table public.categories enable row level security;
alter table public.products   enable row level security;

-- public read
drop policy if exists "menu is public"       on public.categories;
drop policy if exists "menu is public"       on public.products;
create policy "menu is public" on public.categories for select to anon, authenticated using (true);
create policy "menu is public" on public.products   for select to anon, authenticated using (true);

-- admin write (authenticated role only; keep public sign-ups OFF in Auth settings)
drop policy if exists "admin writes" on public.categories;
drop policy if exists "admin writes" on public.products;
create policy "admin writes" on public.categories for all to authenticated using (true) with check (true);
create policy "admin writes" on public.products   for all to authenticated using (true) with check (true);

-- images bucket: public read, admin write
drop policy if exists "product images are public" on storage.objects;
drop policy if exists "admin manages product images" on storage.objects;
create policy "product images are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "admin manages product images" on storage.objects
  for all to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
