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
      <div className={className}>
        <span className="field-label">{rotulo}</span>
        <div className="flex items-center gap-2 rounded-sm border border-control bg-surface px-3 py-[9px]">
          <span className="min-w-0 flex-1 truncate font-semibold">
            {escolhido.apelido ?? escolhido.nome}
            {escolhido.equipe && <span className="font-normal text-ink-soft"> · {escolhido.equipe}</span>}
          </span>
          <button type="button" className="focus-ring shrink-0 text-[13px] font-semibold text-brand-dark underline" onClick={() => onEscolher(null)}>
            Trocar
          </button>
        </div>
      </div>
    );

  return (
    <div className={clsx("relative", className)}>
      <label className="field-label" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="input md:py-[9px] md:text-[14px]"
        role="combobox"
        aria-expanded={aberto && sugestoes.length > 0}
        aria-controls={lista}
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
        <ul id={lista} role="listbox" className="absolute inset-x-0 top-full z-10 rounded-b-sm border border-t-0 border-control bg-surface">
          {sugestoes.length ? (
            sugestoes.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === marcado}
                className={clsx("cursor-pointer border-t border-line px-3 py-2 text-[14px]", i === marcado && "border-l-[3px] border-l-ink bg-paper")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(p);
                }}
              >
                <b>{p.apelido ?? p.nome}</b>
                <span className="text-ink-soft">
                  {p.apelido ? ` · ${p.nome}` : ""}
                  {p.equipe ? ` · ${p.equipe}` : ""}
                </span>
              </li>
            ))
          ) : (
            <li className="border-t border-line px-3 py-2 text-[13px] text-ink-soft">Ninguém com esse apelido ou nome.</li>
          )}
        </ul>
      )}
    </div>
  );
}
