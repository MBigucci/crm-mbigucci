"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { buscarPessoas, type Papel, type Pessoa } from "@/lib/recepcao";

/**
 * Campo de busca por apelido ou nome, com sugestões. Setas escolhem, Enter
 * confirma a sugestão marcada (a primeira, se nenhuma), Esc limpa.
 */
export function BuscaPessoa({
  id,
  rotulo,
  pessoas,
  papel,
  placeholder,
  onEscolher,
  desabilitado,
  limparAoEscolher = true,
  escolhido,
  className,
}: {
  id: string;
  rotulo: string;
  pessoas: Pessoa[];
  papel: Papel;
  placeholder?: string;
  onEscolher: (p: Pessoa | null) => void;
  desabilitado?: boolean;
  limparAoEscolher?: boolean;
  /** Quando o campo guarda uma escolha (corretor que indicou): mostra o escolhido. */
  escolhido?: Pessoa | null;
  className?: string;
}) {
  const [texto, setTexto] = useState("");
  const [marcado, setMarcado] = useState(0);
  const lista = useId();
  const sugestoes = buscarPessoas(pessoas, texto, papel);
  const aberto = !!texto.trim() && !desabilitado;

  function escolher(p: Pessoa) {
    onEscolher(p);
    setTexto(limparAoEscolher ? "" : "");
    setMarcado(0);
  }

  if (escolhido)
    return (
      <div className={clsx("mb-campo", className)}>
        <span className="mb-campo__rotulo">{rotulo}</span>
        <div className="mb-campo__entrada flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">
            {escolhido.apelido ?? escolhido.nome}
            {escolhido.equipe && <span className="font-normal stand-nota"> · {escolhido.equipe}</span>}
          </span>
          <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => onEscolher(null)}>
            Trocar
          </button>
        </div>
      </div>
    );

  return (
    <div className={clsx("mb-campo mb-sugestoes-alvo", className)}>
      <label className="mb-campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="mb-campo__entrada"
        role="combobox"
        aria-expanded={aberto && sugestoes.length > 0}
        aria-controls={lista}
        aria-activedescendant={aberto && sugestoes[marcado] ? `${lista}-${marcado}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder ?? "Apelido ou nome"}
        disabled={desabilitado}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setMarcado(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMarcado((m) => Math.min(m + 1, sugestoes.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMarcado((m) => Math.max(m - 1, 0));
          } else if (e.key === "Enter" && aberto) {
            e.preventDefault();
            const p = sugestoes[marcado] ?? sugestoes[0];
            if (p) escolher(p);
          } else if (e.key === "Escape") {
            setTexto("");
          }
        }}
      />
      {aberto && (
        <ul id={lista} role="listbox" className="mb-sugestoes">
          {sugestoes.length ? (
            sugestoes.map((p, i) => (
              <li
                key={p.id}
                id={`${lista}-${i}`}
                role="option"
                aria-selected={i === marcado}
                className="mb-sugestoes__opcao"
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(p);
                }}
              >
                <b>{p.apelido ?? p.nome}</b>
                <span className="stand-nota">
                  {p.apelido ? ` · ${p.nome}` : ""}
                  {p.equipe ? ` · ${p.equipe}` : ""}
                </span>
              </li>
            ))
          ) : (
            <li className="mb-sugestoes__vazio">Ninguém com esse apelido ou nome.</li>
          )}
        </ul>
      )}
    </div>
  );
}
