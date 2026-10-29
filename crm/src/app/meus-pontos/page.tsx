"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { MESES, mesAtual, NavMes, type Mes } from "@/components/programa/partes";
import { usePerfil } from "@/lib/sessao";
import { formatarReais } from "@/lib/vendas";
import { useVendas } from "@/lib/vendas-dados";
import { limitesDoMes, mesDeLiberacao, pontosDoMes, REGRAS, resumoDoMes } from "@/lib/programa";
import { useCriterios, useFechamentos, useLancamentos } from "@/lib/programa-dados";

/**
 * Meus pontos: só com a chave do programa ligada (o banco não entrega nada
 * antes). Os pontos aprovados do mês, o que falta para o mínimo e a verba que
 * vem no mês seguinte.
 */
export default function MeusPontosPage() {
  return (
    <Casca titulo="Meus pontos" programa exige="leads.cadastrar">
      <MeusPontos />
    </Casca>
  );
}

function MeusPontos() {
  const eu = usePerfil();
  const [mes, setMes] = useState<Mes>(mesAtual());
  const { ini, fim } = limitesDoMes(mes.ano, mes.mes);
  const anterior = new Date(mes.ano, mes.mes - 1, 1);
  const iniAnterior = limitesDoMes(anterior.getFullYear(), anterior.getMonth()).ini;
  const { criterios, erro: e1 } = useCriterios();
  const { lancamentos, erro: e2 } = useLancamentos(ini, fim, { corretor: eu.id });
  const { vendas, erro: e3 } = useVendas(ini, fim, eu.id);
  const { fechamentos } = useFechamentos(iniAnterior);
  const lib = mesDeLiberacao(mes.ano, mes.mes);
  const erro = e1 ?? e2 ?? e3;

  if (erro) return <p className="aviso-erro">! {erro}</p>;
  if (!criterios || !lancamentos || !vendas) return <p className="text-concrete">Carregando…</p>;

  const [r] = resumoDoMes([eu.id], lancamentos, vendas, criterios, mes.ano, mes.mes);
  const { linhas } = pontosDoMes(r.contagens, criterios);
  const liberadaAgora = fechamentos?.find((f) => f.corretor_id === eu.id);
  const pct = Math.min(100, Math.round((r.pontos / REGRAS.tetoComVenda) * 100));

  return (
    <div className="grid gap-5">
      <NavMes valor={mes} onMudar={setMes} ate={mesAtual()} />

      <section className="card bar-brand grid gap-3" aria-labelledby="t-verba">
        <p id="t-verba" className="eyebrow">
          Verba prevista · liberada em {MESES[lib.mes].toLowerCase()}
        </p>
        <p className="num font-display text-[34px] font-extrabold leading-none">{formatarReais(r.verba.verba)}</p>
        <p className="text-ink-soft">
          {r.verba.situacao === "abaixo_do_minimo"
              ? `Faltam ${r.verba.faltamParaMinimo} pontos para o mínimo de ${REGRAS.minimo}. Abaixo dele, a verba é zero.`
              : r.verba.situacao === "sem_venda"
                ? `✓ Mínimo atingido. Sem venda no mês, a verba vai até ${REGRAS.tetoSemVenda} pontos. A primeira venda assinada e paga libera até ${REGRAS.tetoComVenda} e soma ${formatarReais(REGRAS.porVenda)}.`
                : `✓ Mínimo atingido, com ${r.vendas} venda${r.vendas > 1 ? "s" : ""} assinada${r.vendas > 1 ? "s" : ""} e paga${r.vendas > 1 ? "s" : ""}: até ${REGRAS.tetoComVenda} pontos e ${formatarReais(REGRAS.porVenda)} por venda.`}
        </p>
        <div>
          <div className="flex justify-between text-[13px] text-ink-soft">
            <span className="num">{r.pontos} pontos</span>
            <span className="num">mínimo {REGRAS.minimo}</span>
          </div>
          <div className="relative mt-1 h-[10px] rounded-sm border border-line bg-paper" aria-hidden>
            <div className={clsx("h-full", r.pontos >= REGRAS.minimo ? "bg-ok" : "bg-ink")} style={{ width: `${pct}%` }} />
            <div className="absolute bottom-[-3px] top-[-3px] w-[2px] bg-brand" style={{ left: `${(REGRAS.minimo / REGRAS.tetoComVenda) * 100}%` }} />
          </div>
        </div>
      </section>

      <section aria-labelledby="t-pontos" className="grid gap-3">
        <h2 id="t-pontos" className="eyebrow">
          Pontos aprovados em {MESES[mes.mes].toLowerCase()}
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {linhas.map((l) => (
            <li key={l.criterio.slug} className="card grid gap-1">
              <p className="font-semibold">{l.criterio.nome}</p>
              <p className="num font-display text-[24px] font-bold">{l.pontos}</p>
              <p className="num text-[13px] text-ink-soft">
                {l.considerada} de {l.criterio.limite_mes} no mês · {l.criterio.pontos} cada
                {l.acimaDoLimite > 0 && ` · ${l.acimaDoLimite} acima do limite`}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-ink-soft">
          Só aparece o que o gerente geral já aprovou. A visita conta quando você dá a baixa como realizada.
        </p>
      </section>

      {liberadaAgora && (
        <section className="card grid gap-1" aria-labelledby="t-liberada">
          <p id="t-liberada" className="eyebrow">
            Verba de {MESES[anterior.getMonth()].toLowerCase()}, liberada em {MESES[mes.mes].toLowerCase()}
          </p>
          <p className="num font-display text-[24px] font-bold">{formatarReais(Number(liberadaAgora.verba))}</p>
          <p className="num text-[13px] text-ink-soft">
            {liberadaAgora.pontos} pontos · {liberadaAgora.vendas} venda{liberadaAgora.vendas === 1 ? "" : "s"}
          </p>
        </section>
      )}

      <Link href="/ranking/" className="link-acao focus-ring justify-self-start">
        Ver o ranking
      </Link>
    </div>
  );
}
