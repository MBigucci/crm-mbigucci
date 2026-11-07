import Link from "next/link";
import { LockupMarketing } from "@/components/marca-base360";

/**
 * EstadosDePagina do Alicerce sobre o visual atual do Marketing (que ainda não carrega o Alicerce): a mesma
 * estrutura (ícone, sobrelinha, título, texto, uma ação) e as mesmas palavras do Vocabulário. O visual do
 * Alicerce chega com a fase 2 do Marketing.
 */
function Estado({ icone, sobrelinha, titulo, texto, acoes }: { icone: React.ReactNode; sobrelinha: string; titulo: string; texto: string; acoes?: React.ReactNode }) {
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
    </div>
  );
}

/** 404 em português (item 48, passo d): "Não encontrado", com a ação Ir para o início. */
export default function NaoEncontrado() {
  return (
    <main className="grid min-h-screen content-center justify-items-center gap-6 px-4 py-10">
      <LockupMarketing className="h-[28px]" />
      <Estado
        icone={
          <>
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13 13l4 4" />
          </>
        }
        sobrelinha="Não encontrado"
        titulo="Esta página não existe ou mudou de endereço"
        texto="Confira o endereço. Se o link veio de uma mensagem antiga, volte ao início e procure por lá."
        acoes={
          <Link href="/" className="btn btn-ghost focus-ring">
            Ir para o início
          </Link>
        }
      />
    </main>
  );
}
