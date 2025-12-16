-- Garante que o bucket 'course-covers' existe
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

-- Remove políticas conflitantes caso existam (para evitar erros ao rodar novamente)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Update" on storage.objects;

-- Política de Visualização (Pública)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'course-covers' );

-- Política de Upload (Apenas Autenticados)
create policy "Authenticated Upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'course-covers' );

-- Política de Atualização (Apenas Autenticados)
create policy "Authenticated Update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'course-covers' );