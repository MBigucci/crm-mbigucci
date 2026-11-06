"use client";

// Adaptado de crm/src/components/casca.tsx. O Marketing, nesta etapa, tem uma
// tela só: o Direcionador, só do gerente geral. Para os outros perfis, nem o
// item do menu nem a página mostram nada (o banco também não devolve nada).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";
import { BarraLateral, Cabecalho, type ItemMenu } from "./cabecalho";

export function Casca({
  titulo,
  eyebrow,
  soGerenteGeral,
  acao,
  children,
}: {
  titulo: string;
  eyebrow?: string;
  soGerenteGeral?: boolean;
  /** A ação principal da página, ao lado do título no computador. */
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { estado, ehGerenteGeral, sair } = useSessao();
  const router = useRouter();

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
              <p className="mt-2 text-ink-soft">A conta {estado.email} não está ativa no Base360. Fale com o gerente geral.</p>
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
          {(estado.fase === "carregando" || estado.fase === "deslogado") && <p className="text-concrete">Carregando…</p>}
        </main>
      </>
    );
  }

  const itens: ItemMenu[] = [];
  if (ehGerenteGeral) itens.push({ href: "/direcionador/", rotulo: "Direcionador", icone: "direcionador" });
  // Minha conta e Sair ficam no menu da conta (cabeçalho no computador, fim do menu no celular).
  const conta = { nome: estado.perfil.nome, apelido: estado.perfil.apelido, onSair: sair };
  const liberado = !soGerenteGeral || ehGerenteGeral;

  return (
    <>
      <Cabecalho itens={itens} conta={conta} />
      <BarraLateral itens={itens} />
      <div className="area-principal">
        <main className="mx-auto max-w-content px-4 pb-28 pt-5 sm:px-5 lg:pb-16 lg:pt-6">
          {liberado ? (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                  <h1 className="titulo-pagina mt-[3px]">{titulo}</h1>
                </div>
                {acao}
              </div>
              {children}
            </>
          ) : (
            <div className="card max-w-[520px]">
              <p>! Seu perfil não tem acesso a esta página.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export function SemConfiguracao() {
  return (
    <div className="card bar-brand max-w-[560px]">
      <h1 className="titulo-card">! Supabase não configurado</h1>
      <p className="mt-2 text-ink-soft">
        Este build foi gerado sem NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Preencha as variáveis e gere
        o build de novo.
      </p>
    </div>
  );
}
