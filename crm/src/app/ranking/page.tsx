"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { mesAtual, type Mes } from "@/components/programa/partes";
import { usePerfil } from "@/lib/sessao";
import { limitesDoMes, posicoes } from "@/lib/programa";
import { useRanking } from "@/lib/programa-dados";
import { ErroPainel } from "@/components/painel/partes";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";

/** Pontos aprovados, limites e empates continuam calculados pelo domínio. */
export default function RankingPage() {
  return <Casca migrada titulo="Ranking de pontos"><header className="mb-cabecalho"><div className="mb-cabecalho__texto"><h1 className="titulo-tela">Ranking de pontos</h1></div></header><Suspense fallback={<CarregandoTabela texto="Carregando ranking…" />}><Ranking /></Suspense></Casca>;
}

function Ranking() {
  const eu = usePerfil();
  const sp = useSearchParams();
  const router = useRouter();
  const atual = mesAtual();
  const parametro = sp.get("mes") ?? "";
  const valido = /^\d{4}-(0[1-9]|1[0-2])$/.test(parametro);
  const escolhido: Mes = valido ? { ano: Number(parametro.slice(0, 4)), mes: Number(parametro.slice(5)) - 1 } : atual;
  const mes = escolhido.ano * 12 + escolhido.mes > atual.ano * 12 + atual.mes ? atual : escolhido;
  const chave = mes.ano + "-" + String(mes.mes + 1).padStart(2, "0");
  const { linhas, erro } = useRanking(limitesDoMes(mes.ano, mes.mes).ini);
  const [completoEm, setCompletoEm] = useState<string | null>(null);
  const completo = completoEm === chave;
  const pos = posicoes((linhas ?? []).map((l) => l.pontos));
  const voce = linhas?.findIndex((l) => l.corretor_id === eu.id) ?? -1;
  const nomeDoPeriodo = new Date(mes.ano, mes.mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const rotulo = nomeDoPeriodo.charAt(0).toLocaleUpperCase("pt-BR") + nomeDoPeriodo.slice(1);
  function ir(delta: number) {
    const d = new Date(mes.ano, mes.mes + delta, 1);
    const q = new URLSearchParams(sp.toString());
    q.set("mes", d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
    router.replace("/ranking/?" + q.toString(), { scroll: false });
  }
  const item = (i: number) => {
    const l = linhas![i];
    return <li className="mb-ranking__item" key={l.corretor_id} aria-current={l.corretor_id === eu.id ? "true" : undefined}>
      <span className="mb-ranking__posicao">{pos[i]}º</span>
      <span className="mb-ranking__nome"><span className="mb-ranking__quem">{l.nome}{l.corretor_id === eu.id && <span className="mb-ranking__voce">Você</span>}</span></span>
      <span className="mb-ranking__valor">{l.pontos.toLocaleString("pt-BR")} <small>pts</small></span>
    </li>;
  };
  return <div className="pmr-pilha">
    <nav className="mb-periodo" aria-label="Mês do ranking"><button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => ir(-1)}>← Anterior</button><span className="mb-periodo__rotulo" aria-live="polite">{rotulo}</span><button type="button" className="mb-botao mb-botao--secundario mb-botao--p" disabled={mes.ano === atual.ano && mes.mes === atual.mes} onClick={() => ir(1)}>Seguinte →</button></nav>
    {erro && <ErroPainel erro={erro} />}{!linhas && !erro && <CarregandoTabela texto="Carregando ranking…" />}
    {linhas && <section className="pmr-pilha" aria-labelledby="t-ranking"><h2 id="t-ranking" className="mb-grafico__titulo">Pontos aprovados · {rotulo}</h2><p className="mb-grafico__nota">Com o limite de cada critério do programa.</p>
      {!linhas.length ? <EstadoVazio titulo="Nenhum corretor ativo" texto="O ranking aparece quando houver corretores ativos." /> : <>
        <ol className="mb-ranking">{linhas.slice(0, completo ? linhas.length : 10).map((_, i) => item(i))}{!completo && voce >= 10 && <><li className="mb-ranking__item" aria-hidden="true">…</li>{item(voce)}</>}</ol>
        {linhas.length > 10 && <button type="button" className="mb-botao mb-botao--secundario pmr-acao" aria-expanded={completo} onClick={() => setCompletoEm(completo ? null : chave)}>{completo ? "Ver dez primeiras posições" : "Ver ranking completo"}</button>}
      </>}
    </section>}
  </div>;
}
