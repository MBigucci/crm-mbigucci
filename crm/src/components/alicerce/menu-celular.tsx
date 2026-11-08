"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./icone";
import { LogoMBigucci } from "./logo-mbigucci";
import { MarcaBase360 } from "./marca-base360";
import { itemAtual, temOutroModulo, type GrupoMenu, type ItemMenu, type Modulo } from "./menu.ts";

const ID_FOLHA = "menu-folha";

function Barras() {
  return (
    <span className="mb-menu-icone__barras" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * MenuCelular do Alicerce (project/components/MenuCelular), abaixo de 768px: o cabeçalho com o lockup à
 * esquerda, o + do módulo e o ícone de menu do site na ponta direita; embaixo, a faixa de status (só quando
 * o módulo tem status); a folha que desce do topo, com os itens (48px), os atalhos, Módulos, a conta (o
 * único lugar da conta no celular) e o logo MBigucci. O estado da folha é do React. Esc, o véu e o X fecham
 * e o foco volta ao ícone que abriu.
 */
export function MenuCelular({
  modulo,
  grupos,
  atalhos,
  modulos,
  moduloAtual,
  novo,
  status,
  conta,
}: {
  modulo: string;
  grupos: GrupoMenu[];
  atalhos: ItemMenu[];
  modulos: Modulo[];
  moduloAtual: Modulo["id"];
  novo?: { href: string; rotulo: string };
  /** O status do módulo para a faixa. Sem ele, não há faixa. */
  status?: React.ReactNode;
  conta: { nome: string; onSair: () => void };
}) {
  const pathname = usePathname() ?? "/";
  const atual = itemAtual(
    grupos.flatMap((g) => g.itens.map((i) => i.href)),
    pathname,
  );
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const folha = useRef<HTMLDivElement>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberta(false);
    if (devolverFoco) botao.current?.focus();
  }, []);

  // Muda a página, fecha.
  useEffect(() => setAberta(false), [pathname]);

  useEffect(() => {
    if (!aberta) return;
    folha.current?.querySelector<HTMLElement>('[aria-current="page"], a, button')?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar(true);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberta, fechar]);

  const outros = modulos.filter((m) => m.id !== moduloAtual);

  return (
    <>
      <header className="mb-celular-topo">
        <Link href={moduloAtual === "parcerias" ? "/parceiros/" : "/"} aria-label={`Base360 ${modulo}, início`}>
          <MarcaBase360 modulo={modulo} />
        </Link>
        {novo && (
          <Link className="mb-botao mb-botao--primario mb-botao--icone" href={novo.href} aria-label={novo.rotulo.replace(/^\+\s*/, "")}>
            <Icone nome="novo" />
          </Link>
        )}
        <button
          ref={botao}
          className="mb-menu-icone"
          type="button"
          aria-label={aberta ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberta}
          aria-controls={ID_FOLHA}
          onClick={() => (aberta ? fechar(true) : setAberta(true))}
        >
          <Barras />
        </button>
      </header>
      {status && <div className="mb-celular-status">{status}</div>}
      <div ref={folha} className={`mb-folha${aberta ? " mb-folha--aberta" : ""}`} id={ID_FOLHA} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="mb-folha__topo">
          <MarcaBase360 modulo={modulo} />
          <button className="mb-menu-icone" type="button" aria-label="Fechar menu" aria-expanded="true" onClick={() => fechar(true)}>
            <Barras />
          </button>
        </div>
        <nav aria-label="Principal">
          {grupos.map((g) => (
            <Fragment key={g.titulo}>
              <span className="mb-folha__rotulo-grupo">{g.titulo}</span>
              {g.itens.map((i) => (
                <Link key={i.href} className="mb-folha__item" href={i.href} aria-current={i.href === atual ? "page" : undefined}>
                  <Icone nome={i.icone} />
                  {i.rotulo}
                </Link>
              ))}
            </Fragment>
          ))}
        </nav>
        <div className="mb-folha__grupo">
          {atalhos.map((a) => (
            <a key={a.href} className="mb-folha__item" href={a.href} target="_blank" rel="noopener">
              {a.rotulo} ↗<span className="mb-visualmente-oculto"> (abre em outra aba)</span>
            </a>
          ))}
        </div>
        {temOutroModulo(modulos) && (
          <div className="mb-folha__grupo">
            <span className="mb-folha__rotulo-grupo">Módulos</span>
            {outros.map((m) => (
              <a key={m.id} className="mb-folha__item" href={m.id === "vendas" || m.id === "parcerias" ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${m.href}` : m.href}>
                {m.nome}
              </a>
            ))}
          </div>
        )}
        <div className="mb-folha__grupo">
          <span className="mb-folha__conta">{conta.nome}</span>
          <Link className="mb-folha__item" href="/conta/" aria-current={pathname.startsWith("/conta") ? "page" : undefined}>
            Minha conta
          </Link>
          <button className="mb-folha__item" type="button" onClick={conta.onSair}>
            Sair
          </button>
        </div>
        <div className="mb-folha__mbigucci">
          <LogoMBigucci />
        </div>
      </div>
      <div className={`mb-folha__veu${aberta ? " mb-folha__veu--aberto" : ""}`} onClick={() => fechar(false)} />
    </>
  );
}
