-- SPREZZA — mise en place de la synchronisation (à exécuter une fois dans Supabase › SQL Editor › New query › Run).
-- Sécurité : Row Level Security (RLS) — chaque compte ne peut lire, écrire ou supprimer QUE ses propres lignes et photos.

-- 1. Table des enregistrements synchronisés -------------------------------------------------
create table if not exists public.sprezza_records (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  store      text        not null,
  key        text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  synced_at  timestamptz not null default now(),
  primary key (user_id, store, key)
);
create index if not exists sprezza_records_user_synced on public.sprezza_records (user_id, synced_at);

-- Horodatage serveur à chaque écriture (sert à récupérer les changements, indépendamment des horloges des appareils)
create or replace function public.sprezza_touch() returns trigger language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists sprezza_touch on public.sprezza_records;
create trigger sprezza_touch before insert or update on public.sprezza_records
  for each row execute function public.sprezza_touch();

-- Accès via l'API (nécessaire si « Grant API access to new tables automatically » est décoché) ; RLS reste le garde-fou.
revoke all on public.sprezza_records from anon;
grant select, insert, update, delete on public.sprezza_records to authenticated;

alter table public.sprezza_records enable row level security;
drop policy if exists "sprezza: lecture de mes données" on public.sprezza_records;
drop policy if exists "sprezza: ajout de mes données" on public.sprezza_records;
drop policy if exists "sprezza: modification de mes données" on public.sprezza_records;
drop policy if exists "sprezza: suppression de mes données" on public.sprezza_records;
create policy "sprezza: lecture de mes données"      on public.sprezza_records for select to authenticated using (user_id = auth.uid());
create policy "sprezza: ajout de mes données"        on public.sprezza_records for insert to authenticated with check (user_id = auth.uid());
create policy "sprezza: modification de mes données" on public.sprezza_records for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sprezza: suppression de mes données"  on public.sprezza_records for delete to authenticated using (user_id = auth.uid());

-- 2. Stockage privé des photos (dossier = identifiant du compte) ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sprezza-photos', 'sprezza-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sprezza photos: lecture" on storage.objects;
drop policy if exists "sprezza photos: ajout" on storage.objects;
drop policy if exists "sprezza photos: modification" on storage.objects;
drop policy if exists "sprezza photos: suppression" on storage.objects;
create policy "sprezza photos: lecture" on storage.objects for select to authenticated
  using (bucket_id = 'sprezza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sprezza photos: ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'sprezza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sprezza photos: modification" on storage.objects for update to authenticated
  using (bucket_id = 'sprezza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sprezza photos: suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'sprezza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
