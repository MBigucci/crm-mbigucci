"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { agoraSP, DIAS_LONGO, simular, type ConfigTela, type ProdutoTela } from "@/lib/telas";

/** Teste sem gravar: a mesma regra pura da Edge Function, com os contadores de agora. */
export function Simulador({ config, produtos }: { config: ConfigTela; produtos: ProdutoTela[] }) {
  const [produto, setProduto] = useState<string>(produtos[0]?.id ?? "");
  const [fonte, setFonte] = useState<string>(config.fontes.find((f) => f.slug === "zap")?.slug ?? config.fontes[0]?.slug ?? "");
  const [dia, setDia] = useState(6);
  const [hora, setHora] = useState("10:30");

  const r = useMemo(
    () => simular(config, produtos, { produto_id: produto || null, fonte: fonte || null, dia, hora }),
    [config, produtos, produto, fonte, dia, hora],
  );

  return (
    <section className="card" aria-labelledby="t-sim">
      <span className="eyebrow">Teste sem gravar</span>
      <h2 className="titulo-card mt-[2px]" id="t-sim">
        Simulador
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-[10px]">
        <div className="col-span-2">
          <label className="field-label" htmlFor="s-produto">
            Produto
          </label>
          <select id="s-produto" className="input" value={produto} onChange={(e) => setProduto(e.target.value)}>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
            <option value="">Produto não reconhecido</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="field-label" htmlFor="s-fonte">
            Fonte
          </label>
          <select id="s-fonte" className="input" value={fonte} onChange={(e) => setFonte(e.target.value)}>
            {config.fontes.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.nome}
              </option>
            ))}
            <option value="">Fonte não reconhecida</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="field-label" htmlFor="s-dia">
            Dia
          </label>
          <select id="s-dia" className="input" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
            {DIAS_LONGO.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="field-label" htmlFor="s-hora">
            Hora
          </label>
          <input id="s-hora" className="input" type="time" step={60} value={hora} onChange={(e) => setHora(e.target.value || "00:00")} />
        </div>
      </div>
      <button
        type="button"
        className="link-acao focus-ring mt-[10px] min-h-[44px] text-[13px] sm:min-h-0"
        onClick={() => {
          const a = agoraSP();
          setDia(a.dia);
          setHora(a.hora);
        }}
      >
        Usar agora
      </button>
      <div className="resultado" aria-live="polite">
        <span className="eyebrow">{r.quem}</span>
        <strong>{r.destino}</strong>
        <p>{r.por}</p>
      </div>
      {r.passos.length > 0 && (
        <ol className="mt-3 grid gap-[6px] text-[13px]">
          {r.passos.map((p) => (
            <li key={p.texto} className="grid grid-cols-[auto_1fr] gap-2 text-ink-soft">
              <span className={clsx("min-w-[12px] font-bold", p.casou ? "text-ok" : "text-neutral-mark")} aria-hidden>
                {p.casou ? "✓" : "–"}
              </span>
              <span>{p.texto}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-[10px] text-[12px] text-concrete">Dia e hora de São Paulo, no momento em que o lead chega. Os contadores são os de agora.</p>
    </section>
  );
}
