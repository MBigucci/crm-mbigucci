"use client";

// Tela Direcionador (Base360 Marketing), só do gerente geral. Protótipo
// aprovado: docs/mockups/direcionador.html. Regras de negócio:
// docs/direcionador/direcionador.md. Nenhum nome de destino no código: os
// nomes vêm do banco (cfg_ler), digitados pelo gerente geral.

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { useSessao } from "@/lib/sessao";
import {
  excluirRegra,
  lerConfig,
  lerProdutos,
  ligarRegra,
  ordenarRegras,
  salvarChaveGeral,
} from "@/lib/direcionador-dados";
import {
  diasTxt,
  distTxt,
  enderecoTxt,
  entregaTxt,
  horaTxt,
  limiteTxt,
  listaTxt,
  temExterno,
  type ConfigTela,
  type DestinoTela,
  type ProdutoTela,
  type RegraTela,
} from "@/lib/telas";
import { Chave } from "./chave";
import { EditorDestino } from "./editor-destino";
import { EditorRegra } from "./editor-regra";
import { Simulador } from "./simulador";
import "./direcionador.css";

export default function Direcionador() {
  const { ehGerenteGeral } = useSessao();
  const [config, setConfig] = useState<ConfigTela | null>(null);
  const [produtos, setProdutos] = useState<ProdutoTela[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [regraAberta, setRegraAberta] = useState<RegraTela | "nova" | null>(null);
  const [destinoAberto, setDestinoAberto] = useState<DestinoTela | "novo" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const avisar = useCallback((t: string) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([lerConfig(), lerProdutos()]);
      setConfig(c);
      setProdutos(p);
      setErro(c ? null : "Seu perfil não tem acesso a esta página.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // Só o gerente geral chega a pedir: para os outros, o banco devolveria zero linhas.
    if (ehGerenteGeral) void recarregar();
  }, [ehGerenteGeral, recarregar]);

  /** Grava, recarrega e avisa; erro vira aviso com ✕. */
  const fazer = useCallback(
    async (acao: () => Promise<unknown>, ok: string) => {
      setOcupado(true);
      try {
        await acao();
        await recarregar();
        avisar(ok);
      } catch (e) {
        avisar(`✕ ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setOcupado(false);
      }
    },
    [avisar, recarregar],
  );

  const novaRegra = (
    <button type="button" className="btn btn-red focus-ring hidden sm:inline-flex" onClick={() => setRegraAberta("nova")} disabled={!config}>
      + Nova regra
    </button>
  );

  return (
    <Casca titulo="Direcionador de leads" eyebrow="Só o gerente geral vê" soGerenteGeral acao={novaRegra}>
      <p className="-mt-3 mb-5 max-w-[68ch] text-ink-soft">
        A primeira regra ligada que casar decide para onde vai o lead. Sem regra, ele vai para o Base360 Vendas.
      </p>

      {erro && (
        <div className="card bar-brand mb-4 max-w-[560px]" role="alert">
          <p className="aviso-erro">✕ {erro}</p>
          <button type="button" className="btn btn-ghost focus-ring mt-3" onClick={() => void recarregar()}>
            Tentar de novo
          </button>
        </div>
      )}
      {!config && !erro && <p className="text-concrete">Carregando…</p>}

      {config && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="grid min-w-0 gap-[14px]">
            <ChaveGeral config={config} ocupado={ocupado} onTrocar={(v) => fazer(() => salvarChaveGeral(v), v ? "✓ Direcionador ligado" : "– Direcionador desligado. Tudo vai para o Vendas")} />
            <Regras
              config={config}
              produtos={produtos}
              ocupado={ocupado}
              onEditar={setRegraAberta}
              onLigar={(r, k) => fazer(() => ligarRegra(r.id, !r.ativa), r.ativa ? `– Regra ${k + 1} desligada` : `✓ Regra ${k + 1} ligada`)}
              onMover={(k, para) => {
                const ids = config.regras.map((r) => r.id);
                [ids[k], ids[para]] = [ids[para], ids[k]];
                return fazer(() => ordenarRegras(ids), `✓ Regra agora na posição ${para + 1}`);
              }}
            />
          </div>
          <div className="grid min-w-0 gap-[14px]">
            <Simulador config={config} produtos={produtos} />
            <Destinos config={config} onEditar={setDestinoAberto} />
          </div>
        </div>
      )}

      {/* Celular: a ação principal no rodapé, ao alcance do polegar. */}
      {config && (
        <div className="sem-impressao fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-4 py-[10px] sm:hidden">
          <button type="button" className="btn btn-red focus-ring w-full" onClick={() => setRegraAberta("nova")}>
            + Nova regra
          </button>
        </div>
      )}

      {config && regraAberta && (
        <EditorRegra
          config={config}
          produtos={produtos}
          regra={regraAberta === "nova" ? null : regraAberta}
          posicao={regraAberta === "nova" ? config.regras.length + 1 : config.regras.indexOf(regraAberta) + 1}
          onFechar={() => setRegraAberta(null)}
          onSalvo={async (msg) => {
            setRegraAberta(null);
            await recarregar();
            avisar(msg);
          }}
          onExcluir={(r) => {
            setRegraAberta(null);
            void fazer(() => excluirRegra(r.id), `✓ Regra excluída: ${r.nome}`);
          }}
        />
      )}
      {config && destinoAberto && (
        <EditorDestino
          destino={destinoAberto === "novo" ? null : destinoAberto}
          usado={destinoAberto !== "novo" && config.regras.some((r) => r.partes.some((p) => p.destino_id === destinoAberto.id))}
          onFechar={() => setDestinoAberto(null)}
          onSalvo={async (msg) => {
            setDestinoAberto(null);
            await recarregar();
            avisar(msg);
          }}
        />
      )}

      {toast && (
        <div className="aviso-toast" role="status">
          {toast}
        </div>
      )}
    </Casca>
  );
}

function ChaveGeral({ config, ocupado, onTrocar }: { config: ConfigTela; ocupado: boolean; onTrocar: (v: boolean) => void }) {
  return (
    <section className={clsx("card flex flex-wrap items-center justify-between gap-4", !config.ativo && "bar-brand desligado")} aria-labelledby="t-geral">
      <div>
        <span className="eyebrow">Chave geral</span>
        <h2 className="titulo-card mt-[2px]" id="t-geral">
          Direcionador
        </h2>
        <p className="mt-1 max-w-[60ch] text-ink-soft">
          {config.ativo ? "As regras abaixo valem a cada lead que chega." : "Tudo vai para o Base360 Vendas. As regras ficam guardadas, sem valer."}
        </p>
      </div>
      <Chave ligada={config.ativo} rotuloLigada="Ligado" rotuloDesligada="Desligado" rotulado="t-geral" disabled={ocupado} onClick={() => onTrocar(!config.ativo)} />
    </section>
  );
}

function Regras({
  config,
  produtos,
  ocupado,
  onEditar,
  onLigar,
  onMover,
}: {
  config: ConfigTela;
  produtos: ProdutoTela[];
  ocupado: boolean;
  onEditar: (r: RegraTela) => void;
  onLigar: (r: RegraTela, k: number) => void;
  onMover: (k: number, para: number) => void;
}) {
  const produtoNome = (id: string) => produtos.find((p) => p.id === id)?.nome ?? "Produto fora do catálogo";
  return (
    <section aria-labelledby="t-regras">
      <div className="mb-[10px] mt-[6px]">
        <span className="eyebrow">Na ordem em que são lidas</span>
        <h2 className="titulo-card mt-[2px]" id="t-regras">
          Regras
        </h2>
      </div>
      {!config.regras.length ? (
        <p className="vazio">Nenhuma regra. Tudo vai para o Base360 Vendas. Toque em + Nova regra para mandar um tipo de lead para outro destino.</p>
      ) : (
        <ol className="grid gap-[10px]">
          {config.regras.map((r, k) => (
            <li
              key={r.id}
              className={clsx(
                "card grid items-start gap-x-[14px] gap-y-1 grid-cols-[26px_minmax(0,1fr)] sm:grid-cols-[34px_minmax(0,1fr)_auto]",
                !(r.ativa && config.ativo) && "apagada",
              )}
            >
              <span className="num pt-[2px] text-[22px] font-bold leading-none text-ink-soft">{k + 1}</span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold leading-[1.2]">{r.nome}</h3>
                <dl className="cond">
                  <div>
                    <dt>Produto</dt>
                    <dd>{listaTxt(r.produtos.map(produtoNome), "Qualquer")}</dd>
                  </div>
                  <div>
                    <dt>Fonte</dt>
                    <dd>{listaTxt(r.fontes.map((s) => config.fontes.find((f) => f.slug === s)?.nome ?? s), "Qualquer")}</dd>
                  </div>
                  <div>
                    <dt>Quando</dt>
                    <dd>
                      {diasTxt(r.dias)} · {horaTxt(r)}
                    </dd>
                  </div>
                </dl>
                <p className={clsx("mt-2 text-[14px] font-bold", temExterno(r.partes, config.destinos) && "text-brand-dark")}>{distTxt(r.partes, config.destinos)}</p>
                {r.partes.length > 1 && (
                  <p className="mt-1 text-[12px] text-concrete">
                    Enviados desde que a regra foi salva:{" "}
                    {r.partes.map((p, i) => (
                      <span key={p.destino_id}>
                        {i > 0 && " · "}
                        <span className="num">{p.enviados}</span> {config.destinos.find((d) => d.id === p.destino_id)?.nome}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="col-start-2 mt-2 flex flex-wrap items-center justify-between gap-2 sm:col-start-auto sm:mt-0 sm:flex-col sm:items-end">
                <Chave ligada={r.ativa} rotuloLigada="Ligada" rotuloDesligada="Desligada" rotuloAcessivel={`Regra ${k + 1}, ${r.nome}`} disabled={ocupado} onClick={() => onLigar(r, k)} />
                <div className="flex gap-[6px]">
                  <button type="button" className="btn btn-ghost btn-mini focus-ring" disabled={ocupado || k === 0} aria-label={`Subir regra ${k + 1}`} onClick={() => onMover(k, k - 1)}>
                    Subir
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-mini focus-ring"
                    disabled={ocupado || k === config.regras.length - 1}
                    aria-label={`Descer regra ${k + 1}`}
                    onClick={() => onMover(k, k + 1)}
                  >
                    Descer
                  </button>
                  <button type="button" className="btn btn-ghost btn-mini focus-ring" aria-label={`Editar regra ${k + 1}`} onClick={() => onEditar(r)}>
                    Editar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="padrao mt-[10px]">
        <span className="num mr-2 font-bold">–</span>
        Nenhuma regra casou, ou a entrega a um destino falhou: <b className="text-ink">→ Base360 Vendas</b>, pela roleta do lead da empresa.
      </p>
    </section>
  );
}

function Destinos({ config, onEditar }: { config: ConfigTela; onEditar: (d: DestinoTela | "novo") => void }) {
  const externos = config.destinos.filter((d) => d.tipo === "externo");
  const vendas = config.destinos.find((d) => d.tipo === "vendas");
  return (
    <section className="card" aria-labelledby="t-dest">
      <span className="eyebrow">Para onde os leads podem ir</span>
      <h2 className="titulo-card mt-[2px]" id="t-dest">
        Destinos
      </h2>
      <ul className="mt-3 grid gap-[10px]">
        {vendas && (
          <li className="flex items-start justify-between gap-3">
            <div>
              <b className="font-display text-[15px]">{vendas.nome}</b>
              <p className="mt-1 text-[13px] text-ink-soft">
                Pela roleta do lead da empresa. Hoje: <span className="num">{vendas.hoje}</span>
              </p>
            </div>
          </li>
        )}
        {externos.map((d) => (
          <li key={d.id} className="flex items-start justify-between gap-3 border-t border-line pt-[10px]">
            <div className="min-w-0">
              <b className="font-display text-[15px]">{d.nome}</b>
              {!d.ativo && <span className="ml-2 text-[13px] font-semibold text-neutral-mark">– Desligado</span>}
              <dl className="par">
                <dt>Entrega</dt>
                <dd>{entregaTxt(d)}</dd>
                <dt>Endereço</dt>
                <dd className={clsx(!d.endereco && "font-semibold text-wa")}>{d.endereco ? <span className="num">{enderecoTxt(d)}</span> : `! ${enderecoTxt(d)}`}</dd>
                <dt>Limite</dt>
                <dd>
                  {d.limite_dia ? (
                    <>
                      Até <span className="num">{d.limite_dia}</span> leads por dia; o resto vai para o Vendas
                    </>
                  ) : (
                    limiteTxt(d)
                  )}
                </dd>
                <dt>Hoje</dt>
                <dd>
                  <span className="num">{d.hoje}</span> {d.hoje === 1 ? "lead" : "leads"}
                  {d.limite_dia ? (
                    <>
                      {" "}
                      de <span className="num">{d.limite_dia}</span>
                    </>
                  ) : null}
                </dd>
                <dt>Registro</dt>
                <dd>
                  {d.registrar_envios ? (
                    <span className="font-semibold text-ok">✓ Entra no Marketing, com o envio no histórico do lead</span>
                  ) : (
                    <span className="font-semibold text-neutral-mark">– Não registra nada</span>
                  )}
                </dd>
              </dl>
            </div>
            <button type="button" className="btn btn-ghost btn-mini focus-ring" aria-label={`Editar ${d.nome}`} onClick={() => onEditar(d)}>
              Editar
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost focus-ring mt-3" onClick={() => onEditar("novo")}>
        + Novo destino
      </button>
      <p className="mt-[10px] text-[12px] text-concrete">
        Se a entrega a qualquer destino falhar, o lead vai na hora para o Base360 Vendas, para não ficar sem atendimento.
      </p>
    </section>
  );
}
