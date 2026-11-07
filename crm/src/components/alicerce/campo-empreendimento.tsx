"use client";

import { nomesDoCatalogo } from "@/lib/catalogo";
import { useCatalogo } from "@/lib/catalogo-dados";
import { CampoSelecao } from "./campo";

/**
 * O campo Empreendimento no Alicerce: o `select` do Campo (a mesma seta dos outros), com os empreendimentos do
 * catálogo. O valor que o registro já tem e não está no catálogo continua na lista, para não se perder.
 * `vazio` é o texto da opção sem escolha (“Escolha o empreendimento”, ou “–” quando o campo é opcional).
 */
export function CampoEmpreendimento({
  valor,
  onChange,
  colunas,
  vazio = "Escolha o empreendimento",
}: {
  valor: string;
  onChange: (valor: string) => void;
  colunas?: number;
  vazio?: string;
}) {
  const { catalogo } = useCatalogo();
  const nomes = nomesDoCatalogo(catalogo);
  const lista = valor && !nomes.includes(valor) ? [valor, ...nomes] : nomes;
  return (
    <CampoSelecao rotulo="Empreendimento" colunas={colunas}>
      <select className="mb-campo__entrada" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">{vazio}</option>
        {lista.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </CampoSelecao>
  );
}
