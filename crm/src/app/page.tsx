"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Casca, ehListaDoDia } from "@/components/casca";
import { ListaDoDia } from "@/components/leads/lista-do-dia";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { nomePerfil, type Team } from "@/lib/tipos";

export default function InicioPage() {
  const { pode } = useSessao();
  const lista = ehListaDoDia(pode);
  return <Casca titulo={lista ? "Lista do dia" : "Início"}>{lista ? <ListaDoDia /> : <Inicio />}</Casca>;
}

function Inicio() {
  const perfil = usePerfil();
  const { pode } = useSessao();
  const ehGG = perfil.perfil === "gerente_geral";
  const verLeads = pode("leads.atribuir") || pode("dados.ver_equipe") || pode("dados.ver_todos");

  return (
    <div className="grid gap-4">
      <div>
        <span className="eyebrow">{nomePerfil(perfil.perfil)}</span>
        <p className="mt-1 text-[16px]">Olá, {perfil.nome.split(" ")[0] || perfil.nome}.</p>
      </div>

      {ehGG || pode("usuarios.gerenciar") || pode("equipes.gerenciar") || verLeads ? (
        <div className="grid gap-4 md:grid-cols-3">
          {verLeads && (
            <Atalho
              href="/leads/"
              titulo={ehGG ? "Leads" : "Leads da equipe"}
              texto="Acompanhe os leads e atribua os leads da empresa aos corretores."
            />
          )}
          {verLeads && (
            <Atalho
              href="/painel/"
              titulo="Painel da equipe"
              texto="Recebidos, perdidos, descartes e funil por corretor, no dia, na semana ou no mês. Dá para imprimir."
            />
          )}
          {pode("usuarios.gerenciar") && (
            <Atalho href="/usuarios/" titulo="Usuários" texto="Cadastre pessoas e defina perfil, equipe e situação." />
          )}
          {pode("equipes.gerenciar") && (
            <Atalho href="/equipes/" titulo="Equipes" texto="Crie equipes e escolha o gerente de cada uma." />
          )}
          {ehGG && (
            <Atalho href="/configuracoes/" titulo="Configurações" texto="Chaves do sistema e permissões de cada perfil." />
          )}
        </div>
      ) : null}

      {perfil.perfil === "gerente" && <MinhasEquipes gerenteId={perfil.id} />}
      {perfil.equipe_id && <MinhaEquipe equipeId={perfil.equipe_id} />}

      {!ehGG && !verLeads && (
        <div className="card">
          <h2 className="titulo-card">Em construção</h2>
          <p className="mt-2 text-ink-soft">
            O CRM está sendo montado por etapas. As próximas telas aparecem aqui nas próximas versões.
          </p>
        </div>
      )}
    </div>
  );
}

function Atalho({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return (
    <Link href={href} className="card focus-ring block transition-colors hover:border-ink">
      <h2 className="titulo-card">{titulo}</h2>
      <p className="mt-2 text-ink-soft">{texto}</p>
      <span className="link-acao mt-3 inline-block text-[13px]">Abrir</span>
    </Link>
  );
}

function MinhaEquipe({ equipeId }: { equipeId: string }) {
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => {
    db()
      .from("teams")
      .select("nome")
      .eq("id", equipeId)
      .maybeSingle<{ nome: string }>()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [equipeId]);
  if (!nome) return null;
  return (
    <div className="card">
      <span className="eyebrow">Sua equipe</span>
      <p className="titulo-card mt-1">{nome}</p>
    </div>
  );
}

function MinhasEquipes({ gerenteId }: { gerenteId: string }) {
  const [equipes, setEquipes] = useState<(Team & { membros: string[] })[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        db().from("teams").select("id, nome, gerente_id").eq("gerente_id", gerenteId).order("nome"),
        db().from("profiles").select("nome, equipe_id").eq("ativo", true).order("nome"),
      ]);
      setEquipes(
        ((t ?? []) as Team[]).map((e) => ({
          ...e,
          membros: (p ?? []).filter((m) => m.equipe_id === e.id).map((m) => m.nome as string),
        })),
      );
    })();
  }, [gerenteId]);
  if (!equipes.length) return null;
  return (
    <>
      {equipes.map((e) => (
        <div key={e.id} className="card">
          <span className="eyebrow">Sua equipe</span>
          <p className="titulo-card mt-1">{e.nome}</p>
          <p className="mt-2 text-ink-soft">
            {e.membros.length ? e.membros.join(", ") : "Ainda sem corretores."}
          </p>
        </div>
      ))}
    </>
  );
}
