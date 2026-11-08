// Cópia gerada de crm/src/components/alicerce/menu-lateral.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./icone";
import { LogoMBigucci } from "./logo-mbigucci";
import { MarcaBase360 } from "./marca-base360";
import { espacoDoToken, mb } from "./mb";
import { itemAtual, temOutroModulo, type GrupoMenu, type ItemMenu, type Modulo } from "./menu.ts";
import { useMenuRecolhido } from "./menu-recolhido";
import { usePopup } from "./usar-popup";

/** Link externo: ↗ visual e aviso de nova aba para o leitor de tela. */
function ItemExterno({ item }: { item: ItemMenu }) {
  return (
    <a className="mb-menu__item" href={item.href} target="_blank" rel="noopener">
      <Icone nome={item.icone} />
      <span className="mb-menu__rotulo">{item.rotulo}</span>
      <span className="mb-menu__externo" aria-hidden="true">
        ↗
      </span>
      <span className="mb-visualmente-oculto">(abre em outra aba)</span>
    </a>
  );
}

/**
 * Trocar de módulo (Módulos, no rodapé do menu): o popup abre ao lado, só com os módulos que a pessoa pode
 * abrir e o atual marcado com ✓. Todos abrem na mesma aba. Marketing e Repasse são endereços fora do
 * basePath do Vendas, então link comum e não o Link do Next.
 */
function ModulosDoMenu({ modulos, moduloAtual }: { modulos: Modulo[]; moduloAtual: Modulo["id"] }) {
  const pathname = usePathname();
  const { aberto, alternar, fechar, botao, raiz } = usePopup(pathname);
  const id = useId();
  // O menu fixo rola por dentro e cortaria um popup posicionado dentro dele. Como o MB.popup faz para
  // .mb-popup--lado: posição fixa, com a borda esquerda a esp-3 da borda direita do botão e a base alinhada à dele.
  const [posicao, setPosicao] = useState<{ left: number; bottom: number } | null>(null);
  const abrirOuFechar = () => {
    if (!aberto && botao.current) {
      const folga = espacoDoToken("--esp-3", 12);
      const r = botao.current.getBoundingClientRect();
      setPosicao({ left: Math.round(r.right + folga), bottom: Math.max(folga, Math.round(window.innerHeight - r.bottom)) });
    }
    alternar();
  };
  // A posição vale para a tela de quando abriu: mudando o tamanho, fecha.
  useEffect(() => {
    if (!aberto) return;
    const aoRedimensionar = () => fechar(false);
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [aberto, fechar]);
  return (
    <div className="mb-ancora" ref={raiz}>
      <button
        ref={botao}
        className="mb-menu__item mb-menu__modulos"
        type="button"
        aria-haspopup="menu"
        aria-controls={id}
        aria-expanded={aberto}
        onClick={abrirOuFechar}
      >
        <Icone nome="modulos" />
        <span className="mb-menu__rotulo">Módulos</span>
      </button>
      <div
        className="mb-popup mb-popup--lado"
        id={id}
        role="menu"
        hidden={!aberto}
        style={aberto && posicao ? { position: "fixed", left: posicao.left, bottom: posicao.bottom } : undefined}
      >
        <p className="mb-popup__grupo">Módulos do Base360</p>
        {modulos.map((m) => {
          const atual = m.id === moduloAtual;
          const props = { className: "mb-popup__item", role: "menuitem", "aria-current": atual ? ("true" as const) : undefined };
          return m.id === "vendas" || m.id === "parcerias" ? (
            <Link key={m.id} href={m.href} {...props}>
              {m.nome}
            </Link>
          ) : (
            <a key={m.id} href={m.href} {...props}>
              {m.nome}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * MenuLateral do Alicerce (project/components/MenuLateral): o lockup do módulo, os grupos de itens, o grupo
 * Atalhos, Módulos e Recolher menu no rodapé e o logo MBigucci. A conta não fica no menu (MenuDaConta, no
 * topo). Recolhido (64px), só os ícones, com o rótulo como dica no hover e no foco: o atributo
 * data-menu-recolhido do <html> manda no CSS, então o menu já nasce recolhido sem piscar.
 */
export function MenuLateral({
  modulo,
  grupos,
  atalhos,
  modulos,
  moduloAtual,
}: {
  modulo: string;
  grupos: GrupoMenu[];
  atalhos: ItemMenu[];
  modulos: Modulo[];
  moduloAtual: Modulo["id"];
}) {
  const pathname = usePathname() ?? "/";
  const atual = itemAtual(
    grupos.flatMap((g) => g.itens.map((i) => i.href)),
    pathname,
  );
  const [recolhido, alternarRecolhido] = useMenuRecolhido();
  // O menu fixo rola por dentro: a dica do recolhido usa posição fixa, que o MB calcula no hover e no foco.
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (menu.current) mb()?.menuLateral.dicas(menu.current);
  }, []);

  return (
    <nav ref={menu} className="mb-menu" aria-label="Menu principal">
      <Link className="mb-menu__marca" href={moduloAtual === "parcerias" ? "/parceiros/" : "/"} aria-label={`Base360 ${modulo}, início`}>
        <MarcaBase360 modulo={modulo} />
      </Link>
      {grupos.map((g) => (
        <Fragment key={g.titulo}>
          <p className="mb-menu__grupo">{g.titulo}</p>
          {g.itens.map((i) => (
            <Link key={i.href} className="mb-menu__item" href={i.href} aria-current={i.href === atual ? "page" : undefined}>
              <Icone nome={i.icone} />
              <span className="mb-menu__rotulo">{i.rotulo}</span>
            </Link>
          ))}
        </Fragment>
      ))}
      <p className="mb-menu__grupo">Atalhos</p>
      {atalhos.map((a) => (
        <ItemExterno key={a.href} item={a} />
      ))}
      <div className="mb-menu__rodape">
        {temOutroModulo(modulos) && <ModulosDoMenu modulos={modulos} moduloAtual={moduloAtual} />}
        <button className="mb-menu__item mb-menu__recolher" type="button" aria-expanded={!recolhido} onClick={alternarRecolhido}>
          <Icone nome="recolher" />
          <span className="mb-menu__rotulo">{recolhido ? "Expandir menu" : "Recolher menu"}</span>
        </button>
      </div>
      <div className="mb-menu__mbigucci">
        <LogoMBigucci />
      </div>
    </nav>
  );
}
