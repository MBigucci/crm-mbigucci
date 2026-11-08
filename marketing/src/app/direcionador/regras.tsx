"use client";

import { Aviso } from "@/components/alicerce/aviso";
import { Cartao } from "@/components/alicerce/cartao";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Interruptor } from "@/components/alicerce/interruptor";
import { diasTxt, distTxt, horaTxt, listaTxt, type ConfigTela, type ProdutoTela, type RegraTela } from "@/lib/telas";

/** A regra por extenso (guia ConstrutorDeCondicoes: `.mb-condicoes__frase`), a mesma da lista e do editor. */
export function FraseDaRegra({ config, produtos, regra }: { config: ConfigTela; produtos: ProdutoTela[]; regra: Pick<RegraTela, "produtos" | "fontes" | "dias" | "hora_inicio" | "hora_fim"> & { partes: { destino_id: string; porcentagem: number }[] } }) {
  const produtoNome = (id: string) => produtos.find((p) => p.id === id)?.nome ?? "produto fora do catálogo";
  const fonteNome = (slug: string) => config.fontes.find((f) => f.slug === slug)?.nome ?? slug;
  return (
    <p className="mb-condicoes__frase">
      Se o lead chegar com produto <em>{listaTxt(regra.produtos.map(produtoNome), "qualquer um")}</em> e fonte{" "}
      <em>{listaTxt(regra.fontes.map(fonteNome), "qualquer uma")}</em>, em <em>{diasTxt(regra.dias).toLowerCase()}</em>, <em>{horaTxt(regra).toLowerCase()}</em>, então mande{" "}
      <em>{distTxt(regra.partes, config.destinos).replace(/^→ /, "")}</em>.
    </p>
  );
}

/** As regras na ordem em que são lidas: um Cartao por regra, com o Interruptor que vale na hora (guia Interruptor). */
export function Regras({
  config,
  produtos,
  ocupado,
  onEditar,
  onNova,
  onLigar,
  onMover,
}: {
  config: ConfigTela;
  produtos: ProdutoTela[];
  ocupado: boolean;
  onEditar: (r: RegraTela) => void;
  onNova: () => void;
  onLigar: (r: RegraTela, k: number) => void;
  onMover: (k: number, para: number) => void;
}) {
  return (
    <section aria-labelledby="t-regras" className="mkt-regras">
      <div className="mkt-titulo-secao">
        <div>
          <h2 className="mb-cartao__titulo" id="t-regras">
            Regras
          </h2>
          <p className="mb-cartao__descricao">Na ordem em que são lidas. A primeira que servir leva o lead.</p>
        </div>
      </div>
      {!config.regras.length ? (
        <div className="mb-cartao">
          <div className="mb-cartao__corpo">
            <EstadoVazio
              titulo="Nenhuma regra ainda"
              texto="Tudo vai para o Base360 Vendas. Crie uma regra para mandar um tipo de lead para outro destino."
              acao={
                <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={onNova}>
                  + Nova regra
                </button>
              }
            />
          </div>
        </div>
      ) : (
        <ol className="mkt-regras__lista">
          {config.regras.map((r, k) => {
            const vale = r.ativa && config.ativo;
            return (
              <li key={r.id} className={vale ? undefined : "mkt-apagada"}>
                <Cartao
                  id={`t-regra-${r.id}`}
                  titulo={`${k + 1}. ${r.nome}`}
                  descricao={!config.ativo ? "Sem valer: a chave geral está desligada." : r.ativa ? undefined : "Desligada: os leads passam para a próxima regra."}
                  acao={<Interruptor ligado={r.ativa} rotulo={`Regra ${k + 1}, ${r.nome}`} desativado={ocupado} onAlternar={() => onLigar(r, k)} />}
                  rodape={
                    <>
                      <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado || k === 0} aria-label={`Subir regra ${k + 1}`} onClick={() => onMover(k, k - 1)}>
                        Subir
                      </button>
                      <button
                        type="button"
                        className="mb-botao mb-botao--discreto mb-botao--p"
                        disabled={ocupado || k === config.regras.length - 1}
                        aria-label={`Descer regra ${k + 1}`}
                        onClick={() => onMover(k, k + 1)}
                      >
                        Descer
                      </button>
                      <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" aria-label={`Editar regra ${k + 1}`} onClick={() => onEditar(r)}>
                        Editar
                      </button>
                    </>
                  }
                >
                  <FraseDaRegra config={config} produtos={produtos} regra={r} />
                  {r.partes.length > 1 && (
                    <p className="mkt-nota">
                      Enviados desde que a regra foi salva:{" "}
                      {r.partes.map((p, i) => (
                        <span key={p.destino_id}>
                          {i > 0 && " · "}
                          <span className="mkt-num">{p.enviados}</span> {config.destinos.find((d) => d.id === p.destino_id)?.nome}
                        </span>
                      ))}
                    </p>
                  )}
                </Cartao>
              </li>
            );
          })}
        </ol>
      )}
      <Aviso tom="info" titulo="Nenhuma regra casou, ou a entrega falhou: o lead vai para o Base360 Vendas" texto="Pela roleta do lead da empresa." />
    </section>
  );
}
