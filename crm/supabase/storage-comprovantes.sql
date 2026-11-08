-- Rode depois de schema.sql. Bucket privado; imagens JPEG já reduzidas no aparelho.
-- Sem sobrescrita. A remoção só limpa arquivos órfãos, preservando a auditoria.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "comprovantes: dono e gerente geral leem" on storage.objects;
create policy "comprovantes: dono e gerente geral leem" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and public.pode_ler_comprovante(name));
drop policy if exists "comprovantes: dono envia" on storage.objects;
create policy "comprovantes: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.pode_enviar_comprovante(name));
drop policy if exists "comprovantes: dono limpa orfaos" on storage.objects;
create policy "comprovantes: dono limpa orfaos" on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and public.pode_remover_comprovante(name));
