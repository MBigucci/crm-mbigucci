"use client";

import { useEffect, useRef, useState } from "react";
import { salvarRegra } from "@/lib/direcionador-dados";
import {
  avisoHorario,
  DIAS,
  partesDoForm,
  somaPcts,
  validarRegra,
  type ConfigTela,
  type ProdutoTela,
  type RegraTela,
} from "@/lib/telas";

/** Criar ou editar uma regra (diálogo). Salvar troca as partes e zera os contadores da regra. */
export function EditorRegra({
  config,
  produtos,
  regra,
  posicao,
  onFechar,
  onSalvo,
  onExcluir,
}: {
  config: ConfigTela;
  produtos: ProdutoTela[];
  regra: RegraTela | null;
  posicao: number;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
  onExcluir: (r: RegraTela) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const primeiroExterno = config.destinos.find((d) => d.tipo === "externo" && d.ativo) ?? config.destinos.find((d) => d.tipo === "vendas");
  const [nome, setNome] = useState(regra?.nome ?? "");
  const [ativa, setAtiva] = useState(regra?.ativa ?? true);
  const [prods, setProds] = useState<string[]>(regra?.produtos ?? []);
  const [fontes, setFontes] = useState<string[]>(regra?.fontes ?? []);
  const [dias, setDias] = useState<number[]>(regra?.dias ?? [0, 1, 2, 3, 4, 5, 6]);
  const inteiroInicial = regra ? regra.hora_inicio === regra.hora_fim : false;
  const [diaInteiro, setDiaInteiro] = useState(inteiroInicial);
  const [ini, setIni] = useState(regra && !inteiroInicial ? regra.hora_inicio : "09:00");
  const [fim, setFim] = useState(regra && !inteiroInicial ? regra.hora_fim : "18:00");
  const [pcts, setPcts] = useState<Record<string, number>>(
    regra ? Object.fromEntries(regra.partes.map((p) => [p.destino_id, p.porcentagem])) : primeiroExterno ? { [primeiroExterno.id]: 100 } : {},
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const alerta = useRef<HTMLParagraphElement>(null);
  // O erro fica no fim do formulário: rola até ele para não passar despercebido.
  useEffect(() => {
    if (erro) alerta.current?.scrollIntoView({ block: "nearest" });
  }, [erro]);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Alternar com setState funcional: a versão com closure perde cliques rápidos.
  const alternar = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, v: T) => set((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarRegra({ nome, dias, diaInteiro, hora_inicio: ini, hora_fim: fim, pcts });
    if (problema) return setErro(problema);
    setErro(null);
    setSalvando(true);
    try {
      await salvarRegra({
        id: regra?.id,
        nome: nome.trim(),
        ativa,
        produtos: prods,
        fontes,
        dias: [...dias].sort((a, b) => a - b),
        hora_inicio: diaInteiro ? "00:00" : ini,
        hora_fim: diaInteiro ? "00:00" : fim,
        partes: partesDoForm(pcts, config.destinos, regra?.partes.map((p) => p.destino_id)),
      });
      onSalvo(regra ? "✓ Regra salva. Os contadores dela voltaram a zero" : `✓ Regra criada no fim da lista, na posição ${posicao}`);
    } catch (e) {
      setErro(`✕ ${e instanceof Error ? e.message : String(e)}`);
      setSalvando(false);
    }
  }

  const soma = somaPcts(pcts);

  return (
    <dialog ref={dialogo} className="dialogo" aria-labelledby="ed-titulo" onClose={onFechar}>
      <form className="flex max-h-[calc(100dvh-26px)] flex-col" onSubmit={salvar} noValidate>
        <div className="dialogo-cab">
          <span className="eyebrow">{regra ? `Regra ${posicao}` : "Nova regra"}</span>
          <h2 className="titulo-card mt-[2px]" id="ed-titulo">
            {regra ? "Editar regra" : "Criar regra"}
          </h2>
        </div>
        <div className="dialogo-corpo">
          <div>
            <label className="field-label" htmlFor="f-nome">
              Nome da regra
            </label>
            <input id="f-nome" className="input" maxLength={80} placeholder="Ex.: Fim de semana, portais" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>

          <fieldset>
            <legend className="field-label">Produto</legend>
            <div className="flex flex-wrap gap-[6px]">
              <Chip marcado={!prods.length} onChange={() => setProds([])} texto="Qualquer produto" />
              {produtos.map((p) => (
                <Chip key={p.id} marcado={prods.includes(p.id)} onChange={() => alternar(setProds, p.id)} texto={p.nome} />
              ))}
            </div>
            <p className="mt-[6px] text-[13px] text-ink-soft">Produto não reconhecido só casa com Qualquer produto.</p>
          </fieldset>

          <fieldset>
            <legend className="field-label">Fonte</legend>
            <div className="flex flex-wrap gap-[6px]">
              <Chip marcado={!fontes.length} onChange={() => setFontes([])} texto="Qualquer fonte" />
              {config.fontes.map((f) => (
                <Chip key={f.slug} marcado={fontes.includes(f.slug)} onChange={() => alternar(setFontes, f.slug)} texto={f.nome} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Dias</legend>
            <div className="flex flex-wrap gap-[6px]">
              {DIAS.map((d, i) => (
                <Chip key={d} marcado={dias.includes(i)} onChange={() => alternar(setDias, i)} texto={d} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Horário</legend>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-[10px]">
              <div className="w-[130px]">
                <label className="field-label" htmlFor="f-ini">
                  Das
                </label>
                <input id="f-ini" className="input" type="time" step={60} value={diaInteiro ? "00:00" : ini} disabled={diaInteiro} onChange={(e) => setIni(e.target.value)} />
              </div>
              <div className="w-[130px]">
                <label className="field-label" htmlFor="f-fim">
                  Até
                </label>
                <input id="f-fim" className="input" type="time" step={60} value={diaInteiro ? "00:00" : fim} disabled={diaInteiro} onChange={(e) => setFim(e.target.value)} />
              </div>
              <Chip marcado={diaInteiro} onChange={() => setDiaInteiro((v) => !v)} texto="Dia inteiro" />
            </div>
            <p className="mt-[6px] text-[13px] text-ink-soft">{avisoHorario({ diaInteiro, hora_inicio: ini, hora_fim: fim })}</p>
          </fieldset>

          <fieldset>
            <legend className="field-label">Mandar para, em %</legend>
            <div className="grid gap-[6px]">
              {config.destinos.map((d) => (
                <label key={d.id} htmlFor={`f-pct-${d.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-control px-3 py-2 font-semibold">
                  <span className="min-w-0">
                    → {d.nome}
                    {!d.ativo && <span className="ml-1 font-normal text-neutral-mark">(desligado)</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <input
                      id={`f-pct-${d.id}`}
                      className="input num w-[84px] text-right"
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      inputMode="numeric"
                      value={pcts[d.id] ?? 0}
                      onChange={(e) => {
                        const v = Math.round(Number(e.target.value) || 0);
                        setPcts((p) => ({ ...p, [d.id]: Math.max(0, Math.min(100, v)) }));
                      }}
                    />
                    %
                  </span>
                </label>
              ))}
            </div>
            <p className={soma === 100 ? "aviso-ok mt-[6px]" : "mt-[6px] text-[13px] font-semibold text-wa"} aria-live="polite">
              {soma === 100 ? "✓ Soma 100%." : `! Soma ${soma}%. Ajuste para 100%.`}
            </p>
            {regra && <p className="mt-1 text-[13px] text-ink-soft">Ao salvar, os contadores desta regra voltam a zero.</p>}
          </fieldset>

          <Chip marcado={ativa} onChange={() => setAtiva((v) => !v)} texto="Regra ligada" />
          {erro && (
            <p ref={alerta} className="aviso-erro" role="alert">
              {erro}
            </p>
          )}
        </div>
        <div className="dialogo-rod">
          {regra &&
            (confirmarExclusao ? (
              <button type="button" className="btn btn-ghost focus-ring mr-auto basis-full sm:basis-auto" onClick={() => onExcluir(regra)}>
                ✕ Excluir de vez
              </button>
            ) : (
              <button type="button" className="link-texto focus-ring mr-auto min-h-[44px] basis-full text-left text-[13px] sm:min-h-0 sm:basis-auto" onClick={() => setConfirmarExclusao(true)}>
                Excluir regra
              </button>
            ))}
          <button type="button" className="btn btn-ghost focus-ring flex-1 sm:flex-none" onClick={() => dialogo.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-red focus-ring flex-1 sm:flex-none" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar regra"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function Chip({ marcado, onChange, texto }: { marcado: boolean; onChange: () => void; texto: string }) {
  return (
    <label className="chip">
      <input type="checkbox" checked={marcado} onChange={onChange} />
      <span>{texto}</span>
    </label>
  );
}
