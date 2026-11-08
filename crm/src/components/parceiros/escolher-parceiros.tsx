"use client";

import { useEffect, useRef } from "react";
import type { ParceiroComSituacao } from "@/lib/parceiros";
import { SeloPrazo } from "./partes";
import { Icone } from "../alicerce/icone";

/** EscolherVarios.md:5-12. HTML da peça com estado React; seleção oculta pela busca é mantida. */
export function EscolherParceiros({ itens, total, marcados, validos, busca, setBusca, alternar, alternarTodos, todosVisiveis }: { itens: ParceiroComSituacao[]; total: number; marcados: string[]; validos: number; busca: string; setBusca: (v: string) => void; alternar: (id: string) => void; alternarTodos: () => void; todosVisiveis: boolean }) {
  const todos = useRef<HTMLInputElement>(null);
  useEffect(() => { if (todos.current) todos.current.indeterminate = !todosVisiveis && itens.some((p) => marcados.includes(p.id)); }, [itens, marcados, todosVisiveis]);
  return <div className="mb-campo">
    <span className="mb-campo__rotulo" id="quem-foi">Quem foi</span>
    <div className="mb-varios" role="group" aria-labelledby="quem-foi">
      <div className="mb-varios__topo">
        <label className="mb-busca"><span className="mb-visualmente-oculto">Buscar participantes</span><Icone nome="busca" /><input className="mb-campo__entrada" type="search" placeholder="Nome, empresa, WhatsApp ou CRECI" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        <span className="mb-varios__contagem" aria-live="polite">{validos ? `${validos} marcados de ${total}` : "Nenhum marcado"}</span>
      </div>
      <div className="mb-varios__quadro">
        <label className="mb-marcador mb-varios__todos"><input ref={todos} type="checkbox" checked={todosVisiveis} disabled={!itens.length} onChange={alternarTodos} />{busca.trim() ? `Marcar os ${itens.length} encontrados` : `Marcar todos (${itens.length})`}</label>
        <ul className="mb-varios__lista">
          {itens.map((p) => <li key={p.id}><label className="mb-marcador"><input type="checkbox" value={p.id} checked={marcados.includes(p.id)} onChange={() => alternar(p.id)} /><span className="mb-varios__nome">{p.nome}<span className="mb-marcador__detalhe">{p.empresa || "Autônomo"} · <SeloPrazo faixa={p.faixa} dias={p.dias_prazo} /></span></span><span className="mb-varios__detalhe">{p.creci || "Sem CRECI"}</span></label></li>)}
          {!itens.length && <li className="mb-varios__vazio">Nada encontrado com “{busca}”.</li>}
        </ul>
      </div>
    </div>
  </div>;
}
