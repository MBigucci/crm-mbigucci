"use client";

import { useEffect, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import { COLUNAS_EVENTO, type Evento } from "./leads";
import { COLUNAS_LEAD_PAINEL, montarPainel, type LeadPainel, type NumerosCorretor, type Perdido, type Periodo } from "./painel";

export type DadosPainel = {
  numeros: Map<string, NumerosCorretor>;
  leads: Map<string, LeadPainel>;
  perdidos: Perdido[];
};

/** O Supabase devolve no máximo 1.000 linhas por vez: busca em páginas. */
const PAGINA = 1000;

/**
 * Eventos desde o início do período (até hoje, para o funil), os leads citados
 * e os perdidos do período. O RLS limita ao que a pessoa vê.
 */
export function usePainel(p: Periodo): { dados: DadosPainel | null; erro: string | null } {
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ini = p.ini.toISOString();
  const fim = p.fim.toISOString();

  useEffect(() => {
    let vivo = true;
    setDados(null);
    setErro(null);
    (async () => {
      const eventos: Evento[] = [];
      for (let de = 0; ; de += PAGINA) {
        const { data, error } = await db()
          .from("lead_eventos")
          .select(COLUNAS_EVENTO)
          .gte("criado_em", ini)
          .order("criado_em")
          .order("id")
          .range(de, de + PAGINA - 1);
        if (error) return vivo && setErro(mensagemErro(error));
        eventos.push(...((data ?? []) as Evento[]));
        if (!data || data.length < PAGINA) break;
      }
      const r = await db().rpc("leads_perdidos", { p_de: ini, p_ate: fim });
      if (r.error) return vivo && setErro(mensagemErro(r.error));
      const perdidos = (r.data ?? []) as Perdido[];

      const ids = [...new Set(eventos.map((e) => e.lead_id))];
      const leads = new Map<string, LeadPainel>();
      for (let i = 0; i < ids.length; i += 150) {
        const { data, error } = await db().from("leads").select(COLUNAS_LEAD_PAINEL).in("id", ids.slice(i, i + 150));
        if (error) return vivo && setErro(mensagemErro(error));
        for (const l of (data ?? []) as LeadPainel[]) leads.set(l.id, l);
      }
      if (!vivo) return;
      setDados({ numeros: montarPainel(eventos, leads, perdidos, { ...p, ini: new Date(ini), fim: new Date(fim) }), leads, perdidos });
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ini, fim]);

  return { dados, erro };
}
