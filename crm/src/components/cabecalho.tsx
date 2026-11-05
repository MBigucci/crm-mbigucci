"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { AvisoOffline } from "./aviso-offline";
import { IconeMenu, nomeDoIcone } from "./icones-menu";
import { assinarBarra, definirBarra, lerBarra } from "@/lib/barra";

/** externo: endereço fora do CRM, abre em outra aba. */
export type ItemMenu = { href: string; rotulo: string; externo?: boolean; icone?: string };

/** Quem está no CRM: o apelido (ou o primeiro nome) vai no cabeçalho. */
export type Conta = { nome: string; apelido?: string | null; onSair: () => void };

/**
 * Atalhos externos, iguais para todos os perfis: no cabeçalho do computador e
 * no fim do menu do celular. Abrem em outra aba para não perder o atendimento.
 */
export const ATALHOS: ItemMenu[] = [
  { href: "https://mbigucci.com.br/ferramentas", rotulo: "Simulador", externo: true, icone: "simulador" },
  { href: "https://mbigucci.com.br", rotulo: "Site MBigucci", externo: true, icone: "site" },
  { href: "https://linktr.ee/construtoraMBigucci", rotulo: "Linktree", externo: true, icone: "linktree" },
];

type Dica = { texto: string; topo: number } | null;

/** Rótulo de link externo: ↗ visual e aviso de nova aba para o leitor de tela. */
function RotuloExterno({ rotulo }: { rotulo: string }) {
  return (
    <>
      {rotulo} <span aria-hidden>↗</span>
      <span className="sr-only"> (abre em outra aba)</span>
    </>
  );
}

/** Item do menu: link do app, ou link externo em outra aba. Ícone + rótulo. */
function LinkDoMenu({
  item,
  className,
  atual,
  onClick,
  onDica,
}: {
  item: ItemMenu;
  className: string;
  atual: boolean;
  onClick?: () => void;
  onDica?: (el: HTMLElement | null, texto: string) => void;
}) {
  const conteudo = (
    <>
      <IconeMenu nome={item.icone ?? nomeDoIcone(item.href, item.rotulo)} />
      <span className="rotulo-menu min-w-0">{item.externo ? <RotuloExterno rotulo={item.rotulo} /> : item.rotulo}</span>
    </>
  );
  const dica = onDica
    ? {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => onDica(e.currentTarget, item.rotulo),
        onMouseLeave: () => onDica(null, ""),
        onFocus: (e: React.FocusEvent<HTMLElement>) => onDica(e.currentTarget, item.rotulo),
        onBlur: () => onDica(null, ""),
      }
    : {};
  if (item.externo)
    return (
      <a href={item.href} target="_blank" rel="noopener" className={className} onClick={onClick} {...dica}>
        {conteudo}
      </a>
    );
  return (
    <Link href={item.href} aria-current={atual ? "page" : undefined} className={className} onClick={onClick} {...dica}>
      {conteudo}
    </Link>
  );
}

/** Logo oficial (ou "MBigucci" em brand se a imagem faltar) + nome da ferramenta. */
function Marca() {
  const [semLogo, setSemLogo] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // O erro pode acontecer antes da hidratação, quando o onError ainda não existe.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setSemLogo(true);
  }, []);
  return (
    <Link href="/" className="focus-ring flex shrink-0 items-center gap-3 lg:gap-4">
      {semLogo ? (
        <span className="font-display text-[17px] font-extrabold text-brand">MBigucci</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/mbigucci-logo.png`}
          alt="MBigucci Construtora"
          className="marca-selo h-logo w-auto lg:h-[28px]"
          onError={() => setSemLogo(true)}
        />
      )}
      <span className="font-display text-[16px] font-bold leading-none text-ink lg:text-[20px]">CRM</span>
    </Link>
  );
}

const semBarra = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

function useAtual() {
  const atual = semBarra(usePathname() ?? "/");
  return { atual, ativo: (href: string) => semBarra(href) === atual };
}

function useBarra() {
  return useSyncExternalStore(assinarBarra, lerBarra, () => "aberta" as const);
}

/** Apelido cadastrado ou, sem ele, o primeiro nome. */
export const nomeCurto = (c: Pick<Conta, "nome" | "apelido">) => c.apelido?.trim() || c.nome.trim().split(/\s+/)[0] || c.nome;

/** Fecha com Escape (devolvendo o foco ao acionador) enquanto `aberto`. */
function useEscape(aberto: boolean, fechar: () => void, acionador: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fechar();
      acionador.current?.focus();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto, fechar, acionador]);
}

/** Menu da conta no computador: "Apelido ▾" abre nome completo, Minha conta e Sair. */
function MenuConta({ conta }: { conta: Conta }) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const { atual, ativo } = useAtual();
  useEffect(() => setAberto(false), [atual]);
  useEscape(aberto, () => setAberto(false), botao);
  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  return (
    <div ref={caixa} className="relative hidden lg:block">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-conta"
        onClick={() => setAberto((a) => !a)}
        className="focus-ring flex min-h-[36px] items-center gap-[6px] rounded-sm px-2 text-[13px] font-semibold text-ink hover:bg-ink/5"
      >
        {nomeCurto(conta)}
        <span aria-hidden className="text-[11px] text-ink-soft">
          ▾
        </span>
      </button>
      {aberto && (
        <div id="menu-conta" className="absolute right-0 top-full z-40 mt-1 w-[240px] rounded-sm border border-line bg-surface py-1">
          <p className="border-b border-line px-[14px] pb-[10px] pt-2 text-[13px] text-ink-soft">{conta.nome}</p>
          <Link
            href="/conta/"
            aria-current={ativo("/conta/") ? "page" : undefined}
            onClick={() => setAberto(false)}
            className={clsx(
              "focus-ring flex min-h-[40px] items-center px-[14px] text-[13px] font-semibold hover:bg-ink/5",
              ativo("/conta/") ? "text-brand" : "text-ink",
            )}
          >
            Minha conta
          </Link>
          <button
            type="button"
            onClick={conta.onSair}
            className="focus-ring flex min-h-[40px] w-full items-center px-[14px] text-left text-[13px] font-semibold text-ink hover:bg-ink/5"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Barra do topo. No computador (lg): marca, atalhos externos e o menu da conta.
 * No celular: marca e Menu / Fechar, que abre o painel escuro logo abaixo com
 * os destinos, os atalhos e a conta.
 */
export function Cabecalho({ itens, conta }: { itens?: ItemMenu[]; conta?: Conta }) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const { atual, ativo } = useAtual();
  useEffect(() => setAberto(false), [atual]);
  useEscape(aberto, () => setAberto(false), botao);

  const itemCelular = (atualAqui: boolean) =>
    clsx("item-menu foco-escuro min-h-[48px] px-5 py-[13px] text-[15px]", atualAqui && "item-menu-atual");

  return (
    <>
      {/* fixed, não sticky: no fim da rolagem o "quique" do navegador arrastava o sticky. */}
      <header className="cabecalho-vidro sem-impressao fixed inset-x-0 top-0 z-30">
        <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-2 lg:min-h-[63px] lg:px-6">
          <div className="flex min-w-0 items-center">
            <Marca />
            {itens && (
              <nav aria-label="Atalhos" className="ml-5 hidden items-center gap-5 border-l border-line pl-5 lg:flex">
                {ATALHOS.map((a) => (
                  <a
                    key={a.href}
                    href={a.href}
                    target="_blank"
                    rel="noopener"
                    className="focus-ring whitespace-nowrap text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
                  >
                    <RotuloExterno rotulo={a.rotulo} />
                  </a>
                ))}
              </nav>
            )}
          </div>
          {conta && <MenuConta conta={conta} />}
          {itens && (
            // O mesmo botão do site: três traços que viram ✕ ao abrir.
            <button
              ref={botao}
              type="button"
              className={clsx("botao-hamburguer focus-ring -mr-2 lg:hidden", aberto && "aberto")}
              aria-label={aberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={aberto}
              aria-controls="menu-celular"
              onClick={() => setAberto((a) => !a)}
            >
              <span aria-hidden className="relative block h-4 w-6">
                <span className="traco traco-topo" />
                <span className="traco traco-meio" />
                <span className="traco traco-base" />
              </span>
            </button>
          )}
        </div>
        {itens && aberto && (
          <nav
            id="menu-celular"
            className="menu-escuro absolute inset-x-0 top-full max-h-[calc(100dvh-60px)] overflow-y-auto overscroll-contain pb-3 lg:hidden"
            aria-label="Menu principal"
          >
            <ul className="pt-2">
              {itens.map((i) => (
                <li key={i.href}>
                  <LinkDoMenu item={i} atual={ativo(i.href)} onClick={() => setAberto(false)} className={itemCelular(ativo(i.href))} />
                </li>
              ))}
            </ul>
            <ul aria-label="Atalhos" className="mt-2 divisoria-nav border-t pt-2">
              {ATALHOS.map((a) => (
                <li key={a.href}>
                  <LinkDoMenu item={a} atual={false} onClick={() => setAberto(false)} className={itemCelular(false)} />
                </li>
              ))}
            </ul>
            {conta && (
              <div className="mt-2 divisoria-nav border-t pt-2">
                <p className="px-5 pb-1 pt-2 text-[13px] text-on-dark-muted">{conta.nome}</p>
                <ul>
                  <li>
                    <LinkDoMenu
                      item={{ href: "/conta/", rotulo: "Minha conta" }}
                      atual={ativo("/conta/")}
                      onClick={() => setAberto(false)}
                      className={itemCelular(ativo("/conta/"))}
                    />
                  </li>
                  <li>
                    <button type="button" onClick={conta.onSair} className={clsx(itemCelular(false), "w-full text-left")}>
                      <IconeMenu nome="sair" />
                      <span className="rotulo-menu">Sair</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        )}
      </header>
      {/* Fora do header: o desfoque dele viraria referência do position: fixed. */}
      {/* Reserva a altura do cabeçalho fixo (60 + 1 px no celular, 63 + 1 px no computador). */}
      <div aria-hidden className="sem-impressao h-[61px] lg:h-16" />
      <AvisoOffline />
    </>
  );
}

/**
 * Lateral escura do computador (lg): 180 px aberta, 64 px recolhida. Só os
 * destinos do CRM; atalhos e conta ficam no cabeçalho. Recolhida, mostra só os
 * ícones; o nome continua acessível e aparece numa dica no mouse e no foco.
 */
export function BarraLateral({ itens }: { itens: ItemMenu[] }) {
  const { ativo } = useAtual();
  const barra = useBarra();
  const [dica, setDica] = useState<Dica>(null);
  const recolhida = barra === "recolhida";

  const dicaEm = (el: HTMLElement | null, texto: string, comRecolhida: boolean) => {
    if (!el || !comRecolhida) return setDica(null);
    const r = el.getBoundingClientRect();
    setDica({ texto, topo: r.top + r.height / 2 });
  };
  const mostrarDica = (el: HTMLElement | null, texto: string) => dicaEm(el, texto, recolhida);

  // O botão continua o mesmo elemento ao alternar, então o foco fica nele.
  const alternar = (e: React.MouseEvent<HTMLButtonElement>) => {
    const novo = recolhida ? "aberta" : "recolhida";
    const el = e.currentTarget;
    definirBarra(novo);
    // Recolhida, a dica do próprio botão aparece se ele ainda estiver em foco ou sob o mouse.
    requestAnimationFrame(() => dicaEm(el.matches(":focus-visible, :hover") ? el : null, "Expandir barra", novo === "recolhida"));
  };
  const rotuloBotao = recolhida ? "Expandir barra" : "Recolher barra";

  return (
    <nav id="barra-lateral" aria-label="Menu principal" className="barra-lateral menu-escuro sem-impressao">
      <button
        type="button"
        aria-expanded={!recolhida}
        aria-controls="barra-lateral"
        onClick={alternar}
        onMouseEnter={(e) => mostrarDica(e.currentTarget, rotuloBotao)}
        onMouseLeave={() => setDica(null)}
        onFocus={(e) => mostrarDica(e.currentTarget, rotuloBotao)}
        onBlur={() => setDica(null)}
        className="item-menu item-lateral foco-escuro mb-3 w-full text-left"
      >
        <IconeMenu nome={recolhida ? "expandir" : "recolher"} />
        <span className="rotulo-menu">{rotuloBotao}</span>
      </button>
      {/* Só a lista rola: o controle de recolher fica sempre à vista no topo. */}
      <ul className="lista-lateral flex flex-col gap-[2px]">
        {itens.map((i) => (
          <li key={i.href}>
            <LinkDoMenu
              item={i}
              atual={ativo(i.href)}
              onDica={mostrarDica}
              className={clsx("item-menu item-lateral foco-escuro", ativo(i.href) && "item-menu-atual")}
            />
          </li>
        ))}
      </ul>
      {dica && (
        <span aria-hidden className="dica-lateral" style={{ top: dica.topo }}>
          {dica.texto}
        </span>
      )}
    </nav>
  );
}
