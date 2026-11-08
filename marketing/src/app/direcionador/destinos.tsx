"use client";

import { Cartao } from "@/components/alicerce/cartao";
import { ItemDaLista, Lista } from "@/components/alicerce/lista";
import { enderecoTxt, entregaTxt, type ConfigTela, type DestinoTela } from "@/lib/telas";

/**
 * Os destinos em Lista (guia Lista: uma linha por item, dentro de um Cartao). A linha mostra o nome, a entrega, o
 * endereço mascarado que o banco devolve, o limite do dia e se registra os envios; o editor completo abre no
 * PainelLateral. Nenhum nome de destino no código: o nome vem do banco.
 */
export function Destinos({ config, onEditar }: { config: ConfigTela; onEditar: (d: DestinoTela | "novo") => void }) {
  const externos = config.destinos.filter((d) => d.tipo === "externo");
  const vendas = config.destinos.find((d) => d.tipo === "vendas");
  return (
    <Cartao
      id="t-dest"
      titulo="Destinos"
      descricao="Para onde os leads podem ir."
      acao={
        <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => onEditar("novo")}>
          + Novo destino
        </button>
      }
    >
      <div className="mkt-destinos">
        <Lista rotulo="Destinos">
          {vendas && (
            <ItemDaLista
              titulo={vendas.nome}
              meta="Pela roleta do lead da empresa."
              lateral={
                <>
                  <span className="mkt-num">{vendas.hoje}</span> hoje
                </>
              }
            />
          )}
          {externos.map((d) => (
            <ItemDaLista
              key={d.id}
              titulo={
                <>
                  {d.nome}
                  {!d.ativo && <span className="mb-selo mkt-selo-ao-lado">– Desligado</span>}
                </>
              }
              meta={
                <>
                  {entregaTxt(d)} · {d.endereco ? <span className="mkt-num">{enderecoTxt(d)}</span> : `! ${enderecoTxt(d)}`} ·{" "}
                  {d.limite_dia ? `limite de ${d.limite_dia} por dia` : "sem limite por dia"} · {d.registrar_envios ? "✓ registra os envios" : "– não registra os envios"}
                </>
              }
              lateral={
                <>
                  <span className="mkt-hoje">
                    <span className="mkt-num">{d.hoje}</span>
                    {d.limite_dia ? (
                      <>
                        {" "}
                        de <span className="mkt-num">{d.limite_dia}</span>
                      </>
                    ) : null}{" "}
                    hoje
                  </span>
                  <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" aria-label={`Editar ${d.nome}`} onClick={() => onEditar(d)}>
                    Editar
                  </button>
                </>
              }
            />
          ))}
        </Lista>
      </div>
      <p className="mkt-nota">Se a entrega a qualquer destino falhar, o lead vai na hora para o Base360 Vendas, para não ficar sem atendimento.</p>
    </Cartao>
  );
}
