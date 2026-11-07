"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { nomePerfil } from "@/lib/tipos";
import { useDistribuicao, useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { mostraBotao } from "@/lib/distribuicao";
import { AvisoConexao } from "./alicerce/aviso-conexao";
import { BarraSuperior } from "./alicerce/barra-superior";
import { CopiarDetalhes, EstadoDePagina, LinkDoEstado } from "./alicerce/estado-de-pagina";
import { MarcaBase360 } from "./alicerce/marca-base360";
import { MenuCelular } from "./alicerce/menu-celular";
import { MenuDaConta } from "./alicerce/menu-da-conta";
import { MenuLateral } from "./alicerce/menu-lateral";
import { ToastProvider } from "./alicerce/toast";
import { ATALHOS, ehListaDoDia, modulosDaPessoa, montarMenu } from "./alicerce/menu.ts";
import { BotaoRecebimento, FolhasDistribuicao } from "./distribuicao/recebimento";

export { ehListaDoDia };

/**
 * Página interna: exige login, monta o menu pelo perfil, checa a permissão da tela e põe a moldura do
 * Alicerce (MenuLateral, BarraSuperior e, no celular, MenuCelular).
 *
 * `migrada`: a página já está no Alicerce (item 48). Sem ela, o conteúdo fica dentro da ponte .ds-antigo e
 * leva o título antigo (h1); com ela, a Casca só entrega a moldura e a página cuida do próprio cabeçalho.
 * Cada tela que migra passa `migrada` (veja crm/src/app/alicerce-local.css e docs/design-system.md).
 */
export function Casca({
  titulo,
  exige,
  soGerenteGeral,
  migrada = false,
  children,
}: {
  titulo: string;
  exige?: string;
  soGerenteGeral?: boolean;
  migrada?: boolean;
  children: React.ReactNode;
}) {
  const { estado, pode, sair, recarregar } = useSessao();
  const router = useRouter();
  // A distribuição automática: um estado só para o app (lib/distribuicao-dados.ts).
  useDistribuicao(estado.fase === "pronto" ? estado.perfil.id : null);
  const dist = useDistribuicaoStore();

  useEffect(() => {
    if (estado.fase === "deslogado") router.replace("/entrar/");
  }, [estado.fase, router]);

  // Sem sessão pronta não há moldura (nem menu, nem perfil): a marca e o estado da conta, com as palavras do
  // Vocabulário (EstadosDePagina do Alicerce). O estado.mensagem técnico só vai em "Copiar detalhes para o suporte".
  if (estado.fase !== "pronto") {
    return (
      <main className="grid min-h-screen content-center justify-items-center gap-6 px-4 py-10">
        <MarcaBase360 modulo="Vendas" />
        {estado.fase === "sem-config" && <SemConfiguracao />}
        {estado.fase === "desativado" && (
          <EstadoDePagina
            tipo="desativado"
            titulo="Seu acesso ao Base360 foi desativado"
            texto="Se acha que é um engano, fale com o gerente geral."
            acoes={
              <button type="button" className="mb-botao mb-botao--discreto" onClick={sair}>
                Sair
              </button>
            }
          />
        )}
        {estado.fase === "erro" && (
          <EstadoDePagina
            tipo="erro-de-carga"
            titulo="Não foi possível carregar a sua conta"
            texto="Pode ser a internet ou o sistema. O que você já salvou continua salvo."
            acoes={
              <button type="button" className="mb-botao mb-botao--primario" onClick={() => void recarregar()}>
                Tentar de novo
              </button>
            }
            detalhe={<CopiarDetalhes codigo={estado.mensagem} />}
          />
        )}
        {(estado.fase === "carregando" || estado.fase === "deslogado") && (
          <div aria-busy="true">
            <span className="mb-visualmente-oculto">Carregando a sua conta…</span>
          </div>
        )}
        <AvisoConexao />
      </main>
    );
  }

  const ehGG = estado.perfil.perfil === "gerente_geral";
  const cfg = dist.config;
  const grupos = montarMenu({
    ehGG,
    pode,
    fila: {
      ligada: !!cfg?.ligada,
      recebeComFila: !!dist.estado?.recebe && !!cfg?.transparencia && cfg?.modo !== "gerentes",
      temEquipe: dist.temEquipe,
    },
  });
  const modulos = modulosDaPessoa(ehGG);
  // O + Novo lead é de quem pode abrir /leads/novo/ (cadastrar o próprio lead ou atribuir o da empresa).
  const novo = pode("leads.cadastrar") || pode("leads.atribuir") ? { href: "/leads/novo/", rotulo: "+ Novo lead" } : undefined;
  // O status do módulo: o recebimento de leads de hoje (some quando a pessoa não recebe).
  const temStatus = mostraBotao(dist.estado);
  const status = temStatus ? <BotaoRecebimento /> : undefined;
  const perfil = nomePerfil(estado.perfil.perfil);
  const equipe = dist.estado?.equipe_nome ?? null;

  const liberado = (!exige || pode(exige)) && (!soGerenteGeral || ehGG);

  return (
    <ToastProvider>
      <div className="mb-app">
        <MenuLateral modulo="Vendas" grupos={grupos} atalhos={ATALHOS} modulos={modulos} moduloAtual="vendas" />
        <div className="mb-app__principal">
          <BarraSuperior
            titulo={titulo}
            status={status}
            novo={novo}
            conta={<MenuDaConta nome={estado.perfil.nome} apelido={estado.perfil.apelido} perfil={perfil} equipe={equipe} onSair={sair} />}
          />
          <MenuCelular
            modulo="Vendas"
            grupos={grupos}
            atalhos={ATALHOS}
            modulos={modulos}
            moduloAtual="vendas"
            novo={novo}
            status={status}
            conta={{ nome: estado.perfil.nome, onSair: sair }}
          />
          <main className={migrada ? "mb-app__conteudo" : "mb-app__conteudo pb-16 pt-6"}>
            {!migrada && liberado && <h1 className="titulo-pagina mb-5">{titulo}</h1>}
            {liberado ? (
              migrada ? (
                children
              ) : (
                <div className="ds-antigo">{children}</div>
              )
            ) : (
              <EstadoDePagina
                tipo="sem-permissao"
                // O perfil que libera a página é uma permissão configurável: só o "soGerenteGeral" tem nome fixo.
                titulo={soGerenteGeral ? "Esta página é do perfil Gerente geral" : "Esta página não está liberada para o seu perfil"}
                texto="Peça o acesso ao gerente geral."
                acoes={<LinkDoEstado href="/">Voltar para o início</LinkDoEstado>}
              />
            )}
          </main>
          {/* Dentro da coluna principal: um filho solto do .mb-app viraria uma linha vazia da grade. */}
          <AvisoConexao />
        </div>
        <FolhasDistribuicao />
      </div>
    </ToastProvider>
  );
}

export function SemConfiguracao() {
  return (
    <EstadoDePagina
      tipo="erro-de-carga"
      titulo="Não foi possível abrir o Base360"
      texto="Este endereço ainda não está pronto para uso. Fale com o suporte."
      detalhe={<CopiarDetalhes codigo="Supabase não configurado: faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY neste build." />}
    />
  );
}
