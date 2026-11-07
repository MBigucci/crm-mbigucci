"use client";

import Link from "next/link";
import { nomeStatus } from "@/lib/catalogo";
import { NOTA_MINIMA, temPerfil, type PerfilDoLead, type Resultado } from "@/lib/match";
import type { Lead } from "@/lib/leads";
import { Cartao } from "./cartao";
import { Prazo } from "./prazo";

/**
 * O Radar de Match da ficha no Alicerce (passo f do item 48): as mesmas regras e textos do `RadarDoLead` do
 * DS antigo (o cálculo e a lista vêm dele), desenhados com Cartao, sub-seções planas e Prazo. O ✓ é texto normal;
 * o ! pede atenção (âmbar) e o ✕ não combina (vermelho), sempre com o sinal. "Mandar →" abre a mensagem pronta
 * (`onMandar`, a da ficha) e "Ver todos" é o botão discreto com `aria-expanded`.
 */
export function RadarAlicerce({
  lead,
  lista,
  visiveis,
  todos,
  onAlternar,
  onMandar,
  inicial = 4,
}: {
  lead: Pick<Lead, "nome"> & PerfilDoLead;
  lista: Resultado[] | null | undefined;
  visiveis: Resultado[] | null;
  todos: boolean;
  onAlternar: () => void;
  onMandar?: (empreendimento: string) => void;
  inicial?: number;
}) {
  return (
    <Cartao
      id="radar-titulo"
      titulo={`Radar: empreendimentos que combinam${lista?.length ? ` · ${lista.length}` : ""}`}
    >
      <div className="ficha__corpo">
        {!temPerfil(lead) && <p className="ficha__texto">Preencha o perfil do cliente (valor, dormitórios, região ou finalidade) para ver o que combina.</p>}
        {temPerfil(lead) && !lista && <p className="ficha__texto">Carregando…</p>}
        {temPerfil(lead) && lista && !lista.length && <p className="ficha__texto">Nenhum empreendimento com {NOTA_MINIMA}% ou mais para este perfil.</p>}
        {visiveis && visiveis.length > 0 && (
          <div className="mb-subsecoes">
            {visiveis.map((r) => (
              <div key={r.empreendimento.id} className="mb-subsecao ficha__corpo">
                <div className="ficha__linha">
                  <Link href={`/empreendimentos/ver/?slug=${r.empreendimento.slug}`} className="mb-link">
                    {r.empreendimento.nome}
                  </Link>
                  <span className="ficha__valor mb-valor" aria-label={`Nota ${r.nota} de 100`}>
                    {r.nota}%
                  </span>
                </div>
                <p className="ficha__texto">{[nomeStatus(r.empreendimento.status), r.empreendimento.bairro, r.tipologia?.rotulo].filter(Boolean).join(" · ")}</p>
                <ul className="ficha__motivos">
                  {r.motivos.map((m, i) => (
                    <li key={i}>
                      {m.sinal === "✓" ? (
                        <>
                          <span aria-hidden>{m.sinal} </span>
                          {m.texto}
                        </>
                      ) : (
                        <Prazo nivel={m.sinal === "✕" ? "estourado" : "atencao"}>
                          <span aria-hidden>{m.sinal} </span>
                          {m.texto}
                        </Prazo>
                      )}
                    </li>
                  ))}
                </ul>
                {onMandar && (
                  <div className="mb-grupo-botoes">
                    <button
                      type="button"
                      className="mb-botao mb-botao--secundario mb-botao--p"
                      aria-haspopup="dialog"
                      aria-label={`Mandar o ${r.empreendimento.nome} para ${lead.nome}`}
                      onClick={() => onMandar(r.empreendimento.nome)}
                    >
                      Mandar →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {lista && lista.length > inicial && (
          <div className="mb-grupo-botoes">
            <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" aria-expanded={todos} onClick={onAlternar}>
              {todos ? "Ver menos" : `Ver todos os ${lista.length}`}
            </button>
          </div>
        )}
      </div>
    </Cartao>
  );
}
