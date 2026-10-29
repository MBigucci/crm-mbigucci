"use client";

import { useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { mesAtual, NavMes, type Mes } from "@/components/programa/partes";
import { usePerfil } from "@/lib/sessao";
import { limitesDoMes, posicoes } from "@/lib/programa";
import { useRanking } from "@/lib/programa-dados";

/** Ranking de pontos aprovados no mês. Todos os corretores veem, só com a chave ligada. */
export default function RankingPage() {
  return (
    <Casca titulo="Ranking de pontos" programa>
      <Ranking />
    </Casca>
  );
}

function Ranking() {
  const eu = usePerfil();
  const [mes, setMes] = useState<Mes>(mesAtual());
  const { linhas, erro } = useRanking(limitesDoMes(mes.ano, mes.mes).ini);
  const pos = posicoes((linhas ?? []).map((l) => l.pontos));

  return (
    <div className="grid gap-5">
      <NavMes valor={mes} onMudar={setMes} ate={mesAtual()} />
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!linhas && !erro && <p className="text-concrete">Carregando…</p>}
      {linhas && (
        <section aria-labelledby="t-ranking" className="grid gap-3">
          <h2 id="t-ranking" className="eyebrow">
            Pontos aprovados no mês, com o limite de cada critério
          </h2>
          {!linhas.length ? (
            <div className="card">
              <p className="text-ink-soft">Nenhum corretor ativo.</p>
            </div>
          ) : (
            <ol className="card grid gap-0 p-0">
              {linhas.map((l, i) => (
                <li
                  key={l.corretor_id}
                  className={clsx("flex items-center gap-3 border-b border-line px-4 py-3 last:border-0", l.corretor_id === eu.id && "bg-tint-brand font-semibold")}
                >
                  <span className="num w-[32px] shrink-0 font-display text-[20px] font-bold">{pos[i]}º</span>
                  <span className="min-w-0 flex-1 truncate">
                    {l.nome}
                    {l.corretor_id === eu.id && <span className="selo ml-2">Você</span>}
                  </span>
                  <span className="num shrink-0 font-display text-[18px] font-bold">{l.pontos}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
