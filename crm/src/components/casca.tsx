"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { BarraLateral, Cabecalho, type ItemMenu } from "./cabecalho";
import { BotaoRecebimento, FolhasDistribuicao } from "./distribuicao/recebimento";
import { useDistribuicao, useDistribuicaoStore } from "@/lib/distribuicao-dados";

/** Página interna: exige login, monta o menu pelo perfil e checa a permissão da tela. */
export function Casca({
  titulo,
  exige,
  soGerenteGeral,
  children,
}: {
  titulo: string;
  exige?: string;
  soGerenteGeral?: boolean;
  children: React.ReactNode;
}) {
  const { estado, pode, sair } = useSessao();
  const router = useRouter();
  // A distribuição automática: um estado só para o app (lib/distribuicao-dados.ts).
  useDistribuicao(estado.fase === "pronto" ? estado.perfil.id : null);
  const dist = useDistribuicaoStore();

  useEffect(() => {
    if (estado.fase === "deslogado") router.replace("/entrar/");
  }, [estado.fase, router]);

  // .ds-antigo: a ponte do item 48 para o que ainda está no DS antigo (veja crm/src/app/alicerce-local.css).
  // Sai quando a tela migra para o Alicerce.
  if (estado.fase !== "pronto") {
    return (
      <div className="ds-antigo">
        <Cabecalho />
        <main className="mx-auto max-w-content px-5 py-8">
          {estado.fase === "sem-config" && <SemConfiguracao />}
          {estado.fase === "desativado" && (
            <div className="card bar-brand max-w-[520px]">
              <h1 className="titulo-card">! Conta desativada</h1>
              <p className="mt-2 text-ink-soft">
                A conta {estado.email} não está ativa no Base360 Vendas. Fale com o gerente geral.
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
      </div>
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
  // Simulador, Site MBigucci e Linktree são atalhos do cabeçalho (ATALHOS em cabecalho.tsx).
  // Tela só do gerente geral, por regra fixa no banco (não é permissão do catálogo).
  if (ehGG) itens.push({ href: "/faixas/", rotulo: "Faixas de VGV" });
  // Programa de pontuação: pelas permissões (o banco filtra o resto).
  if (ehGG) itens.push({ href: "/programa/", rotulo: "Pontos" });
  if (pode("plantao.registrar") || pode("lancamentos.registrar")) itens.push({ href: "/plantao/", rotulo: "Plantão" });
  if (pode("plantao.atendimentos")) itens.push({ href: "/recepcao/", rotulo: "Recepção" });
  // Parcerias: pelas permissões do catálogo (o banco filtra quais parceiros cada um vê).
  if (pode("parceiros.cadastrar") || pode("parceiros.ver_todos")) itens.push({ href: "/parceiros/", rotulo: "Parceiros" });
  if (!ehGG && pode("leads.cadastrar")) itens.push({ href: "/meus-pontos/", rotulo: "Meus pontos" });
  itens.push({ href: "/ranking/", rotulo: "Ranking" });
  if (pode("usuarios.gerenciar")) itens.push({ href: "/usuarios/", rotulo: "Usuários" });
  if (pode("equipes.gerenciar")) itens.push({ href: "/equipes/", rotulo: "Equipes" });
  // Distribuição automática: a Fila de leads para quem recebe (com a fila visível), para o gerente
  // com equipe e para o gerente geral; a página das chaves só para o gerente geral.
  const cfg = dist.config;
  const recebeComFila = !!dist.estado?.recebe && !!cfg?.transparencia && cfg?.modo !== "gerentes";
  if (cfg?.ligada && (recebeComFila || dist.temEquipe || ehGG)) itens.push({ href: "/fila/", rotulo: "Fila de leads" });
  if (ehGG && cfg) itens.push({ href: "/distribuicao/", rotulo: "Distribuição" });
  if (ehGG) itens.push({ href: "/configuracoes/", rotulo: "Configurações" });
  // Minha conta e Sair ficam no menu da conta (cabeçalho no computador, fim do menu no celular).
  const conta = { nome: estado.perfil.nome, apelido: estado.perfil.apelido, onSair: sair };

  const liberado = (!exige || pode(exige)) && (!soGerenteGeral || ehGG);

  return (
    <div className="ds-antigo">
      <Cabecalho itens={itens} conta={conta} extra={<BotaoRecebimento />} />
      <FolhasDistribuicao />
      <BarraLateral itens={itens} />
      <div className="area-principal">
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
      </div>
    </div>
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
