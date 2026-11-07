import clsx from "clsx";
import type { NivelDoPrazo } from "./mapas";

/**
 * Prazo do Alicerce (project/components/Prazo): texto colorido com sinal, não chip e não selo.
 * "→ Responder até 9h15" (normal), "! Responder em 9 min" (atencao), "! Prazo estourado há 12 min" (estourado).
 * O sinal e a palavra dizem o nível; a cor nunca está sozinha. Vai dentro de uma linha (.mb-item__linha).
 */
export function Prazo({ nivel = "normal", children }: { nivel?: NivelDoPrazo; children: React.ReactNode }) {
  return <span className={clsx("mb-prazo", nivel === "atencao" && "mb-prazo--atencao", nivel === "estourado" && "mb-prazo--estourado")}>{children}</span>;
}
