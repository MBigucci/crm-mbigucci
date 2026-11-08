"use client";

import { useEffect, useState } from "react";
import { Folha } from "@/components/folha";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";

/** Chama uma função do banco e devolve a mensagem de erro já traduzida. */
export async function chamar<T = unknown>(nome: string, args?: Record<string, unknown>): Promise<{ data: T | null; erro: string | null }> {
  const { data, error } = await db().rpc(nome, args);
  return { data: (data ?? null) as T | null, erro: error ? mensagemErro(error) : null };
}

type Pessoa = { id: string; nome: string; apelido?: string | null };

/**
 * Escolher o corretor para atribuir um lead sem dono. `equipe` restringe à
 * equipe (repasse do gerente); sem ela, todos os ativos com equipe.
 */
export function EscolherCorretor({
  titulo,
  equipe,
  onEscolher,
  onFechar,
}: {
  titulo: string;
  equipe?: string | null;
  onEscolher: (id: string) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  useEffect(() => {
    let q = db().from("profiles").select("id, nome, perfil, equipe_id").eq("ativo", true).eq("perfil", "corretor").order("nome");
    if (equipe) q = q.eq("equipe_id", equipe);
    q.then(({ data, error }) => (error ? setErro(mensagemErro(error)) : setPessoas((data ?? []) as Pessoa[])));
  }, [equipe]);
  return (
    <Folha titulo={titulo} onFechar={onFechar}>
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      {!pessoas && !erro && <p className="text-concrete">Carregando…</p>}
      {pessoas && !pessoas.length && <p className="text-ink-soft">Nenhum corretor ativo.</p>}
      {pessoas && pessoas.length > 0 && (
        <ul className="grid max-h-[50dvh] overflow-y-auto">
          {pessoas.map((p) => (
            <li key={p.id} className="border-t border-line first:border-t-0">
              <button
                type="button"
                disabled={!!enviando}
                className="focus-ring flex min-h-[44px] w-full items-center justify-between gap-2 px-1 text-left text-[14px] font-semibold hover:bg-ink/5"
                onClick={async () => {
                  setEnviando(p.id);
                  setErro(null);
                  const e = await onEscolher(p.id);
                  setEnviando(null);
                  if (e) setErro(e);
                }}
              >
                {p.nome}
                <span className="text-[13px] font-semibold text-brand">{enviando === p.id ? "Atribuindo…" : "Atribuir →"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Folha>
  );
}
