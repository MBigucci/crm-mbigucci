"use client";

import { useState } from "react";
import clsx from "clsx";
import { Seletor } from "@/components/alicerce/seletor";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { useSessao } from "@/lib/sessao";
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
  const { pode } = useSessao();
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
    <section className="mb-cartao stand-cartao" aria-labelledby={`t-vez-${papel}`}>
      <span className="mb-sobrelinha">{papel === "corretor" ? "No stand agora" : "Especialistas"}</span>
      <h2 id={`t-vez-${papel}`} className="mb-cartao__titulo mt-1">
        {titulo}
      </h2>

      {onTurno && <div className="mb-campo"><span className="mb-campo__rotulo" id={"turno-" + papel}>Turno</span><Seletor<Turno> idRotulo={"turno-" + papel} valor={turno} onChange={onTurno} grade="linha" opcoes={(["manha", "tarde"] as Turno[]).map(t => ({ valor: t, rotulo: (t === "manha" ? "Manhã 9h–14h" : "Tarde 14h–19h") + " · " + conta(t) }))} /></div>}

      <div className="mt-3">
        {aberta && pode("plantao.confirmar") ? (
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
          <p className="stand-nota">
            Pôr na vez abre das {TEXTO_JANELA[turno]}.
          </p>
        )}
        {aviso && <p className="mt-2 stand-nota font-semibold">{aviso}</p>}
      </div>

      {linhas.length ? (
        <>
          <ol className="mb-ranking stand-vez">{linhas.slice(0, 10).map(l => <Linha key={l.presenca_id} l={l} compacto={compacto} podeMudar={pode("plantao.confirmar")} onAcao={t => acao(l, t)} />)}</ol>
          {linhas.length > 10 && <Recolhivel titulo={"Ver as " + linhas.length + " pessoas na vez"}><ol className="mb-ranking stand-vez" start={11}>{linhas.slice(10).map(l => <Linha key={l.presenca_id} l={l} compacto={compacto} podeMudar={pode("plantao.confirmar")} onAcao={t => acao(l, t)} />)}</ol></Recolhivel>}
        </>

      ) : (
        <p className="mt-3 stand-nota">
          <span className="font-semibold stand-nota">! Ninguém na vez neste período.</span>{" "}
          <span className="stand-nota">
            {aberta ? "Digite o apelido em Pôr na vez, na ordem da roleta do stand." : `A vez é montada das ${TEXTO_JANELA[turno]}.`}
          </span>
        </p>
      )}
      {papel === "corretor" && linhas.length > 0 && (
        <p className="mt-2 stand-nota stand-ajuda">✓ = cliente novo recebido. Quem saiu é pulado até voltar.</p>
      )}
    </section>
  );
}

function Linha({ l, compacto, podeMudar, onAcao }: { l: LinhaVez; compacto: boolean; podeMudar: boolean; onAcao: (t: "saida" | "volta" | "passou_vez" | "encerrou") => void }) {
  return <li className="mb-ranking__item stand-vez__linha">
    <span className="mb-ranking__posicao">{l.ordem}º</span>
    <div className="mb-ranking__nome"><strong className="mb-ranking__quem">{nomeNaVez(l)}</strong><span className="mb-ranking__detalhe">{[!compacto && l.equipe, l.rodadas + (l.rodadas === 1 ? " cliente novo recebido" : " clientes novos recebidos")].filter(Boolean).join(" · ")}</span></div>
    <div className="stand-vez__acoes"><span className="mb-ranking__valor">{estadoDaLinha(l).texto}</span>{podeMudar && <AcoesLinha linha={l} onAcao={onAcao} />}</div>
  </li>;
}

function AcoesLinha({ linha, onAcao }: { linha: LinhaVez; onAcao: (t: "saida" | "volta" | "passou_vez" | "encerrou") => void }) {
  const [mais, setMais] = useState(false);
  const btn = "mb-botao mb-botao--discreto mb-botao--p";
  if (linha.estado === "encerrou") return null;
  return (
    <span className="mb-grupo-botoes stand-vez__botoes">
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
        <button type="button" className={clsx(btn, "")} aria-label={`Mais ações de ${nomeNaVez(linha)}`} onClick={() => setMais(true)}>
          Mais
        </button>
      )}
    </span>
  );
}
