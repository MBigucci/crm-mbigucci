"use client";

// Adaptado de crm/src/lib/sessao.tsx: o mesmo login do Base360 (mesma origem),
// sem os avisos no celular e os rascunhos, que são do Vendas. O Marketing só
// precisa saber se a conta está ativa e se é o gerente geral.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { COLUNAS_PROFILE, type Profile } from "./tipos";

export type EstadoSessao =
  | { fase: "carregando" }
  | { fase: "sem-config" }
  | { fase: "deslogado" }
  | { fase: "desativado"; email: string }
  | { fase: "erro"; mensagem: string }
  | { fase: "pronto"; perfil: Profile };

type Contexto = {
  estado: EstadoSessao;
  /**
   * Só a tela: quem vê o menu. Quem decide de verdade é o banco
   * (is_gerente_geral() em cada função cfg_*).
   */
  ehGerenteGeral: boolean;
  sair: () => Promise<void>;
};

const SessaoContext = createContext<Contexto | null>(null);

async function carregarPerfil(user: User | null): Promise<EstadoSessao> {
  if (!supabase) return { fase: "sem-config" };
  if (!user) return { fase: "deslogado" };
  const ler = (colunas: string) => supabase!.from("profiles").select(colunas).eq("id", user.id).maybeSingle<Profile>();
  let { data: perfil, error } = await ler(`${COLUNAS_PROFILE}, apelido`);
  if (error && /apelido/.test(error.message)) ({ data: perfil, error } = await ler(COLUNAS_PROFILE));
  if (error) return { fase: "erro", mensagem: error.message };
  if (!perfil || !perfil.ativo) return { fase: "desativado", email: user.email ?? "" };
  return { fase: "pronto", perfil };
}

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>(supabase ? { fase: "carregando" } : { fase: "sem-config" });

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento !== "INITIAL_SESSION" && evento !== "SIGNED_IN" && evento !== "SIGNED_OUT") return;
      // Fora do callback: chamadas ao Supabase dentro dele podem travar o cliente.
      setTimeout(() => {
        carregarPerfil(sessao?.user ?? null).then(setEstado);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
    setEstado({ fase: "deslogado" });
  }, []);

  const valor = useMemo<Contexto>(
    () => ({ estado, ehGerenteGeral: estado.fase === "pronto" && estado.perfil.perfil === "gerente_geral", sair }),
    [estado, sair],
  );
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao fora do SessaoProvider");
  return ctx;
}
