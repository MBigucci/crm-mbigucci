"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { useEstadoPrograma } from "@/lib/programa-dados";
import { Cabecalho, type ItemMenu } from "./cabecalho";

/** Página interna: exige login, monta o menu pelo perfil e checa a permissão da tela. */
export function Casca({
  titulo,
  exige,
  soGerenteGeral,
  programa,
  children,
}: {
  titulo: string;
  exige?: string;
  soGerenteGeral?: boolean;
  /** Tela do programa sigiloso: para quem não é gerente geral, só com a chave ligada. */
  programa?: boolean;
  children: React.ReactNode;
}) {
  const { estado, pode, sair } = useSessao();
  const router = useRouter();
  const prog = useEstadoPrograma(estado.fase === "pronto" ? estado.perfil.id : null);

  useEffect(() => {
    if (estado.fase === "deslogado") router.replace("/entrar/");
  }, [estado.fase, router]);

  if (estado.fase !== "pronto") {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto max-w-content px-5 py-8">
          {estado.fase === "sem-config" && <SemConfiguracao />}
          {estado.fase === "desativado" && (
            <div className="card bar-brand max-w-[520px]">
              <h1 className="titulo-card">! Conta desativada</h1>
              <p className="mt-2 text-ink-soft">
                A conta {estado.email} não está ativa no CRM. Fale com o gerente geral.
              </p>
              <button type="button" className="btn btn-ghost focus-ring mt-4" onClick={sair}>
                Sair
              </button>
            </div>
          )}
          {estado.fase === "erro" && (
            <div className="card bar-brand max-w-[520px]">
              <h1 className="titulo-card">! Não foi possível carregar sua conta</h1>
              <p className="mt-2 text-ink-soft">{estado.mensagem}</p>
            </div>
          )}
          {(estado.fase === "carregando" || estado.fase === "deslogado") && (
            <p className="text-concrete">Carregando…</p>
          )}
        </main>
      </>
    );
  }

  const ehGG = estado.perfil.perfil === "gerente_geral";
  const itens: ItemMenu[] = [{ href: "/", rotulo: ehListaDoDia(pode) ? "Lista do dia" : "Início" }];
  if (pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos")) {
    itens.push({ href: "/leads/", rotulo: "Leads" });
    itens.push({ href: "/leads/quadro/", rotulo: "Quadro" });
    itens.push({ href: "/agenda/", rotulo: "Agenda" });
    itens.push({ href: "/painel/", rotulo: "Painel" });
    itens.push({ href: "/vendas/", rotulo: "Vendas" });
    itens.push({ href: "/metas/", rotulo: "Metas" });
  }
  // O catálogo é lido por todo usuário ativo.
  itens.push({ href: "/empreendimentos/", rotulo: "Empreendimentos" });
  // Tela só do gerente geral, por regra fixa no banco (não é permissão do catálogo).
  if (ehGG) itens.push({ href: "/faixas/", rotulo: "Faixas de VGV" });
  // Programa sigiloso: o gerente geral sempre; os demais só com a chave ligada
  // (o banco também não entrega nada a eles com ela desligada).
  const veProg = ehGG || prog.ativo;
  if (ehGG) itens.push({ href: "/programa/", rotulo: "Pontos" });
  if (veProg && (pode("plantao.registrar") || pode("lancamentos.registrar"))) itens.push({ href: "/plantao/", rotulo: "Plantão" });
  if (prog.ativo && !ehGG && pode("leads.cadastrar")) itens.push({ href: "/meus-pontos/", rotulo: "Meus pontos" });
  if (veProg) itens.push({ href: "/ranking/", rotulo: "Ranking" });
  if (pode("usuarios.gerenciar")) itens.push({ href: "/usuarios/", rotulo: "Usuários" });
  if (pode("equipes.gerenciar")) itens.push({ href: "/equipes/", rotulo: "Equipes" });
  if (ehGG) itens.push({ href: "/configuracoes/", rotulo: "Configurações" });
  itens.push({ href: "/conta/", rotulo: "Minha conta" });

  if (programa && !ehGG && !prog.carregado) {
    return (
      <>
        <Cabecalho itens={itens} onSair={sair} nome={estado.perfil.nome} />
        <main className="mx-auto max-w-content px-5 py-8">
          <p className="text-concrete">Carregando…</p>
        </main>
      </>
    );
  }
  const liberado = (!exige || pode(exige)) && (!soGerenteGeral || ehGG) && (!programa || veProg);

  return (
    <>
      <Cabecalho itens={itens} onSair={sair} nome={estado.perfil.nome} />
      <main className="mx-auto max-w-content px-5 pb-16 pt-6">
        <h1 className="titulo-pagina mb-5">{titulo}</h1>
        {liberado ? (
          children
        ) : (
          <div className="card max-w-[520px]">
            <p>! Seu perfil não tem acesso a esta página.</p>
          </div>
        )}
      </main>
    </>
  );
}

/**
 * A lista do dia é o início de quem trabalha os próprios leads e não distribui
 * leads (o corretor, no padrão). Quem distribui fica com o painel.
 */
export const ehListaDoDia = (pode: (p: string) => boolean) => pode("leads.cadastrar") && !pode("leads.atribuir");

export function SemConfiguracao() {
  return (
    <div className="card bar-brand max-w-[560px]">
      <h1 className="titulo-card">! Supabase não configurado</h1>
      <p className="mt-2 text-ink-soft">
        Este build foi gerado sem NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Preencha o
        arquivo .env.local e rode npm run build de novo (veja o README).
      </p>
    </div>
  );
}
