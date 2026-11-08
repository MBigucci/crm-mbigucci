"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavegadorDePeriodo } from "@/components/alicerce/navegador-de-periodo";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { ErroPainel } from "@/components/painel/partes";
import { Casca } from "@/components/casca";
import { CartaoMetaAnual, MetasDoCorretor, TabelaMetaAnual } from "@/components/metas/metas";
import { usePerfil, useSessao } from "@/lib/sessao";
import { useCorretores, type Corretor } from "@/lib/leads-dados";
import { META_VGV_PADRAO, metaAnualDe, type MetaVgv } from "@/lib/metas";
import { formatarReais, lerReais } from "@/lib/vendas";
import { excluirMetaVgv, salvarMetaVgv, useMetasVgv, useVendasDoAno } from "@/lib/vendas-dados";

export default function MetasPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca migrada titulo={veOutros ? "Metas da equipe" : "Minhas metas"}>
      <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><h1 className="titulo-tela">{veOutros ? "Metas da equipe" : "Minhas metas"}</h1></div></header>
      <Suspense fallback={<CarregandoTabela texto="Carregando metas…" />}>
        <Metas />
      </Suspense>
    </Casca>
  );
}

function Metas() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const cadastra = pode("leads.cadastrar");
  const define = pode("metas.definir_vgv");
  const sp = useSearchParams();
  const router = useRouter();
  const hoje = new Date().getFullYear();
  const ano = /^\d{4}$/.test(sp.get("a") ?? "") ? Number(sp.get("a")) : hoje;
  const { linhas, recarregar } = useMetasVgv(ano);
  const { vendas, erro } = useVendasDoAno(ano, veOutros ? null : eu.id);
  const corretores = useCorretores(veOutros || define);

  if (!veOutros && !cadastra && !define) return <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." />;

  const irAno = (a: number) => { const q = new URLSearchParams(sp.toString()); if (a === hoje) q.delete("a"); else q.set("a", String(a)); router.replace("/metas/?" + q.toString(), { scroll: false }); };

  return (
    <div className="pmr-pilha">
      <NavegadorDePeriodo nome="Ano das metas" rotulo={String(ano)} aoAnterior={() => irAno(ano - 1)} aoSeguinte={() => irAno(ano + 1)} aoVoltar={ano === hoje ? undefined : () => irAno(hoje)} />

      {erro && <ErroPainel erro={erro} />}
      {(!linhas || (!vendas && !erro)) && <CarregandoTabela texto="Carregando metas…" />}
      {linhas && vendas && !veOutros && cadastra && (
        <CartaoMetaAnual corretor={eu.id} ano={ano} linhas={linhas} vendas={vendas} proprio />
      )}
      {linhas && vendas && veOutros && corretores.length > 0 && (
        <TabelaMetaAnual
          corretores={corretores.map((c) => c.id)}
          nomes={new Map(corretores.map((c) => [c.id, c.nome]))}
          ano={ano}
          linhas={linhas}
          vendas={vendas}
          abrir={(id) => router.push(`/painel/?c=${id}`)}
        />
      )}
      {linhas && veOutros && !corretores.length && <EstadoVazio titulo="Nenhum corretor na equipe" texto="As metas aparecem quando houver corretores na equipe." />}

      {linhas && define && <DefinirMetas ano={ano} linhas={linhas} corretores={corretores} onSalvo={recarregar} />}

      {cadastra && !veOutros && <MetasDoCorretor corretor={eu.id} editavel />}
    </div>
  );
}

/** O gerente geral define o valor geral do ano e, se quiser, um valor por corretor. */
function DefinirMetas({
  ano,
  linhas,
  corretores,
  onSalvo,
}: {
  ano: number;
  linhas: MetaVgv[];
  corretores: Corretor[];
  onSalvo: () => void;
}) {
  const geral = linhas.find((l) => l.corretor_id === null);
  return (
    <section className="mb-cartao" aria-labelledby="definir-metas">
      <div className="mb-cartao__cabecalho">
        <div><h2 id="definir-metas" className="mb-cartao__titulo">
          Definir a meta anual de VGV · <span className="num">{ano}</span>
        </h2>
        <p className="mt-1 mb-cartao__descricao">
          O valor geral vale para todos os corretores. Sem valor geral, vale o padrão de {formatarReais(META_VGV_PADRAO)}. O
          valor de um corretor substitui o geral só para ele.
        </p>
        </div>
      </div>
      <div className="mb-cartao__corpo pmr-pilha"><LinhaMeta
        id="meta-geral"
        rotulo="Valor geral do ano"
        atual={geral ? Number(geral.valor) : META_VGV_PADRAO}
        nota={geral ? "Definido" : "Padrão"}
        onSalvar={async (v) => salvarMetaVgv(ano, null, v, geral)}
        onVoltar={geral ? async () => excluirMetaVgv(geral.id) : undefined}
        rotuloVoltar={`Voltar ao padrão de ${formatarReais(META_VGV_PADRAO)}`}
        onSalvo={onSalvo}
      />
      {corretores.length > 0 && (
        <details className="mb-recolhivel">
          <summary >
            Valor por corretor
          </summary>
          <ul className="mb-recolhivel__corpo pmr-pilha">
            {corretores.map((c) => {
              const propria = linhas.find((l) => l.corretor_id === c.id);
              const m = metaAnualDe(c.id, ano, linhas);
              return (
                <li key={c.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <LinhaMeta
                    id={`meta-${c.id}`}
                    rotulo={c.nome}
                    atual={m.valor}
                    nota={propria ? "Valor próprio" : "Usa o geral"}
                    onSalvar={async (v) => salvarMetaVgv(ano, c.id, v, propria)}
                    onVoltar={propria ? async () => excluirMetaVgv(propria.id) : undefined}
                    rotuloVoltar="Usar o valor geral"
                    onSalvo={onSalvo}
                  />
                </li>
              );
            })}
          </ul>
        </details>
      )}
      </div>
    </section>
  );
}

function LinhaMeta({
  id,
  rotulo,
  atual,
  nota,
  onSalvar,
  onVoltar,
  rotuloVoltar,
  onSalvo,
}: {
  id: string;
  rotulo: string;
  atual: number;
  nota: string;
  onSalvar: (v: number) => Promise<string | null>;
  onVoltar?: () => Promise<string | null>;
  rotuloVoltar: string;
  onSalvo: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const toast = useToast();
  async function executar(acao: () => Promise<string | null>) {
    setOcupado(true); setErro(null);
    const e = await acao(); setOcupado(false);
    if (e) { setErro("Não foi possível salvar. Confira a conexão e tente novamente."); return; }
    setTexto(""); onSalvo(); toast.mostrar("Meta anual salva.", { tipo: "sucesso" });
  }
  return <form className="pmr-pilha" noValidate onSubmit={(e) => {
    e.preventDefault(); const v = lerReais(texto);
    if (!v) { setErro("Confira o valor: só números, como 10.000.000."); (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus(); return; }
    void executar(() => onSalvar(v));
  }}>
    <Campo rotulo={rotulo} ajuda={formatarReais(atual) + " · " + nota} erro={erro} idErro={id + "-erro"}>
      <span className="mb-campo__grupo"><span className="mb-campo__afixo">R$</span><input id={id} className="mb-campo__entrada mb-campo__entrada--num" inputMode="decimal" placeholder={atual.toLocaleString("pt-BR")} value={texto} onChange={(e) => setTexto(e.target.value)} aria-invalid={!!erro} aria-describedby={erro ? id + "-erro" : undefined} /></span>
    </Campo>
    <div className="mb-grupo-botoes">{onVoltar && <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado} onClick={() => void executar(onVoltar)}>{rotuloVoltar}</button>}{texto !== "" && <button type="submit" className="mb-botao mb-botao--primario" disabled={ocupado} aria-busy={ocupado}>{ocupado ? "Salvando…" : "Salvar meta anual"}</button>}</div>
  </form>;
}
