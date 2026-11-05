"use client";

import Link from "next/link";
import clsx from "clsx";
import { somarStand, standZerado, type NumerosStand } from "@/lib/recepcao";

const COLUNAS: { chave: keyof NumerosStand; rotulo: string }[] = [
  { chave: "clientes", rotulo: "Clientes no stand" },
  { chave: "novos", rotulo: "Novos da vez" },
  { chave: "indicacoes", rotulo: "Indicações" },
  { chave: "retornos", rotulo: "Retornos" },
  { chave: "atendeuDeOutro", rotulo: "Atendeu por colega" },
];

/** Clientes registrados pela recepção no período, por corretor (painel da equipe). */
export function TabelaStand({ linhas, numeros, nomes }: { linhas: string[]; numeros: Map<string, NumerosStand>; nomes: Map<string, string> }) {
  const total = somarStand(linhas.map((id) => numeros.get(id) ?? standZerado()));
  const th = "px-2 py-2 text-right font-semibold align-bottom";
  const celulas = (x: NumerosStand) =>
    COLUNAS.map((c, i) => (
      <td key={c.chave} className={clsx("num px-2 py-2 text-right", i === COLUNAS.length - 1 && "pr-4", !x[c.chave] && "text-ink-soft")}>
        {x[c.chave]}
      </td>
    ));
  return (
    <section aria-labelledby="t-stand" className="min-w-0">
      <h2 id="t-stand" className="titulo-secao mb-3">
        Clientes no stand, por corretor · pela recepção
      </h2>
      <div className="card tabela-painel overflow-x-auto p-0">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-line text-ink-soft">
              <th className="px-4 py-2 font-semibold">Corretor</th>
              {COLUNAS.map((c, i) => (
                <th key={c.chave} className={clsx(th, i === COLUNAS.length - 1 && "pr-4")}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((id) => (
              <tr key={id} className="border-b border-line">
                <td className="px-4 py-2">{nomes.get(id) ?? "Corretor"}</td>
                {celulas(numeros.get(id) ?? standZerado())}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="px-4 py-2">Equipe</td>
              {celulas(total)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-concrete">
        O cliente conta para o corretor do vínculo (o da vez, quem indicou ou o do retorno). Cliente de parceiro fica com o gerente do parceiro.
      </p>
      <Link href="/recepcao/relatorio/" className="link-acao sem-impressao mt-2 inline-block">
        Relatório do stand
      </Link>
    </section>
  );
}

/** Os mesmos números no relatório do corretor. */
export function StandDoCorretor({ numeros }: { numeros: NumerosStand }) {
  return (
    <section aria-labelledby="r-stand" className="grid gap-2">
      <h2 id="r-stand" className="eyebrow text-[12px] text-ink-soft">
        Clientes no stand no período · pela recepção
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {COLUNAS.map((c) => (
          <div key={c.chave} className="card">
            <span className="eyebrow text-[12px] text-ink-soft">{c.rotulo}</span>
            <span className={clsx("num mt-1 block font-display text-[30px] font-extrabold leading-none", !numeros[c.chave] && "text-ink-soft")}>
              {numeros[c.chave]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
