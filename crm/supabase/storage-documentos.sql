-- =====================================================================
-- CRM MBigucci — bucket dos documentos do lead (item 16)
--
-- Rode depois do schema.sql: SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo: não duplica nada.
-- Cria o bucket privado "lead-documentos" (10 MB por arquivo, só PDF e foto)
-- e as policies do Storage, que usam as mesmas funções da tabela
-- lead_documentos (schema.sql): lê quem vê o lead (pode_ver_dados_de do dono),
-- envia o dono do lead ativo e remove o dono. Sem policy de update: um
-- arquivo nunca é sobrescrito. Regras em docs/leads.md, seção 17.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-documentos', 'lead-documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lead-documentos: quem ve o lead le" on storage.objects;
create policy "lead-documentos: quem ve o lead le" on storage.objects
  for select to authenticated
  using (bucket_id = 'lead-documentos' and public.pode_ver_documento(name));

drop policy if exists "lead-documentos: o dono envia" on storage.objects;
create policy "lead-documentos: o dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lead-documentos' and public.pode_enviar_documento(name));

drop policy if exists "lead-documentos: o dono remove" on storage.objects;
create policy "lead-documentos: o dono remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lead-documentos' and public.pode_remover_documento(name));
