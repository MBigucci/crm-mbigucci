"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_FAIXA, faixasDoMes, mesSeguinte, type Faixa } from "@/lib/faixas";
import { formatarReais, lerReais } from "@/lib/vendas";
import { useNomes, useVendas } from "@/lib/vendas-dados";

/**
 * Faixas de VGV do mês: tela só do gerente geral (regra fixa no banco). O
 * título, a descrição e o nome da coluna vêm de app_settings, que só ele lê.
 */
export default function FaixasPage() {
  return (
    <Casca titulo="Faixas de VGV" soGerenteGeral>
      <Faixas />
    </Casca>
  );
}

type Textos = { rotulo: string; descricao: string; coluna: string };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

function Faixas() {
  const [textos, setTextos] = useState<Textos | null>(null);
  const [faixas, setFaixas] = useState<Faixa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = new Date();
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });

  const carregar = useCallback(async () => {
    const [t, f] = await Promise.all([
      db().from("app_settings").select("rotulo, descricao, valor").eq("chave", "faixas_vgv").maybeSingle(),
      db().from("faixas_vgv").select(COLUNAS_FAIXA).order("vgv_minimo"),
    ]);
    if (t.error || f.error) return setErro(mensagemErro(t.error ?? f.error));
    const valor = (t.data?.valor ?? {}) as { coluna?: string };
    setTextos({ rotulo: t.data?.rotulo ?? "Faixas de VGV", descricao: t.data?.descricao ?? "", coluna: valor.coluna ?? "Valor" });
    setFaixas((f.data ?? []) as Faixa[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const prox = mesSeguinte(mes.ano, mes.mes);
  const { vendas, erro: erroVendas } = useVendas(`${mes.ano}-${dd(mes.mes + 1)}-01`, `${prox.ano}-${dd(prox.mes + 1)}-01`);
  const linhas = vendas && faixas ? [...faixasDoMes(vendas, faixas, mes.ano, mes.mes).values()] : null;
  const nomes = useNomes((linhas ?? []).map((l) => l.corretor));
  const ordenadas = (linhas ?? []).sort((a, b) => b.vgvValido - a.vgvValido || (nomes.get(a.corretor) ?? "").localeCompare(nomes.get(b.corretor) ?? "", "pt-BR"));
  const total = ordenadas.reduce((s, l) => s + Number(l.faixa?.valor ?? 0), 0);
  const ir = (n: number) => {
    const d = new Date(mes.ano, mes.mes + n, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
  };
  const th = "px-2 py-2 text-right font-semibold align-bottom";

  if (erro) return <p className="aviso-erro">! {erro}</p>;
  if (!textos || !faixas) return <p className="text-concrete">Carregando…</p>;

  return (
    <div className="grid gap-5">
      <section className="card bar-brand">
        <h2 className="titulo-card text-[20px]">{textos.rotulo}</h2>
        {textos.descricao && <p className="mt-2 text-ink-soft">{textos.descricao}</p>}
      </section>

      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Mês anterior" onClick={() => ir(-1)}>
          ← Anterior
        </button>
        <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
          {MESES[mes.mes]} de {mes.ano}
        </p>
        <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Mês seguinte" onClick={() => ir(1)}>
          Seguinte →
        </button>
      </div>

      {erroVendas && <p className="aviso-erro">! {erroVendas}</p>}
      {!linhas && !erroVendas && <p className="text-concrete">Carregando…</p>}
      {linhas && (
        <section aria-labelledby="t-faixas" className="min-w-0">
          <h2 id="t-faixas" className="eyebrow mb-2">
            Por corretor · vendas assinadas no mês · liberação em {MESES[prox.mes].toLowerCase()} de {prox.ano}
          </h2>
          {ordenadas.length ? (
            <div className="card tabela-painel overflow-x-auto p-0">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line text-concrete">
                    <th className="px-4 py-2 font-semibold">Corretor</th>
                    <th className={th}>Assinado e pago</th>
                    <th className={th}>{textos.coluna}</th>
                    <th className={th}>Faixa atingida</th>
                    <th className={clsx(th, "pr-4")}>Assinado, com pendentes</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((l) => (
                    <tr key={l.corretor} className="border-b border-line">
                      <td className="px-4 py-2">{nomes.get(l.corretor) ?? "Corretor"}</td>
                      <td className="num px-2 py-2 text-right">{formatarReais(l.vgvValido)}</td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right font-semibold">{l.faixa ? formatarReais(Number(l.faixa.valor)) : "–"}</td>
                      <td className={clsx("num whitespace-nowrap px-2 py-2 text-right", !l.faixa && "text-concrete")}>
                        {l.faixa ? `✓ A partir de ${formatarReais(Number(l.faixa.vgv_minimo))}` : "– Abaixo da primeira"}
                      </td>
                      <td className="num px-2 py-2 pr-4 text-right text-ink-soft">{formatarReais(l.vgvAssinado)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right">{formatarReais(total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card">
              <p className="text-ink-soft">Nenhuma venda assinada neste mês.</p>
            </div>
          )}
        </section>
      )}

      <EditarFaixas faixas={faixas} coluna={textos.coluna} onMudou={carregar} />
    </div>
  );
}

/** A tabela de faixas: cada linha é "a partir de" e o valor. Vale a mais alta atingida. */
function EditarFaixas({ faixas, coluna, onMudou }: { faixas: Faixa[]; coluna: string; onMudou: () => void }) {
  const [nova, setNova] = useState(false);
  return (
    <section className="card grid gap-4" aria-labelledby="editar-faixas">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="editar-faixas" className="titulo-card">
          Faixas
        </h2>
        {!nova && (
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => setNova(true)}>
            + Nova faixa
          </button>
        )}
      </div>
      {!faixas.length && !nova && <p className="text-ink-soft">Nenhuma faixa. Crie a primeira.</p>}
      <ul className="grid gap-4">
        {faixas.map((f) => (
          <li key={f.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
            <LinhaFaixa faixa={f} coluna={coluna} onMudou={onMudou} />
          </li>
        ))}
        {nova && (
          <li>
            <LinhaFaixa
              coluna={coluna}
              onMudou={() => {
                setNova(false);
                onMudou();
              }}
              onCancelar={() => setNova(false)}
            />
          </li>
        )}
      </ul>
    </section>
  );
}

function LinhaFaixa({ faixa, coluna, onMudou, onCancelar }: { faixa?: Faixa; coluna: string; onMudou: () => void; onCancelar?: () => void }) {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const [minimo, setMinimo] = useState(faixa ? fmt(Number(faixa.vgv_minimo)) : "");
  const [valor, setValor] = useState(faixa ? fmt(Number(faixa.valor)) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const id = faixa?.id ?? "nova";

  async function salvar() {
    const m = lerReais(minimo);
    const v = valor.trim() === "0" ? 0 : lerReais(valor);
    if (!m) return setErro("Confira o VGV mínimo: só números, como 1.000.000.");
    if (v === null) return setErro(`Confira o campo ${coluna}: só números, como 2.000.`);
    const campos = { vgv_minimo: m, valor: v };
    const r = faixa ? await db().from("faixas_vgv").update(campos).eq("id", faixa.id) : await db().from("faixas_vgv").insert(campos);
    if (r.error) return setErro(r.error.message.includes("vgv_minimo") ? "Já existe uma faixa com esse VGV mínimo." : mensagemErro(r.error));
    setErro(null);
    setOk(true);
    onMudou();
  }
  async function excluir() {
    if (!faixa) return;
    const { error } = await db().from("faixas_vgv").delete().eq("id", faixa.id);
    if (error) return setErro(mensagemErro(error));
    onMudou();
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`min-${id}`}>
            VGV no mês a partir de (R$)
          </label>
          <input id={`min-${id}`} className="input num" inputMode="decimal" value={minimo} onChange={(e) => (setMinimo(e.target.value), setOk(false))} />
        </div>
        <div>
          <label className="field-label" htmlFor={`val-${id}`}>
            {coluna} (R$)
          </label>
          <input id={`val-${id}`} className="input num" inputMode="decimal" value={valor} onChange={(e) => (setValor(e.target.value), setOk(false))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" className="btn btn-ghost focus-ring" onClick={salvar}>
          {faixa ? "Salvar" : "Criar faixa"}
        </button>
        {faixa && (
          <button type="button" className="link-acao focus-ring text-[13px]" onClick={excluir}>
            Excluir faixa
          </button>
        )}
        {onCancelar && (
          <button type="button" className="link-acao focus-ring text-[13px]" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        {ok && <span className="aviso-ok">✓ Salvo</span>}
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
    </div>
  );
}
