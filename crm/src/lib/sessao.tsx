"use client";

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
  | { fase: "pronto"; perfil: Profile; permissoes: string[] };

type Contexto = {
  estado: EstadoSessao;
  /** Permissão do perfil logado (o gerente geral tem todas). */
  pode: (permissao: string) => boolean;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const SessaoContext = createContext<Contexto | null>(null);

async function carregarPerfil(user: User | null): Promise<EstadoSessao> {
  if (!supabase) return { fase: "sem-config" };
  if (!user) return { fase: "deslogado" };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select(COLUNAS_PROFILE)
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (error) return { fase: "erro", mensagem: error.message };
  if (!perfil || !perfil.ativo) return { fase: "desativado", email: user.email ?? "" };

  if (perfil.perfil === "gerente_geral") {
    const { data } = await supabase.from("permissions").select("slug");
    return { fase: "pronto", perfil, permissoes: (data ?? []).map((p) => p.slug as string) };
  }
  const { data } = await supabase.from("role_permissions").select("permissao").eq("perfil", perfil.perfil);
  return { fase: "pronto", perfil, permissoes: (data ?? []).map((p) => p.permissao as string) };
}

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>(supabase ? { fase: "carregando" } : { fase: "sem-config" });

  const recarregar = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setEstado(await carregarPerfil(data.session?.user ?? null));
  }, []);

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

  const valor = useMemo<Contexto>(
    () => ({
      estado,
      pode: (permissao) =>
        estado.fase === "pronto" &&
        (estado.perfil.perfil === "gerente_geral" || estado.permissoes.includes(permissao)),
      recarregar,
      sair: async () => {
        await supabase?.auth.signOut();
        setEstado({ fase: "deslogado" });
      },
    }),
    [estado, recarregar],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao fora do SessaoProvider");
  return ctx;
}

/** Para telas dentro da casca, que só renderiza o conteúdo com a sessão pronta. */
export function usePerfil(): Profile {
  const { estado } = useSessao();
  if (estado.fase !== "pronto") throw new Error("Sessão não está pronta");
  return estado.perfil;
}
