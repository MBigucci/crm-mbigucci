// Cópia gerada de crm/src/components/alicerce/menu-da-conta.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./icone";
import { iniciais, nomeCurto } from "./menu.ts";
import { usePopup } from "./usar-popup";

/**
 * MenuDaConta do Alicerce (project/components/MenuDaConta): a conta tem um lugar só, na ponta direita da
 * BarraSuperior. Avatar com as iniciais, o apelido (ou o primeiro nome) e a seta; o popup abre embaixo com
 * o nome completo, o perfil com a equipe (quando se sabe), Minha conta e Sair.
 */
export function MenuDaConta({ nome, apelido, perfil, equipe, onSair }: { nome: string; apelido?: string | null; perfil: string; equipe?: string | null; onSair: () => void }) {
  const pathname = usePathname();
  const { aberto, alternar, botao, raiz } = usePopup(pathname);
  const id = useId();
  return (
    <div className="mb-ancora" ref={raiz}>
      <button ref={botao} className="mb-conta mb-conta--topo" type="button" aria-controls={id} aria-haspopup="menu" aria-expanded={aberto} onClick={alternar}>
        <span className="mb-avatar mb-avatar--p" aria-hidden="true">
          {iniciais(nome)}
        </span>
        {nomeCurto({ nome, apelido })}
        <Icone nome="seta-baixo" className="mb-conta__seta" />
      </button>
      <div className="mb-popup mb-popup--abaixo" id={id} role="menu" hidden={!aberto}>
        <div className="mb-popup__conta">
          <strong>{nome}</strong>
          <span>{equipe ? `${perfil} · ${equipe}` : perfil}</span>
        </div>
        <hr className="mb-popup__divisor" />
        <Link className="mb-popup__item" href="/conta/" role="menuitem">
          Minha conta
        </Link>
        <hr className="mb-popup__divisor" />
        <button className="mb-popup__item" type="button" role="menuitem" onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}
