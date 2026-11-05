// Avisos no celular (Web Push), do lado do navegador. Adaptado do CRM da Bruna
// (ref/CRM Bruna/src/lib/push.ts). O service worker fica em public/sw.js, com
// escopo no BASE_PATH (/vendas/, em base360.mbigucci.com.br). O envio é da Edge Function "avisos".
// Regras em docs/notificacoes.md.

import { supabase } from "./supabase";
import { TIPOS_AVISO, type TipoAviso } from "./avisos";

export { TIPOS_AVISO, type TipoAviso };

const TODOS = TIPOS_AVISO.map((t) => t.slug);

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type Disponibilidade = "ok" | "sem-suporte" | "iphone-instalar" | "sem-chave";

export function ehIphone() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function instalado() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function disponibilidade(): Disponibilidade {
  // No iPhone só funciona com o Base360 instalado na Tela de Início (iOS 16.4 ou mais novo).
  if (ehIphone() && !instalado()) return "iphone-instalar";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "sem-suporte";
  if (!CHAVE_PUBLICA || !supabase) return "sem-chave";
  return "ok";
}

async function registro() {
  const escopo = `${BASE}/`;
  return (
    (await navigator.serviceWorker.getRegistration(escopo)) ??
    (await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: escopo }))
  );
}

async function assinaturaAtual() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function deBase64Url(s: string) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** A assinatura foi feita com a chave atual? Se as chaves mudarem, a antiga não recebe nada. */
function chaveConfere(sub: PushSubscription) {
  const k = sub.options?.applicationServerKey;
  if (!k || !CHAVE_PUBLICA) return true;
  const a = new Uint8Array(k);
  const b = deBase64Url(CHAVE_PUBLICA);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  const so = /Android/.test(ua) ? "Android" : ehIphone() ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Outro";
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${so} · ${nav}`;
}

async function gravar(sub: PushSubscription, tipos: TipoAviso[] | null) {
  const json = sub.toJSON();
  const { error } = await supabase!.rpc("push_assinar", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_tipos: tipos,
    p_aparelho: nomeDoAparelho(),
  });
  if (error) throw new Error(error.message);
}

async function apagarLinha(endpoint: string) {
  await supabase?.from("push_assinaturas").delete().eq("endpoint", endpoint);
}

/** Pede a permissão, assina e grava este aparelho com os tipos escolhidos. */
export async function ligarAvisos(tipos: TipoAviso[]) {
  if (!CHAVE_PUBLICA || !supabase) throw new Error("Os avisos ainda não foram configurados no Base360 Vendas.");
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error(permissao === "denied" ? "bloqueado" : "Permissão não concedida.");
  const reg = await registro();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !chaveConfere(sub)) {
    await apagarLinha(sub.endpoint);
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64Url(CHAVE_PUBLICA) });
  await gravar(sub, tipos);
}

export async function desligarAvisos() {
  const sub = await assinaturaAtual();
  if (!sub) return;
  await apagarLinha(sub.endpoint);
  await sub.unsubscribe();
}

export async function salvarTipos(tipos: TipoAviso[]) {
  const sub = await assinaturaAtual();
  if (sub) await gravar(sub, tipos);
}

/** Este aparelho está com os avisos ligados (no navegador e no banco)? Com quais tipos? */
export async function esteAparelho(): Promise<{ ligado: boolean; tipos: TipoAviso[] }> {
  const sub = await assinaturaAtual();
  if (!sub || !supabase || Notification.permission !== "granted") return { ligado: false, tipos: TODOS };
  const { data } = await supabase.from("push_assinaturas").select("tipos").eq("endpoint", sub.endpoint).maybeSingle<{ tipos: TipoAviso[] }>();
  return { ligado: !!data && chaveConfere(sub), tipos: data?.tipos ?? TODOS };
}

/** Manda um aviso de teste só para este aparelho, pela Edge Function. */
export async function enviarTeste(): Promise<"enviado" | "removido" | "falhou"> {
  const sub = await assinaturaAtual();
  if (!sub || !supabase) throw new Error("Este aparelho não está com os avisos ligados.");
  const { data, error } = await supabase.functions.invoke<{ resultado: "enviado" | "removido" | "falhou" }>("avisos", {
    body: { acao: "teste", endpoint: sub.endpoint },
  });
  if (error || !data) throw new Error("Não foi possível falar com o serviço de avisos. Tente de novo.");
  return data.resultado;
}

/**
 * Ao abrir o CRM logado: renova o "visto_em" deste aparelho (sem abrir por 60
 * dias, ele sai). Se as chaves mudaram, corta a assinatura antiga; a pessoa liga
 * de novo em Minha conta.
 */
export async function sincronizarAvisos() {
  try {
    if (disponibilidade() !== "ok" || Notification.permission !== "granted") return;
    const sub = await assinaturaAtual();
    if (!sub) return;
    if (!chaveConfere(sub)) {
      await apagarLinha(sub.endpoint);
      await sub.unsubscribe().catch(() => {});
      return;
    }
    const { data } = await supabase!.from("push_assinaturas").select("endpoint").eq("endpoint", sub.endpoint).maybeSingle();
    if (data) await gravar(sub, null);
  } catch (e) {
    console.warn("[avisos] sincronizar", e);
  }
}

/** Ao sair da conta: este aparelho para de receber os avisos dela. */
export async function esquecerEsteAparelho() {
  try {
    const sub = await assinaturaAtual();
    if (!sub) return;
    await apagarLinha(sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  } catch (e) {
    console.warn("[avisos] sair", e);
  }
}
