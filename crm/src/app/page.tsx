"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Casca, ehListaDoDia } from "@/components/casca";
import { nomeCurto } from "@/components/alicerce/menu.ts";
import { ListaDoDia } from "@/components/leads/lista-do-dia";
import { ContatosDeParceirosNoInicio } from "@/components/inicio/contatos-de-parceiros";
import { Lista, ItemDaLista } from "@/components/alicerce/lista";
import { Cartao } from "@/components/alicerce/cartao";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { nomePerfil, type Team } from "@/lib/tipos";

export default function InicioPage() {
  const { pode } = useSessao();
  const lista = ehListaDoDia(pode);
  // Lista do dia (fase 1) e Início dos demais perfis (fase 2, bloco 2) estão no Alicerce.

  return (
    <Casca titulo={lista ? "Lista do dia" : "Início"} migrada>
      {lista ? <ListaDoDia /> : <Inicio />}
    </Casca>
  );
}

function Inicio() {
  const perfil = usePerfil();
  const { pode } = useSessao();
  const ehGG = perfil.perfil === "gerente_geral";
  const verLeads = pode("leads.atribuir") || pode("dados.ver_equipe") || pode("dados.ver_todos");

  return (
    <div className="pagina-alicerce inicio-pilha">
      <header className="mb-cabecalho">
        <div className="mb-cabecalho__texto">
          <h1 className="titulo-tela">Olá, {nomeCurto(perfil)}.</h1>
          <p className="mb-cabecalho__subtitulo">{nomePerfil(perfil.perfil)}</p>
        </div>
      </header>
      {pode("parceiros.cadastrar") && <ContatosDeParceirosNoInicio />}

      {ehGG || pode("usuarios.gerenciar") || pode("equipes.gerenciar") || verLeads ? (
        <section aria-labelledby="areas-inicio"><h2 id="areas-inicio" className="mb-sobrelinha">Acesse as áreas</h2><Lista cartao rotulo="Áreas do Vendas">
          {verLeads && (
            <Atalho
              href="/leads/"
              titulo={ehGG ? "Leads" : "Leads da equipe"}
              texto="Acompanhe os leads e distribua os da empresa."
            />
          )}
          {verLeads && (
            <Atalho
              href="/painel/"
              titulo="Painel da equipe"
              texto="Recebidos, perdas e conversão por corretor."
            />
          )}
          {verLeads && (
            <Atalho
              href="/vendas/"
              titulo={ehGG ? "Vendas" : "Vendas da equipe"}
              texto="Assinadas, pagas e pendentes por período."
            />
          )}
          {verLeads && (
            <Atalho
              href="/metas/"
              titulo={ehGG ? "Metas" : "Metas da equipe"}
              texto="Acumulado e ritmo para atingir a meta anual."
            />
          )}
          {pode("usuarios.gerenciar") && (
            <Atalho href="/usuarios/" titulo="Usuários" texto="Cadastre pessoas e defina perfil, equipe e situação." />
          )}
          {pode("equipes.gerenciar") && (
            <Atalho href="/equipes/" titulo="Equipes" texto="Crie equipes e escolha o gerente de cada uma." />
          )}
          {ehGG && (
            <Atalho href="/configuracoes/" titulo="Configurações" texto="Horário de atendimento, mensagens prontas e permissões de cada perfil." />
          )}
        </Lista></section>
      ) : null}

      {perfil.perfil === "gerente" && <MinhasEquipes gerenteId={perfil.id} />}
      {perfil.equipe_id && <MinhaEquipe equipeId={perfil.equipe_id} />}

      {!ehGG && !verLeads && <EstadoDePagina tipo="em-construcao" titulo="Esta área está em construção" texto="O Base360 Vendas está sendo montado por etapas. As próximas telas aparecem aqui nas próximas versões." />}
    </div>
  );
}

/** Lista.md:5-14: os atalhos são uma lista de áreas; a linha inteira abre o destino. */
function Atalho({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return <ItemDaLista titulo={<Link className="mb-lista__alvo" href={href}>{titulo}</Link>} meta={texto} />;
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
    <Cartao id="minha-equipe" titulo="Sua equipe">

      <p>{nome}</p>
    </Cartao>
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
        <Cartao key={e.id} id={`equipe-${e.id}`} titulo={e.nome} descricao="Sua equipe">


          <p>
            {e.membros.length ? e.membros.join(", ") : "Ainda sem corretores."}
          </p>
        </Cartao>
      ))}
    </>
  );
}
