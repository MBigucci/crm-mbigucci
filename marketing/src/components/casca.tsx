"use client";

// A moldura do Base360 Marketing no Alicerce. Segue crm/src/components/casca.tsx: MenuLateral, BarraSuperior e,
// no celular, MenuCelular, com o lockup "Base360 · Marketing" (prop modulo da MarcaBase360). O menu é um item só
// (Direcionador), do gerente geral.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { nomePerfil } from "@/lib/tipos";
import { MODULO_ATUAL, modulosDaPessoa, montarMenu } from "@/lib/menu-marketing";
import { AvisoConexao } from "./alicerce/aviso-conexao";
import { BarraSuperior } from "./alicerce/barra-superior";
import { CopiarDetalhes, EstadoDePagina } from "./alicerce/estado-de-pagina";
import { MarcaBase360 } from "./alicerce/marca-base360";
import { MenuCelular } from "./alicerce/menu-celular";
import { MenuDaConta } from "./alicerce/menu-da-conta";
import { MenuLateral } from "./alicerce/menu-lateral";
import { ToastProvider } from "./alicerce/toast";

const MODULO = "Marketing";

export function Casca({
  titulo,
  soGerenteGeral,
  novo,
  children,
}: {
  titulo: string;
  soGerenteGeral?: boolean;
  /** O + do módulo no topo (BarraSuperior) e no celular (MenuCelular). Só para quem pode criar. */
  novo?: { href: string; rotulo: string };
  children: React.ReactNode;
}) {
  const { estado, ehGerenteGeral, sair } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (estado.fase === "deslogado") router.replace("/entrar/");
  }, [estado.fase, router]);

  // Sem sessão pronta não há moldura: a marca e o estado da conta, com as palavras do Vocabulário.
  if (estado.fase !== "pronto") {
    return (
      <main className="mkt-solo">
        <MarcaBase360 modulo={MODULO} />
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
              <button type="button" className="mb-botao mb-botao--primario" onClick={() => window.location.reload()}>
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

  const grupos = montarMenu(ehGerenteGeral);
  const modulos = modulosDaPessoa(ehGerenteGeral);
  const liberado = !soGerenteGeral || ehGerenteGeral;
  const botaoNovo = liberado && ehGerenteGeral ? novo : undefined;
  const conta = estado.perfil;

  return (
    <ToastProvider>
      <div className="mb-app">
        <MenuLateral modulo={MODULO} grupos={grupos} atalhos={[]} modulos={modulos} moduloAtual={MODULO_ATUAL} />
        <div className="mb-app__principal">
          <BarraSuperior
            titulo={titulo}
            novo={botaoNovo}
            conta={<MenuDaConta nome={conta.nome} apelido={conta.apelido} perfil={nomePerfil(conta.perfil)} onSair={sair} />}
          />
          <MenuCelular
            modulo={MODULO}
            grupos={grupos}
            atalhos={[]}
            modulos={modulos}
            moduloAtual={MODULO_ATUAL}
            novo={botaoNovo}
            conta={{ nome: conta.nome, onSair: sair }}
          />
          <main className="mb-app__conteudo">
            {liberado ? (
              children
            ) : (
              <EstadoDePagina
                tipo="sem-permissao"
                titulo="Esta página é do perfil Gerente geral"
                texto="Peça o acesso ao gerente geral."
                // <a> comum, não o Link: o Vendas é um site irmão, fora do basePath do Marketing.
                acoes={
                  <a className="mb-botao mb-botao--secundario" href="/vendas/">
                    Voltar para o Base360 Vendas
                  </a>
                }
              />
            )}
          </main>
          {/* Dentro da coluna principal: um filho solto do .mb-app viraria uma linha vazia da grade. */}
          <AvisoConexao />
        </div>
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
