"use client";

import { useEffect, useSyncExternalStore } from "react";
import { db, novoId, supabase } from "./supabase";
import { mensagemErro } from "./erros";
import {
  CHAVE_AVISO_LOCAL,
  chavePrimeiraVez,
  deveMandarSinal,
  INTERVALO_MINIMO_MS,
  mostraPrimeiraVez,
  resultadoDoErroGeo,
  textoCheckin,
  usaSinal,
  type AcaoFolha,
  type ConfigDistribuicao,
  type MeuEstado,
  type ResultadoCheckin,
} from "./distribuicao";

/**
 * Estado da distribuição no aparelho: um só para o app todo (a casca remonta a
 * cada página; os relógios do sinal e do "app aberto" não podem reiniciar).
 * Sem o distribuicao.sql instalado, tudo fica nulo e nada aparece.
 */

export type Folha = "estado" | "fila" | "saida" | "primeira" | null;

type Store = {
  usuario: string | null;
  estado: MeuEstado | null;
  /** O estado já foi lido uma vez (nulo depois disso: não instalado ou sem acesso). */
  lido: boolean;
  config: ConfigDistribuicao | null;
  temEquipe: boolean;
  folha: Folha;
  /** Resultado do último check-in, em uma linha. */
  checkin: { texto: string; ok: boolean } | null;
  ocupado: boolean;
  erro: string | null;
};

const inicial: Store = { usuario: null, estado: null, lido: false, config: null, temEquipe: false, folha: null, checkin: null, ocupado: false, erro: null };
let store: Store = inicial;
const ouvintes = new Set<() => void>();

function definir(p: Partial<Store>) {
  store = { ...store, ...p };
  ouvintes.forEach((f) => f());
}
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};
const ler = () => store;
const lerServidor = () => inicial;

export function useDistribuicaoStore(): Store {
  return useSyncExternalStore(assinar, ler, lerServidor);
}

// ---------- localStorage (pode faltar ou lançar) ----------

function lerLS(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarLS(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento: a explicação pode voltar no mesmo dia.
  }
}

// ---------- Leituras ----------

export async function carregarEstado() {
  if (!supabase || !store.usuario) return;
  const { data, error } = await supabase.rpc("distribuicao_meu_estado");
  if (error) {
    // Função ausente (ainda não instalada) ou sem acesso: nada aparece.
    definir({ estado: null, lido: true });
    return;
  }
  const estado = (data ?? null) as MeuEstado | null;
  definir({ estado, lido: true });
  if (!estado) return;
  if (store.folha) return;
  if (estado.perguntar_saida && usaSinal(estado)) return definir({ folha: "saida" });
  if (mostraPrimeiraVez(estado, !!lerLS(chavePrimeiraVez(new Date())))) definir({ folha: "primeira" });
}

export async function carregarConfig() {
  if (!supabase || !store.usuario) return;
  const { data, error } = await supabase.from("distribuicao_config").select("*").maybeSingle<ConfigDistribuicao>();
  definir({ config: error ? null : (data ?? null) });
}

async function carregarEquipe(usuario: string) {
  if (!supabase) return;
  const { data } = await supabase.from("teams").select("id").eq("gerente_id", usuario).limit(1);
  definir({ temEquipe: !!data?.length });
}

// ---------- Localização ----------

type Posicao = { lat: number; lng: number; precisao: number };

export function lerPosicao(): Promise<Posicao | { erro: number }> {
  return new Promise((ok) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return ok({ erro: 2 });
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      (e) => ok({ erro: e.code }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

// ---------- Sinal e "app aberto" (só com a página visível) ----------

let ultimoPulso: number | null = null;
let ultimoEstado = 0;
let ultimaConfig = 0;
let relogio: ReturnType<typeof setInterval> | null = null;

async function pulso(aoVoltar: boolean) {
  const e = store.estado;
  if (!supabase || !e || !e.recebe || !e.ligada) return;
  const agora = Date.now();
  if (!deveMandarSinal(ultimoPulso, agora, aoVoltar)) return;
  ultimoPulso = agora;
  if (usaSinal(e)) {
    const p = await lerPosicao();
    // Sem posição, o sinal vai vazio: conta como "app aberto" e não muda nada.
    const args = "erro" in p ? { p_lat: null, p_lng: null, p_precisao: null } : { p_lat: p.lat, p_lng: p.lng, p_precisao: p.precisao };
    const { data } = await supabase.rpc("distribuicao_sinal", args);
    if ((data as { perguntar?: boolean } | null)?.perguntar && !store.folha) definir({ folha: "saida" });
  } else {
    await supabase.rpc("distribuicao_app_aberto");
  }
}

function tique(aoVoltar: boolean) {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  const agora = Date.now();
  if (aoVoltar ? agora - ultimoEstado >= INTERVALO_MINIMO_MS : agora - ultimoEstado >= 55_000) {
    ultimoEstado = agora;
    void carregarEstado().then(() => pulso(aoVoltar));
  } else void pulso(aoVoltar);
  if (agora - ultimaConfig >= 5 * 60_000) {
    ultimaConfig = agora;
    void carregarConfig();
  }
}

const aoMudarVisibilidade = () => tique(true);

/** Liga a leitura do estado (ao abrir e a cada 1 min) e os relógios, uma vez por usuário. */
export function useDistribuicao(usuario: string | null) {
  useEffect(() => {
    if (!usuario || !supabase || store.usuario === usuario) return;
    store = { ...inicial, usuario };
    ultimoPulso = null;
    ultimoEstado = Date.now();
    ultimaConfig = Date.now();
    void carregarConfig();
    void carregarEquipe(usuario);
    void carregarEstado().then(() => pulso(false));
    if (!relogio) {
      relogio = setInterval(() => tique(false), 60_000);
      document.addEventListener("visibilitychange", aoMudarVisibilidade);
    }
  }, [usuario]);
}

// ---------- Ações ----------

export const abrirFolha = (folha: Folha) => definir({ folha, erro: null, ...(folha === "estado" ? {} : { checkin: null }) });

export function fecharFolha() {
  if (store.folha === "primeira") gravarLS(chavePrimeiraVez(new Date()), "1");
  definir({ folha: null, erro: null });
}

/** O aviso de uso da localização aparece só no primeiro check-in. */
export const jaViuAvisoLocal = () => !!lerLS(CHAVE_AVISO_LOCAL);

// O mesmo id enquanto o check-in não dá certo: o reenvio não duplica.
let idCheckin: string | null = null;

async function rpc(nome: string, args?: Record<string, unknown>) {
  const { data, error } = await db().rpc(nome, args);
  if (error) throw new Error(mensagemErro(error));
  return data;
}

export async function fazerCheckin(): Promise<ResultadoCheckin> {
  gravarLS(CHAVE_AVISO_LOCAL, "1");
  if (store.estado && !store.estado.recebendo) await rpc("distribuicao_receber", { p_ligar: true });
  const p = await lerPosicao();
  if ("erro" in p) return resultadoDoErroGeo(p.erro);
  idCheckin ??= novoId();
  const r = (await rpc("distribuicao_checkin", { p_id: idCheckin, p_lat: p.lat, p_lng: p.lng, p_precisao: p.precisao })) as ResultadoCheckin;
  if (r.resultado === "dentro") idCheckin = null;
  return r;
}

/** Executa a ação da folha; o resultado do check-in fica numa linha. */
export async function executar(acao: AcaoFolha, ate?: string | null) {
  const eu = store.usuario;
  definir({ ocupado: true, erro: null, checkin: null });
  try {
    switch (acao) {
      case "ligar":
        await rpc("distribuicao_receber", { p_ligar: true });
        break;
      case "desligar":
        await rpc("distribuicao_receber", { p_ligar: false });
        break;
      case "checkin": {
        const r = await fazerCheckin();
        definir({ checkin: textoCheckin(r) });
        break;
      }
      case "checkout":
        // A saída nunca depende do GPS.
        await rpc("distribuicao_checkout", {});
        break;
      case "visita_sair":
        await rpc("distribuicao_visita", { p_saindo: true });
        break;
      case "visita_voltar":
        await rpc("distribuicao_visita", { p_saindo: false });
        break;
      case "pausar":
        await rpc("distribuicao_pausar", { p_corretor: eu, p_ate: ate ? new Date(`${ate}T08:00:00-03:00`).toISOString() : null });
        break;
      case "voltar":
        await rpc("distribuicao_voltar", { p_corretor: eu });
        break;
    }
    if (store.folha === "primeira") gravarLS(chavePrimeiraVez(new Date()), "1");
    await carregarEstado();
    // Deu certo: fecha a folha. O check-in fica aberto para mostrar o resultado.
    if (acao !== "checkin") definir({ folha: null });
  } catch (e) {
    definir({ erro: (e as Error).message });
  } finally {
    definir({ ocupado: false });
  }
}

export async function responderSaida(sai: boolean) {
  definir({ ocupado: true, erro: null });
  try {
    await rpc("distribuicao_responder_saida", { p_sai: sai });
    definir({ folha: null });
    await carregarEstado();
  } catch (e) {
    definir({ erro: (e as Error).message });
  } finally {
    definir({ ocupado: false });
  }
}
