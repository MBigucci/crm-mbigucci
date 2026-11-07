"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { nomePerfil } from "@/lib/tipos";
import { useDistribuicao, useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { mostraBotao } from "@/lib/distribuicao";
import { BarraSuperior } from "./alicerce/barra-superior";
import { MenuCelular } from "./alicerce/menu-celular";
import { MenuDaConta } from "./alicerce/menu-da-conta";
import { MenuLateral } from "./alicerce/menu-lateral";
import { ATALHOS, ehListaDoDia, modulosDaPessoa, montarMenu } from "./alicerce/menu.ts";
import { Cabecalho } from "./cabecalho";
import { AvisoOffline } from "./aviso-offline";
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
  const { estado, pode, sair } = useSessao();
  const router = useRouter();
  // A distribuição automática: um estado só para o app (lib/distribuicao-dados.ts).
  useDistribuicao(estado.fase === "pronto" ? estado.perfil.id : null);
  const dist = useDistribuicaoStore();

  useEffect(() => {
    if (estado.fase === "deslogado") router.replace("/entrar/");
  }, [estado.fase, router]);

  // .ds-antigo: a ponte do item 48 para o que ainda está no DS antigo (veja crm/src/app/alicerce-local.css).
  // Os estados de conta (passo d) ainda são do DS antigo; saem quando o passo d chegar.
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
          {!migrada && <h1 className="titulo-pagina mb-5">{titulo}</h1>}
          {liberado ? (
            migrada ? (
              children
            ) : (
              <div className="ds-antigo">{children}</div>
            )
          ) : (
            <div className="ds-antigo">
              <div className="card max-w-[520px]">
                <p>! Seu perfil não tem acesso a esta página.</p>
              </div>
            </div>
          )}
        </main>
        {/* Dentro da coluna principal: um filho solto do .mb-app viraria uma linha vazia da grade. */}
        <AvisoOffline />
      </div>
      <FolhasDistribuicao />
    </div>
  );
}

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
