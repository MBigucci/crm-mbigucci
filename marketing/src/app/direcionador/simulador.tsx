"use client";

import { useMemo, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { CampoEmGrupo } from "@/components/alicerce/campo";
import { DataHora } from "@/components/alicerce/data-hora";
import { ItemDaLista, Lista } from "@/components/alicerce/lista";
import { Seletor } from "@/components/alicerce/seletor";
import { paraCampos } from "@/alicerce/para-campos";
import { agoraSP, DIAS_LONGO, simular, type ConfigTela, type ProdutoTela } from "@/lib/telas";

const NAO_RECONHECIDO = "__nao_reconhecido";

/** O dia da semana (0 = domingo) de uma data aaaa-mm-dd. Meio-dia, para o fuso do aparelho não virar o dia. */
const diaDaSemana = (data: string) => new Date(`${data}T12:00:00`).getDay();

/**
 * Teste sem gravar, montado como o guia do ConstrutorDeCondicoes manda (ConstrutorDeCondicoes.md:14, "Simular"): um Cartao, os
 * campos das condições (Seletor para produto e fonte, DataHora para o dia e a hora) e o resultado em Lista. A
 * regra é a mesma da Edge Function (simular, em lib/telas.ts), com os contadores de agora.
 */
export function Simulador({ config, produtos }: { config: ConfigTela; produtos: ProdutoTela[] }) {
  const [produto, setProduto] = useState<string>(produtos[0]?.id ?? NAO_RECONHECIDO);
  const [fonte, setFonte] = useState<string>(config.fontes.find((f) => f.slug === "zap")?.slug ?? config.fontes[0]?.slug ?? NAO_RECONHECIDO);
  const [quando, setQuando] = useState(() => ({ data: paraCampos(new Date()).data, hora: "10:30" }));

  const dia = quando.data ? diaDaSemana(quando.data) : 0;
  const r = useMemo(
    () =>
      simular(config, produtos, {
        produto_id: produto === NAO_RECONHECIDO ? null : produto,
        fonte: fonte === NAO_RECONHECIDO ? null : fonte,
        dia,
        hora: quando.hora || "00:00",
      }),
    [config, produtos, produto, fonte, dia, quando.hora],
  );

  return (
    <Cartao id="t-sim" titulo="Simulador" descricao="Teste sem gravar: um lead que não existe contra as regras.">
      <div className="mkt-simulador">
        <CampoEmGrupo id="s-produto" rotulo="Produto">
          <Seletor
            idRotulo="s-produto"
            grade="linha"
            pequeno
            valor={produto}
            onChange={setProduto}
            opcoes={[...produtos.map((p) => ({ valor: p.id, rotulo: p.nome })), { valor: NAO_RECONHECIDO, rotulo: "Não reconhecido" }]}
          />
        </CampoEmGrupo>
        <CampoEmGrupo id="s-fonte" rotulo="Fonte">
          <Seletor
            idRotulo="s-fonte"
            grade="linha"
            pequeno
            valor={fonte}
            onChange={setFonte}
            opcoes={[...config.fontes.map((f) => ({ valor: f.slug, rotulo: f.nome })), { valor: NAO_RECONHECIDO, rotulo: "Não reconhecida" }]}
          />
        </CampoEmGrupo>
        <CampoEmGrupo id="s-quando" rotulo="Quando o lead chega" ajuda={`${DIAS_LONGO[dia]}, dia e hora de São Paulo.`}>
          <DataHora idRotulo="s-quando" data={quando.data} hora={quando.hora} onChange={setQuando} />
          <div>
            <button
              type="button"
              className="mb-botao mb-botao--discreto mb-botao--p"
              onClick={() => setQuando({ data: paraCampos(new Date()).data, hora: agoraSP().hora })}
            >
              Usar agora
            </button>
          </div>
        </CampoEmGrupo>

        <div className="mkt-resultado" aria-live="polite">
          <span className="mb-condicoes__rotulo">{r.quem}</span>
          <strong className="mkt-resultado__destino">{r.destino}</strong>
          <p className="mkt-nota">{r.por}</p>
        </div>
        {r.passos.length > 0 && (
          <Lista rotulo="Passos, regra por regra">
            {r.passos.map((p) => (
              <ItemDaLista
                key={p.texto}
                ancora={
                  <span className="mkt-sinal" aria-hidden="true">
                    {p.casou ? "✓" : "–"}
                  </span>
                }
                titulo={p.texto}
              />
            ))}
          </Lista>
        )}
      </div>
    </Cartao>
  );
}
