"use client";

import { useEffect, useState } from "react";
import type { Aparencia } from "@/lib/aparencia";

export function EscolhaAparencia() {
  const [escolha, setEscolha] = useState<Aparencia>("automatico");
  useEffect(() => {
    const atualizar = () => setEscolha((document.documentElement.dataset.aparencia ?? "automatico") as Aparencia);
    atualizar();
    window.addEventListener("aparencia-atualizada", atualizar);
    return () => window.removeEventListener("aparencia-atualizada", atualizar);
  }, []);

  return (
    <section className="card" aria-labelledby="titulo-aparencia">
      <h2 id="titulo-aparencia" className="titulo-card">Aparência</h2>
      <p id="ajuda-aparencia" className="mt-2 text-ink-soft">Automático acompanha o tema do aparelho. Sua escolha fica neste aparelho.</p>
      <label className="field-label mt-4" htmlFor="aparencia">Aparência</label>
      <select id="aparencia" className="input" value={escolha} aria-describedby="ajuda-aparencia"
        onChange={(e) => window.dispatchEvent(new CustomEvent("aparencia-escolhida", { detail: e.target.value }))}>
        <option value="automatico">Automático</option>
        <option value="claro">Claro</option>
        <option value="escuro">Escuro</option>
      </select>
    </section>
  );
}
