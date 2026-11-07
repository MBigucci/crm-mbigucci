"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Folha } from "@/components/folha";
import { supabase } from "@/lib/supabase";
import {
  AVISO_LOCALIZACAO,
  ROTULO_ACAO,
  SAIU_DO_STAND,
  botaoDoEstado,
  hora,
  linhaDoStand,
  mostraBotao,
  ordinal,
  sinalCurto,
  textoEscopo,
  textoPosicao,
  textoPrimeiraVez,
  tituloFolha,
  type AcaoFolha,
  type Fila,
  type Tom,
} from "@/lib/distribuicao";
import {
  abrirFolha,
  executar,
  fecharFolha,
  jaViuAvisoLocal,
  responderSaida,
  useDistribuicaoStore,
} from "@/lib/distribuicao-dados";

export const corDoTom: Record<Tom, string> = {
  red: "text-brand",
  ok: "text-ok",
  wa: "text-wa",
  neutro: "text-ink-soft",
};

/**
 * O status do módulo (.mb-status do Alicerce): o recebimento de leads de hoje, no topo do computador e na
 * faixa do celular, com as mesmas folhas que o botão antigo abria. O sinal sai do rótulo ("✓ Recebendo") e
 * dá a cor do estado: ✓ ok, ! atenção, → andamento, – parado. "Receber leads", que não traz sinal, é uma
 * ação à espera: "!" em atenção. A posição ("3º na fila") entra como detalhe do status, que abre a folha
 * do estado; a folha da fila continua a um toque, no botão "Ver fila" ao lado (só quando há posição).
 */
const SINAL_DO_STATUS: Record<string, string> = { "✓": "mb-status--ok", "!": "mb-status--atencao", "→": "mb-status--info", "–": "" };

export function BotaoRecebimento() {
  const { estado } = useDistribuicaoStore();
  if (!estado || !mostraBotao(estado)) return null;
  const b = botaoDoEstado(estado);
  const pos = textoPosicao(estado);
  const achou = /^([✓!→–])\s+(.*)$/.exec(b.rotulo);
  const sinal = achou ? achou[1] : "!";
  const texto = achou ? achou[2] : b.rotulo;
  return (
    <>
      <button type="button" onClick={() => abrirFolha("estado")} aria-haspopup="dialog" className={clsx("mb-status", SINAL_DO_STATUS[sinal])}>
        <span className="mb-status__sinal" aria-hidden="true">
          {sinal}
        </span>{" "}
        {texto}
        {pos && (
          <>
            {" "}
            <span className="mb-status__detalhe">· {pos}</span>
          </>
        )}
      </button>
      {pos && (
        <button
          type="button"
          onClick={() => abrirFolha("fila")}
          aria-haspopup="dialog"
          aria-label={`${pos}. Ver a fila de leads`}
          className="mb-botao mb-botao--discreto mb-botao--p"
        >
          Ver fila
        </button>
      )}
    </>
  );
}

/** Linha abaixo do cabeçalho, só na Lista do dia: "Marco Zero · check-in 9h04 · Opções". */
export function LinhaDoStand() {
  const { estado } = useDistribuicaoStore();
  const linha = linhaDoStand(estado);
  if (!linha) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-soft">
      <span>{linha}</span>
      <span aria-hidden>·</span>
      <button type="button" className="focus-ring font-semibold text-brand underline underline-offset-2" onClick={() => abrirFolha("estado")}>
        Opções
      </button>
    </p>
  );
}

/** Todas as folhas da distribuição, uma de cada vez. Fica na casca. */
export function FolhasDistribuicao() {
  const { folha, estado } = useDistribuicaoStore();
  if (!folha || !estado) return null;
  if (folha === "fila") return <FolhaFila />;
  if (folha === "saida") return <FolhaSaida />;
  if (folha === "primeira") return <FolhaPrimeiraVez />;
  return <FolhaEstado />;
}

function Retorno() {
  const { checkin, erro } = useDistribuicaoStore();
  return (
    <>
      {checkin && (
        <p role="status" className={clsx("text-[14px] font-semibold", checkin.ok ? "text-ok" : "text-wa")}>
          {checkin.texto}
        </p>
      )}
      {erro && (
        <p role="alert" className="aviso-erro">
          ✕ {erro}
        </p>
      )}
    </>
  );
}

function AvisoLocal({ acoes }: { acoes: AcaoFolha[] }) {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => setMostrar(acoes.includes("checkin") && !jaViuAvisoLocal()), [acoes]);
  if (!mostrar) return null;
  return <p className="text-[13px] text-ink-soft">{AVISO_LOCALIZACAO}</p>;
}

function FolhaEstado() {
  const { estado, ocupado, checkin } = useDistribuicaoStore();
  const [pausando, setPausando] = useState(false);
  const [ate, setAte] = useState("");
  if (!estado) return null;
  const b = botaoDoEstado(estado);
  // Depois do check-in certo, a folha só mostra o resultado.
  const feito = checkin?.ok;

  return (
    <Folha titulo={tituloFolha(estado)} onFechar={fecharFolha}>
      {b.linha && <p className="text-[14px] text-ink-soft">{b.linha}</p>}
      {!feito && !pausando && <AvisoLocal acoes={b.acoes} />}
      <Retorno />
      {!feito && pausando && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void executar("pausar", ate || null);
          }}
        >
          <div>
            <label className="field-label" htmlFor="pausa-ate">
              Volta em (opcional)
            </label>
            <input id="pausa-ate" type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado} className="btn btn-red focus-ring flex-1">
              Pausar
            </button>
            <button type="button" className="btn btn-ghost focus-ring flex-1" onClick={() => setPausando(false)}>
              Voltar
            </button>
          </div>
        </form>
      )}
      {!feito && !pausando && b.acoes.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {b.acoes.map((a, i) => (
            <button
              key={a}
              type="button"
              disabled={ocupado}
              className={clsx("btn focus-ring", i === 0 ? "btn-red" : "btn-ghost", b.acoes.length % 2 === 1 && i === b.acoes.length - 1 && "col-span-2")}
              onClick={() => (a === "pausar" ? setPausando(true) : void executar(a))}
            >
              {ocupado && a === "checkin" ? "Lendo a localização…" : ROTULO_ACAO[a]}
            </button>
          ))}
        </div>
      )}
      {feito && (
        <button type="button" className="btn btn-ghost focus-ring" onClick={fecharFolha}>
          Fechar
        </button>
      )}
    </Folha>
  );
}

function FolhaPrimeiraVez() {
  const { estado, ocupado, checkin } = useDistribuicaoStore();
  if (!estado) return null;
  const t = textoPrimeiraVez(estado);
  const acao: AcaoFolha = t.acao === "Fazer check-in" ? "checkin" : "ligar";
  return (
    <Folha titulo={t.titulo} onFechar={fecharFolha}>
      <p className="text-[14px] text-ink-soft">{t.texto}</p>
      {!checkin?.ok && <AvisoLocal acoes={[acao]} />}
      <Retorno />
      {checkin?.ok ? (
        <button type="button" className="btn btn-ghost focus-ring" onClick={fecharFolha}>
          Fechar
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={ocupado} className="btn btn-red focus-ring" onClick={() => void executar(acao)}>
            {ocupado && acao === "checkin" ? "Lendo a localização…" : t.acao}
          </button>
          <button type="button" className="btn btn-ghost focus-ring" onClick={fecharFolha}>
            Agora não
          </button>
        </div>
      )}
    </Folha>
  );
}

function FolhaSaida() {
  const { ocupado } = useDistribuicaoStore();
  return (
    <Folha titulo={SAIU_DO_STAND.titulo} onFechar={fecharFolha}>
      <p className="text-[14px] text-ink-soft">{SAIU_DO_STAND.texto}</p>
      <Retorno />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={ocupado} className="btn btn-red focus-ring" onClick={() => void responderSaida(true)}>
          {SAIU_DO_STAND.sai}
        </button>
        <button type="button" disabled={ocupado} className="btn btn-ghost focus-ring" onClick={() => void responderSaida(false)}>
          {SAIU_DO_STAND.fica}
        </button>
      </div>
    </Folha>
  );
}

function FolhaFila() {
  const { estado } = useDistribuicaoStore();
  const [fila, setFila] = useState<Fila | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    supabase
      ?.rpc("distribuicao_fila")
      .then(({ data, error }) => (error ? setErro("Não foi possível ler a fila. Tente de novo.") : setFila(data as Fila)));
  }, []);
  const escopo = textoEscopo(fila?.escopo ?? estado?.escopo, fila?.equipe_nome ?? estado?.equipe_nome);
  const primeiras = (fila?.itens ?? []).filter((i) => i.posicao != null).slice(0, 4);
  return (
    <Folha titulo="Fila de leads" eyebrow={<span className="eyebrow">{escopo}</span>} onFechar={fecharFolha}>
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      {!fila && !erro && <p className="text-concrete">Carregando…</p>}
      {fila && (
        <ul className="grid">
          {primeiras.map((i) => {
            const s = sinalCurto(i.situacao);
            return (
              <li
                key={i.corretor_id}
                className={clsx("flex items-center gap-2 border-t border-line py-[7px] text-[14px] first:border-t-0", i.eu && "border-l-[3px] border-l-ink bg-paper pl-2")}
              >
                <span className="num w-7 shrink-0 font-bold text-ink-soft">{ordinal(i.posicao!)}</span>
                <span className="min-w-0 flex-1 font-semibold">
                  {i.eu ? "Você" : i.apelido}
                  {fila.escopo === "empresa" && i.equipe_nome && <span className="font-normal text-ink-soft"> · {i.equipe_nome}</span>}
                </span>
                <span className={clsx("font-semibold", corDoTom[s.tom])}>{s.texto}</span>
              </li>
            );
          })}
          {!primeiras.length && <li className="text-ink-soft">Ninguém na fila agora.</li>}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="text-ink-soft">{fila?.ultima ? `Última: ${fila.ultima.apelido}, ${hora(fila.ultima.quando)}` : ""}</span>
        <Link href="/fila/" className="link-acao focus-ring" onClick={fecharFolha}>
          Ver tudo
        </Link>
      </div>
    </Folha>
  );
}
