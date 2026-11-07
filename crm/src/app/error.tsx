"use client";

import { CopiarDetalhes, EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { MarcaBase360 } from "@/components/alicerce/marca-base360";

/**
 * Erro ao carregar uma página (item 48, passo d): "Erro de carga" com "Tentar de novo". O código técnico
 * nunca vai na tela, só em "Copiar detalhes para o suporte". Sem a Casca de propósito: o erro pode ter
 * vindo dela, e ela de novo no erro faria um laço.
 */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen content-center justify-items-center gap-6 px-4 py-10">
      <MarcaBase360 modulo="Vendas" />
      <EstadoDePagina
        tipo="erro-de-carga"
        titulo="Não foi possível carregar esta página"
        texto="Pode ser a internet ou o sistema. O que você já salvou continua salvo."
        acoes={
          <button type="button" className="mb-botao mb-botao--primario" onClick={reset}>
            Tentar de novo
          </button>
        }
        detalhe={<CopiarDetalhes codigo={[error.digest, error.message].filter(Boolean).join(" · ")} />}
      />
    </main>
  );
}
