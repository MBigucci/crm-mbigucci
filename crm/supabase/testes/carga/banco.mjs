// Postgres local para o teste de carga (embedded-postgres, só em localhost).
// Imita o que o Supabase tem e o schema usa: os papéis anon, authenticated e
// service_role, o schema auth com auth.users e auth.uid(), e o limite de 60
// conexões diretas do compute MICRO. Nada aqui fala com o Supabase de produção.
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const pasta = new URL("./.local/", import.meta.url);
const dados = new URL("./pg", pasta);
const arquivoSenha = new URL("./senha-local.txt", pasta);
export const PORTA = Number(process.env.CARGA_PORTA ?? 54329);
export const BANCO = "crm_carga";
export const MAX_CONEXOES = Number(process.env.CARGA_MAX_CONEXOES ?? 60);

const caminho = (u) => decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, "$1");

function senhaLocal() {
  mkdirSync(caminho(pasta), { recursive: true });
  if (!existsSync(arquivoSenha)) writeFileSync(arquivoSenha, randomBytes(18).toString("base64url"));
  return readFileSync(arquivoSenha, "utf8").trim();
}

export const conexao = () => ({ host: "127.0.0.1", port: PORTA, user: "postgres", password: senhaLocal(), database: BANCO });

/** Sobe o Postgres local (cria a pasta de dados na primeira vez). */
export async function subir() {
  const novo = !existsSync(caminho(dados));
  const servidor = new EmbeddedPostgres({
    databaseDir: caminho(dados),
    user: "postgres",
    password: senhaLocal(),
    port: PORTA,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: (e) => process.stderr.write(String(e)),
    postgresFlags: ["-c", `max_connections=${MAX_CONEXOES}`, "-c", "shared_buffers=128MB", "-c", "listen_addresses=127.0.0.1",
                    "-c", "deadlock_timeout=200ms", "-c", "log_lock_waits=off"],
  });
  if (novo) await servidor.initialise();
  await servidor.start();
  return servidor;
}

/** Banco novo: papéis e auth do Supabase, schema.sql e o SQL do Storage. */
export async function recriarBanco() {
  const admin = new pg.Client({ ...conexao(), database: "postgres" });
  await admin.connect();
  await admin.query(`drop database if exists ${BANCO} with (force)`);
  await admin.query(`create database ${BANCO} encoding 'UTF8' template template0`);
  await admin.query(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$`);
  await admin.end();

  const c = new pg.Client(conexao());
  await c.connect();
  await c.query(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    -- Como no Supabase: o PostgREST põe o JWT em request.jwt.claims (e o sub em request.jwt.claim.sub).
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
      name text, owner uuid default auth.uid(), created_at timestamptz default now());
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  const sql = (nome) => readFileSync(new URL(`../../${nome}`, import.meta.url), "utf8");
  // CARGA_SCHEMA: outro schema (por exemplo, o de antes de uma correção, para comparar).
  await c.query(process.env.CARGA_SCHEMA ? readFileSync(process.env.CARGA_SCHEMA, "utf8") : sql("schema.sql"));
  await c.query(sql("storage-documentos.sql"));
  await c.end();
}
