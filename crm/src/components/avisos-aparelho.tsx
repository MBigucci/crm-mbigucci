"use client";

// Card "Avisos neste aparelho" de Minha conta: liga e desliga os avisos no
// celular e escolhe os tipos. Adaptado de PushSettings, no CRM da Bruna
// (ref/CRM Bruna/src/components/account-dialog.tsx). Regras em docs/notificacoes.md.

import { useEffect, useRef, useState } from "react";
import {
  desligarAvisos,
  disponibilidade,
  ehIphone,
  enviarTeste,
  esteAparelho,
  ligarAvisos,
  salvarTipos,
  TIPOS_AVISO,
  type Disponibilidade,
  type TipoAviso,
} from "@/lib/push";

type Nota = { ok: boolean; texto: string };

function comoDesbloquear() {
  if (ehIphone()) return "Os avisos estão bloqueados. No iPhone: Ajustes > Notificações > CRM > Permitir Notificações. Depois tente de novo.";
  if (/Android/.test(navigator.userAgent)) {
    return "Os avisos estão bloqueados. Segure o ícone do CRM > Informações do app > Notificações > Permitir. Depois tente de novo.";
  }
  return "Os avisos estão bloqueados para este site. Toque no cadeado ao lado do endereço > Permissões > Notificações > Permitir. Depois tente de novo.";
}

export function AvisosNesteAparelho() {
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ligado, setLigado] = useState(false);
  const [tipos, setTipos] = useState<TipoAviso[]>(TIPOS_AVISO.map((t) => t.slug));
  // Os tipos atuais num ref: dois toques rápidos não se perdem (a versão com closure perde).
  const tiposRef = useRef(tipos);
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState<Nota | null>(null);

  useEffect(() => {
    const d = disponibilidade();
    setDisp(d);
    if (d !== "ok") return;
    esteAparelho()
      .then((a) => {
        setLigado(a.ligado);
        tiposRef.current = a.tipos;
        setTipos(a.tipos);
      })
      .catch(() => setLigado(false));
  }, []);

  async function rodar(fn: () => Promise<Nota | void>) {
    setOcupado(true);
    setNota(null);
    try {
      const n = await fn();
      if (n) setNota(n);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setNota({ ok: false, texto: m === "bloqueado" ? comoDesbloquear() : m });
    } finally {
      setOcupado(false);
    }
  }

  function alternar(slug: TipoAviso, marcado: boolean) {
    const novo = marcado ? [...new Set([...tiposRef.current, slug])] : tiposRef.current.filter((t) => t !== slug);
    tiposRef.current = novo;
    setTipos(novo);
    if (ligado) {
      void rodar(async () => {
        await salvarTipos(novo);
      });
    }
  }

  return (
    <div className="card">
      <h2 className="titulo-card">Avisos neste aparelho</h2>
      <p className="mt-2 text-ink-soft">
        O CRM avisa no celular, mesmo fechado, na hora de cada contato e de cada visita. Escolha o que quer receber. Vale
        só para este aparelho.
      </p>
      <p className="mt-3">
        <span className="font-semibold">iPhone:</span> os avisos só funcionam com o CRM instalado na Tela de Início
        (Safari &gt; Compartilhar &gt; Adicionar à Tela de Início), no iOS 16.4 ou mais novo. Depois, abra o CRM pelo ícone
        e ligue aqui.
      </p>

      {disp === null && <p className="mt-4 text-concrete">Carregando…</p>}
      {disp === "iphone-instalar" && (
        <p className="aviso-erro mt-4">! Abra o CRM pelo ícone da Tela de Início para ligar os avisos.</p>
      )}
      {disp === "sem-suporte" && (
        <p className="aviso-erro mt-4">
          ! {ehIphone() ? "Atualize o iPhone para o iOS 16.4 ou mais novo." : "Este navegador não aceita avisos. No celular, use o Chrome."}
        </p>
      )}
      {disp === "sem-chave" && <p className="aviso-erro mt-4">! Os avisos ainda não foram configurados no CRM.</p>}

      {disp === "ok" && (
        <>
          <p className={`mt-4 font-semibold ${ligado ? "text-ok" : "text-ink-soft"}`}>
            {ligado ? "✓ Ligados neste aparelho" : "– Desligados neste aparelho"}
          </p>
          <fieldset className="mt-3 grid gap-3" disabled={ocupado}>
            <legend className="field-label">O que avisar</legend>
            {TIPOS_AVISO.map((t) => (
              <label key={t.slug} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox mt-[3px]"
                  checked={tipos.includes(t.slug)}
                  onChange={(e) => alternar(t.slug, e.target.checked)}
                />
                <span>
                  <span className="block font-semibold">{t.nome}</span>
                  <span className="block text-[14px] text-ink-soft">{t.explica}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {nota && (
            <p role="status" className={`${nota.ok ? "aviso-ok" : "aviso-erro"} mt-3`}>
              {nota.ok ? "✓" : "!"} {nota.texto}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {ligado ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost focus-ring"
                  disabled={ocupado}
                  onClick={() =>
                    rodar(async () => {
                      const r = await enviarTeste();
                      if (r === "enviado") return { ok: true, texto: "Teste enviado. Ele chega em alguns segundos." };
                      if (r === "removido") {
                        setLigado(false);
                        return { ok: false, texto: "Este aparelho saiu da lista de avisos. Ligue de novo." };
                      }
                      return { ok: false, texto: "O serviço de avisos recusou o envio. Desligue e ligue de novo." };
                    })
                  }
                >
                  Enviar teste
                </button>
                <button
                  type="button"
                  className="btn btn-ghost focus-ring"
                  disabled={ocupado}
                  onClick={() =>
                    rodar(async () => {
                      await desligarAvisos();
                      setLigado(false);
                      return { ok: true, texto: "Avisos desligados neste aparelho." };
                    })
                  }
                >
                  Desligar neste aparelho
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-red focus-ring"
                disabled={ocupado || tipos.length === 0}
                onClick={() =>
                  rodar(async () => {
                    await ligarAvisos(tipos);
                    setLigado(true);
                    return { ok: true, texto: "Avisos ligados. Use Enviar teste para conferir." };
                  })
                }
              >
                {ocupado ? "Ligando…" : "Ligar avisos"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
