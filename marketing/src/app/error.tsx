"use client";

import { useState } from "react";
import { LockupMarketing } from "@/components/marca-base360";

/**
 * EstadosDePagina do Alicerce sobre o visual atual do Marketing (que ainda não carrega o Alicerce): a mesma
 * estrutura (ícone, sobrelinha, título, texto, uma ação e o detalhe) e as mesmas palavras do Vocabulário. O
 * visual do Alicerce chega com a fase 2 do Marketing.
 */
function Estado({ icone, sobrelinha, titulo, texto, acoes, detalhe }: { icone: React.ReactNode; sobrelinha: string; titulo: string; texto: string; acoes?: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[480px] justify-items-center gap-3 px-4 text-center">
      <span className="mb-1 grid h-14 w-14 place-content-center rounded-full bg-secondary text-ink-soft">
        <svg viewBox="0 0 20 20" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icone}
        </svg>
      </span>
      <span className="eyebrow">{sobrelinha}</span>
      <h1 className="titulo-pagina">{titulo}</h1>
      <p className="text-[14px] leading-[22px] text-ink-soft">{texto}</p>
      {acoes && <div className="mt-2 flex w-full flex-wrap justify-center gap-2 [&>*]:w-full sm:[&>*]:w-auto">{acoes}</div>}
      {detalhe && <span className="text-[12px] text-concrete">{detalhe}</span>}
    </div>
  );
}

/** "Copiar detalhes para o suporte": o código técnico, o endereço e a hora vão para a área de transferência, nunca para a tela. */
function CopiarDetalhes({ codigo }: { codigo?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    const linhas = [codigo ? `Código: ${codigo}` : null, `Endereço: ${location.href}`, `Hora: ${new Date().toLocaleString("pt-BR")}`].filter(Boolean);
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <button type="button" className="focus-ring rounded-sm px-2 py-2 font-semibold underline" onClick={copiar}>
      {copiado ? "✓ Detalhes copiados" : "Copiar detalhes para o suporte"}
    </button>
  );
}

/**
 * Erro ao carregar uma página (item 48, passo d): "Erro de carga" com "Tentar de novo". Sem a Casca de
 * propósito: o erro pode ter vindo dela.
 */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen content-center justify-items-center gap-6 px-4 py-10">
      <LockupMarketing className="h-[28px]" />
      <Estado
        icone={
          <>
            <path d="M16 10a6 6 0 11-1.8-4.3" />
            <path d="M16 3.5V7h-3.5" />
          </>
        }
        sobrelinha="Erro de carga"
        titulo="Não foi possível carregar esta página"
        texto="Pode ser a internet ou o sistema. O que você já salvou continua salvo."
        acoes={
          <button type="button" className="btn btn-red focus-ring" onClick={reset}>
            Tentar de novo
          </button>
        }
        detalhe={<CopiarDetalhes codigo={[error.digest, error.message].filter(Boolean).join(" · ")} />}
      />
    </main>
  );
}
