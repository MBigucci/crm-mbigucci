"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { usePerfil } from "@/lib/sessao";
import { formatarWhatsapp, type Lead } from "@/lib/leads";
import { useModelosMensagem } from "@/lib/leads-dados";
import { linkLigar, linkWhatsappComTexto, preencherModelo, sugerirModelo } from "@/lib/mensagens";

type LeadDaMensagem = Pick<
  Lead,
  "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas"
>;

/**
 * Botão WhatsApp das listas e da ficha: abre o diálogo com a mensagem pronta
 * sugerida pela etapa do lead. O texto pode ser editado antes de abrir o WhatsApp.
 */
export function BotaoMensagem({ lead, className }: { lead: LeadDaMensagem; className?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        className={clsx("btn btn-ghost focus-ring", className)}
        aria-label={`WhatsApp de ${lead.nome}, ${formatarWhatsapp(lead.whatsapp)}`}
        onClick={() => setAberto(true)}
      >
        WhatsApp →
      </button>
      {aberto && <DialogoMensagem lead={lead} onFechar={() => setAberto(false)} />}
    </>
  );
}

export function BotaoLigar({ numero, className }: { numero: string; className?: string }) {
  return (
    <a
      href={linkLigar(numero)}
      className={clsx("btn btn-ghost focus-ring", className)}
      aria-label={`Ligar para ${formatarWhatsapp(numero)}`}
    >
      Ligar
    </a>
  );
}

/** Diálogo de mensagem: escolhe o modelo em 1 toque, edita o texto, copia ou abre o WhatsApp. */
function DialogoMensagem({ lead, onFechar }: { lead: LeadDaMensagem; onFechar: () => void }) {
  const eu = usePerfil();
  const modelos = useModelosMensagem();
  const ref = useRef<HTMLDialogElement>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const ativos = (modelos ?? []).filter((m) => m.ativo);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Quando os modelos chegam, já vem o sugerido pela etapa.
  useEffect(() => {
    if (!modelos || slug !== null) return;
    const m = sugerirModelo(modelos, lead, new Date());
    setSlug(m?.slug ?? "");
    setTexto(m ? preencherModelo(m.texto, lead, eu.nome) : "");
  }, [modelos, slug, lead, eu.nome]);

  function escolher(s: string) {
    const m = ativos.find((x) => x.slug === s);
    if (!m) return;
    setSlug(s);
    setTexto(preencherModelo(m.texto, lead, eu.nome));
    setCopiado(false);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {}
  }

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="mensagem-titulo"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-md border border-line bg-surface p-0 text-ink backdrop:bg-ink/50 md:m-auto md:max-w-[560px] md:rounded-md"
    >
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">Mensagem</span>
            <h2 id="mensagem-titulo" className="titulo-card mt-1 truncate">
              {lead.nome}
            </h2>
            <p className="num text-[13px] text-ink-soft">{formatarWhatsapp(lead.whatsapp)}</p>
          </div>
          <button type="button" className="focus-ring shrink-0 p-1 text-[13px] font-semibold text-ink-soft" onClick={() => ref.current?.close()}>
            Fechar
          </button>
        </div>

        {modelos === null && <p className="text-concrete">Carregando…</p>}
        {modelos && ativos.length > 0 && (
          <fieldset>
            <legend className="field-label">Modelo</legend>
            <div className="grid grid-cols-2 gap-2">
              {ativos.map((m) => {
                const marcado = slug === m.slug;
                return (
                  <button
                    key={m.slug}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => escolher(m.slug)}
                    className={clsx(
                      "focus-ring rounded-sm border px-2 py-2 text-left text-[13px] font-semibold leading-snug transition-colors",
                      marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                    )}
                  >
                    {marcado && <span aria-hidden>✓ </span>}
                    {m.titulo}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {modelos && !ativos.length && (
          <p className="text-[13px] text-ink-soft">Nenhuma mensagem pronta disponível. Escreva a sua.</p>
        )}

        <div>
          <label className="field-label" htmlFor="mensagem-texto">
            Texto
          </label>
          <textarea
            id="mensagem-texto"
            className="input min-h-[200px]"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setCopiado(false);
            }}
          />
          <p className="mt-1 text-[12px] text-ink-soft">Ajuste o texto antes de enviar. *Negrito* funciona no WhatsApp.</p>
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={copiar}>
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
          <a
            href={linkWhatsappComTexto(lead.whatsapp, texto)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-red btn-lg focus-ring flex-1"
            onClick={() => ref.current?.close()}
          >
            Abrir no WhatsApp →
          </a>
        </div>
      </div>
    </dialog>
  );
}
