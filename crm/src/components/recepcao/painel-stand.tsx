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
      <ul className="grid gap-2 sm:hidden">
        {[...linhas.map((id) => ({ id, nome: nomes.get(id) ?? "Corretor", x: numeros.get(id) ?? standZerado() })), { id: "equipe", nome: "Equipe", x: total }].map((l) => (
          <li key={l.id} className="card px-4 py-3">
            <details>
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3">
                <span className={clsx("min-w-0 truncate", l.id === "equipe" && "font-semibold")}>{l.nome}</span>
                <span className="shrink-0 text-[13px] text-ink-soft">
                  <b className={clsx("num text-[18px]", l.x.clientes ? "text-ink" : "text-ink-soft")}>{l.x.clientes}</b>{" "}
                  {l.x.clientes === 1 ? "cliente" : "clientes"} <span aria-hidden>+</span>
                </span>
              </summary>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-2 text-[13px]">
                {COLUNAS.slice(1).map((c) => (
                  <div key={c.chave} className="flex justify-between gap-2">
                    <dt className="text-ink-soft">{c.rotulo}</dt>
                    <dd className="num font-semibold">{l.x[c.chave]}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
      <div className="card tabela-painel hidden overflow-x-auto p-0 sm:block">
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
      <div className="card">
        <span className="eyebrow text-[12px] text-ink-soft">{COLUNAS[0].rotulo}</span>
        <span className={clsx("num mt-1 block font-display text-[36px] font-extrabold leading-none", !numeros.clientes && "text-ink-soft")}>
          {numeros.clientes}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {COLUNAS.slice(1).map((c) => (
          <div key={c.chave} className="card">
            <span className="eyebrow text-[12px] text-ink-soft">{c.rotulo}</span>
            <span className={clsx("num mt-1 block font-display text-[24px] font-extrabold leading-none", !numeros[c.chave] && "text-ink-soft")}>
              {numeros[c.chave]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
