import clsx from "clsx";
import { ICONES, type NomeIcone } from "./icones.gerado.ts";

/**
 * Icone do Alicerce (project/components/Icones): o mesmo <svg class="mb-icone"> de MB.icone(nome), com os
 * desenhos de icones.gerado.ts. Decorativo (aria-hidden) ou, com `rotulo`, lido como imagem. Ícone
 * acompanha texto; sozinho, só em botão --icone com aria-label.
 * O desenho vai por dangerouslySetInnerHTML porque alguns (como "alca") levam um style no próprio traço.
 */
export function Icone({ nome, rotulo, className }: { nome: NomeIcone; rotulo?: string; className?: string }) {
  return (
    <svg
      className={clsx("mb-icone", className)}
      viewBox="0 0 20 20"
      {...(rotulo ? { role: "img", "aria-label": rotulo } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: ICONES[nome] }}
    />
  );
}
