"use client";

import { paraCampos } from "@/lib/leads";
import { Campo } from "./campo";
import { Seletor } from "./seletor";

const ATALHOS = [
  { rotulo: "Hoje", dias: 0 },
  { rotulo: "Amanhã", dias: 1 },
  { rotulo: "Em 3 dias", dias: 3 },
  { rotulo: "Em 1 semana", dias: 7 },
];

const diaDoAtalho = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return paraCampos(d).data;
};

/**
 * DataHora do Alicerce (project/components/DataHora): os atalhos de um toque (Seletor `--linha`, `--p`) e,
 * embaixo, os campos nativos de dia e hora (`.mb-campo__par`). O valor é o ISO que o app já usa
 * (`2026-11-07`, `15:00`). Tocar num atalho preenche o dia (e a hora, 09:00, se estiver vazia); mexer no dia
 * desmarca o atalho. `idRotulo` nomeia o grupo de atalhos.
 */
export function DataHora({
  idRotulo,
  data,
  hora,
  onChange,
  rotulosVisiveis = false,
  atalhosEmGrade = false,
}: {
  idRotulo: string;
  data: string;
  hora: string;
  onChange: (v: { data: string; hora: string }) => void;
  /** “Dia” e “Hora” escritos em cima de cada campo (a edição no card). No painel, só o aria-label, como no preview. */
  rotulosVisiveis?: boolean;
  /** Os atalhos em `mb-opcoes--4` com o tamanho padrão (44px; 2 × 2 no celular), como no cartão da ficha. Sem isso, pílulas pequenas em linha. */
  atalhosEmGrade?: boolean;
}) {
  const dias = ATALHOS.map((a) => ({ valor: diaDoAtalho(a.dias), rotulo: a.rotulo }));
  const dia = <input className="mb-campo__entrada" type="date" aria-label={rotulosVisiveis ? undefined : "Dia"} value={data} onChange={(e) => onChange({ data: e.target.value, hora: hora || "09:00" })} />;
  const horaDoDia = <input className="mb-campo__entrada" type="time" aria-label={rotulosVisiveis ? undefined : "Hora"} value={hora} onChange={(e) => onChange({ data, hora: e.target.value })} />;
  return (
    <>
      <Seletor idRotulo={idRotulo} grade={atalhosEmGrade ? 4 : "linha"} pequeno={!atalhosEmGrade} opcoes={dias} valor={dias.some((d) => d.valor === data) ? data : null} onChange={(v) => onChange({ data: v, hora: hora || "09:00" })} />
      <div className="mb-campo__par">
        {rotulosVisiveis ? (
          <>
            <Campo rotulo="Dia">{dia}</Campo>
            <Campo rotulo="Hora">{horaDoDia}</Campo>
          </>
        ) : (
          <>
            {dia}
            {horaDoDia}
          </>
        )}
      </div>
    </>
  );
}
