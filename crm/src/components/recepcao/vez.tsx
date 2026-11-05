"use client";

import { useState } from "react";
import clsx from "clsx";
import { novoId } from "@/lib/supabase";
import {
  estadoDaLinha,
  janelaAberta,
  nomeNaVez,
  TEXTO_JANELA,
  type LinhaVez,
  type Papel,
  type Pessoa,
  type Turno,
} from "@/lib/recepcao";
import { eventoNaVez, porNaVez } from "@/lib/recepcao-dados";
import { BuscaPessoa } from "./busca-pessoa";

export type DesfazerVez = { texto: string; eventoId: string };

/**
 * A vez de um papel (corretores ou especialistas) no turno: pôr na vez (só na
 * janela), a ordem da roleta do stand, as rodadas (✓) e as ações de cada linha.
 */
export function CartaoVez({
  standId,
  papel,
  turno,
  onTurno,
  vez,
  pessoas,
  agora,
  compacto = false,
  onMudou,
  onErro,
  onDesfazer,
}: {
  standId: string;
  papel: Papel;
  turno: Turno;
  onTurno?: (t: Turno) => void;
  vez: LinhaVez[];
  pessoas: Pessoa[];
  agora: Date;
  compacto?: boolean;
  onMudou: () => void;
  onErro: (e: string | null) => void;
  onDesfazer: (d: DesfazerVez) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const linhas = vez.filter((l) => l.turno === turno && l.papel === papel).sort((a, b) => a.ordem - b.ordem);
  const conta = (t: Turno) => vez.filter((l) => l.turno === t && l.papel === papel).length;
  const aberta = janelaAberta(turno, agora);
  const jaNaVez = new Set(linhas.map((l) => l.pessoa_id ?? l.especialista_id));
  const disponiveis = pessoas.filter((p) => p.papel === papel && !jaNaVez.has(p.id));
  const titulo = papel === "corretor" ? "Vez dos corretores" : "Vez dos especialistas";

  async function por(p: Pessoa | null) {
    if (!p) return;
    setAviso(null);
    onErro(null);
    setEnviando(true);
    const r = await porNaVez({
      id: novoId(),
      plantao: standId,
      turno,
      papel,
      ...(papel === "corretor" ? { pessoa: p.id } : { especialista: p.id }),
    });
    setEnviando(false);
    if (r.erro !== undefined) return onErro(r.erro);
    if (r.ok.status === "ja_na_vez") setAviso(`! ${p.apelido ?? p.nome} já está na vez.`);
    if (r.ok.status === "em_outro_stand") setAviso(`! ${p.apelido ?? p.nome} já está na vez de outro stand neste turno.`);
    onMudou();
  }

  async function acao(l: LinhaVez, tipo: "saida" | "volta" | "passou_vez" | "encerrou") {
    onErro(null);
    const id = novoId();
    const r = await eventoNaVez(id, l.presenca_id, tipo);
    onMudou();
    if (r.erro !== undefined) return onErro(r.erro);
    const nome = nomeNaVez(l);
    const texto = { saida: `${nome} saiu`, volta: `${nome} voltou`, passou_vez: `${nome} passou a vez`, encerrou: `${nome} não está mais` }[tipo];
    onDesfazer({ texto, eventoId: id });
  }

  return (
    <section className="card" aria-labelledby={`t-vez-${papel}`}>
      <span className="eyebrow">{papel === "corretor" ? "No stand agora" : "Especialistas"}</span>
      <h2 id={`t-vez-${papel}`} className="titulo-card mt-1">
        {titulo}
      </h2>

      {onTurno && (
        <div className="mt-3 flex border-b border-line" role="tablist" aria-label="Turno">
          {(["manha", "tarde"] as Turno[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={turno === t}
              className={clsx(
                "focus-ring -mb-px border-b-2 px-3 py-2 text-[13px] font-semibold",
                turno === t ? "border-ink text-ink" : "border-transparent text-ink-soft",
              )}
              onClick={() => onTurno(t)}
            >
              {t === "manha" ? "Manhã 9h–14h" : "Tarde 14h–19h"} · <span className="num">{conta(t)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {aberta ? (
          <BuscaPessoa
            id={`por-${papel}-${turno}`}
            rotulo={papel === "corretor" ? "Pôr na vez, na ordem da roleta" : "Pôr na vez"}
            pessoas={disponiveis}
            papel={papel}
            placeholder={papel === "corretor" ? "Digite o apelido ou o nome e tecle Enter" : "Nome do especialista e Enter"}
            desabilitado={enviando}
            onEscolher={por}
          />
        ) : (
          <p className="text-[13px] text-ink-soft">
            Pôr na vez abre das {TEXTO_JANELA[turno]}.
          </p>
        )}
        {aviso && <p className="mt-2 text-[13px] font-semibold text-wa">{aviso}</p>}
      </div>

      {linhas.length ? (
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="text-[11px] font-semibold uppercase tracking-eyebrow text-concrete border-b border-line py-2 pr-2">#</th>
              <th className="text-[11px] font-semibold uppercase tracking-eyebrow text-concrete border-b border-line py-2 pr-2">{papel === "corretor" ? "Apelido" : "Nome"}</th>
              <th className="text-[11px] font-semibold uppercase tracking-eyebrow text-concrete border-b border-line py-2 pr-2">Vez</th>
              <th className="hidden border-b border-line py-2 pr-2 text-[11px] font-semibold uppercase tracking-eyebrow text-concrete sm:table-cell">Estado</th>
              <th className="border-b border-line py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const est = estadoDaLinha(l);
              return (
                <tr key={l.presenca_id} className={clsx(l.da_vez && "bg-paper", est.tom === "fora" && "text-concrete")}>
                  <td className={clsx("num border-b border-line py-2 pr-2 font-bold text-ink-soft", l.da_vez && "border-l-[3px] border-l-ink pl-2")}>
                    {l.ordem}
                  </td>
                  <td className="whitespace-nowrap border-b border-line py-2 pr-2">
                    <b>{nomeNaVez(l)}</b>
                    {!compacto && l.equipe && <span className="block text-[11px] text-concrete">{l.equipe}</span>}
                    <span className={clsx("block text-[12px] sm:hidden", tomEstado(est.tom))}>{est.texto}</span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line py-2 pr-2 font-bold tracking-[1px] text-ok" aria-label={`${l.rodadas} clientes da vez`}>
                    {"✓".repeat(Math.min(l.rodadas, 6))}
                    {l.rodadas > 6 ? <span className="num"> {l.rodadas}</span> : null}
                  </td>
                  <td className={clsx("hidden whitespace-nowrap border-b border-line py-2 pr-2 sm:table-cell", tomEstado(est.tom))}>
                    {est.texto}
                  </td>
                  <td className="whitespace-nowrap border-b border-line py-1 text-right">
                    <AcoesLinha linha={l} onAcao={(t) => acao(l, t)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-[13px]">
          <span className="font-semibold text-wa">! Ninguém na vez neste período.</span>{" "}
          <span className="text-ink-soft">
            {aberta ? "Digite o apelido em Pôr na vez, na ordem da roleta do stand." : `A vez é montada das ${TEXTO_JANELA[turno]}.`}
          </span>
        </p>
      )}
      {papel === "corretor" && linhas.length > 0 && (
        <p className="mt-2 text-[12px] text-concrete">✓ = cliente novo recebido. Quem saiu é pulado até voltar.</p>
      )}
    </section>
  );
}

const tomEstado = (tom: "vez" | "atencao" | "neutro" | "fora") =>
  tom === "vez" ? "font-bold text-ink" : tom === "atencao" ? "font-semibold text-wa" : tom === "neutro" ? "text-ink-soft" : "";

function AcoesLinha({ linha, onAcao }: { linha: LinhaVez; onAcao: (t: "saida" | "volta" | "passou_vez" | "encerrou") => void }) {
  const [mais, setMais] = useState(false);
  const btn = "btn btn-ghost focus-ring px-[7px] py-[5px] text-[12px]";
  if (linha.estado === "encerrou") return null;
  return (
    <span className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap">
      {linha.da_vez && (
        <button type="button" className={btn} onClick={() => onAcao("passou_vez")}>
          Passar a vez
        </button>
      )}
      {linha.estado === "saiu" ? (
        <button type="button" className={btn} onClick={() => onAcao("volta")}>
          Voltou
        </button>
      ) : (
        <button type="button" className={btn} onClick={() => onAcao("saida")}>
          Saiu
        </button>
      )}
      {mais ? (
        <button
          type="button"
          className={btn}
          onClick={() => {
            setMais(false);
            onAcao("encerrou");
          }}
          onBlur={() => setMais(false)}
          autoFocus
        >
          Não está mais
        </button>
      ) : (
        <button type="button" className={clsx(btn, "border-transparent")} aria-label={`Mais ações de ${nomeNaVez(linha)}`} onClick={() => setMais(true)}>
          Mais
        </button>
      )}
    </span>
  );
}
