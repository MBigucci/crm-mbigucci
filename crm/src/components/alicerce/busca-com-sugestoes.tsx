"use client";

import clsx from "clsx";
import { useId, useRef, useState } from "react";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * BuscaComSugestoes do Alicerce (project/components/BuscaComSugestoes), em React: `.mb-campo.mb-sugestoes-alvo` com
 * o `input[role=combobox]` e a `ul.mb-sugestoes[role=listbox]`. Setas escolhem, Enter confirma, Esc fecha, toque escolhe;
 * o estado de aberto e da opção ativa é do React (o `MB.sugestoes.ligar` não entra em DOM do React). Busca sem acento, em
 * qualquer parte do nome, no máximo 8, com “Refine a busca” quando há mais. O texto livre continua valendo: quem usa diz
 * em `ajuda` quando não está na lista. Sem a opção “Cadastrar” (`--criar`): aqui ela cadastraria no catálogo.
 */
export type OpcaoDeBusca = { valor: string; detalhe?: string };

const MAXIMO = 8;

export function BuscaComSugestoes({
  rotulo,
  idEntrada,
  valor,
  onChange,
  opcoes,
  ajuda,
  opcional,
  nomeDoQueBusca = "empreendimento",
  colunas,
}: {
  rotulo: string;
  idEntrada: string;
  valor: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoDeBusca[];
  ajuda?: React.ReactNode;
  opcional?: string;
  /** Para o texto do “sem resultado”: “Nenhum empreendimento com ‘xyz’.” */
  nomeDoQueBusca?: string;
  colunas?: number;
}) {
  const base = useId().replace(/:/g, "");
  const idLista = `${base}-lista`;
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const fecharEm = useRef<number | null>(null);

  const termo = semAcento(valor.trim());
  const achadas = termo ? opcoes.filter((o) => semAcento(o.valor).includes(termo)) : opcoes;
  const visiveis = achadas.slice(0, MAXIMO);
  const mostrar = aberta && (visiveis.length > 0 || !!termo);

  function escolher(o: OpcaoDeBusca) {
    onChange(o.valor);
    setAberta(false);
    setAtiva(-1);
  }
  function destacar(nome: string) {
    const i = semAcento(nome).indexOf(termo);
    if (!termo || i < 0) return nome;
    return (
      <>
        {nome.slice(0, i)}
        <mark>{nome.slice(i, i + termo.length)}</mark>
        {nome.slice(i + termo.length)}
      </>
    );
  }

  return (
    <div className="mb-campo mb-sugestoes-alvo" style={colunas ? ({ "--mb-colunas": colunas } as React.CSSProperties) : undefined}>
      <label className="mb-campo__rotulo" htmlFor={idEntrada}>
        {rotulo}
        {opcional && (
          <>
            {" "}
            <span className="mb-campo__opcional">{opcional}</span>
          </>
        )}
      </label>
      <input
        id={idEntrada}
        className="mb-campo__entrada"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-activedescendant={mostrar && ativa >= 0 ? `${base}-${ativa}` : undefined}
        autoComplete="off"
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAberta(true);
          setAtiva(-1);
        }}
        onFocus={() => {
          if (fecharEm.current) window.clearTimeout(fecharEm.current);
          setAberta(true);
        }}
        onBlur={() => {
          fecharEm.current = window.setTimeout(() => setAberta(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setAberta(true);
            if (!visiveis.length) return;
            setAtiva((a) => (e.key === "ArrowDown" ? (a + 1) % visiveis.length : (a - 1 + visiveis.length) % visiveis.length));
          } else if (e.key === "Enter" && mostrar && ativa >= 0 && visiveis[ativa]) {
            e.preventDefault();
            escolher(visiveis[ativa]);
          } else if (e.key === "Escape") {
            setAberta(false);
            setAtiva(-1);
          }
        }}
      />
      <ul className="mb-sugestoes" id={idLista} role="listbox" aria-label="Sugestões" hidden={!mostrar}>
        {visiveis.map((o, i) => (
          <li
            key={o.valor}
            id={`${base}-${i}`}
            className={clsx("mb-sugestoes__opcao")}
            role="option"
            aria-selected={i === ativa}
            data-valor={o.valor}
            onMouseDown={(e) => {
              e.preventDefault();
              escolher(o);
            }}
          >
            <span>{destacar(o.valor)}</span>
            {o.detalhe && <small>{o.detalhe}</small>}
          </li>
        ))}
        {achadas.length > MAXIMO && <li className="mb-sugestoes__vazio" role="presentation">Refine a busca.</li>}
        {termo && achadas.length === 0 && <li className="mb-sugestoes__vazio" role="presentation">{`Nenhum ${nomeDoQueBusca} com “${valor.trim()}”.`}</li>}
      </ul>
      {ajuda && <span className="mb-campo__ajuda">{ajuda}</span>}
    </div>
  );
}
