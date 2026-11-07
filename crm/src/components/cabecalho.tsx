"use client";

import Link from "next/link";
import { AvisoOffline } from "./aviso-offline";
import { LockupVendas } from "./marca-base360";

/**
 * Cabeçalho antigo, só para o que ainda não migrou para o Alicerce: a tela Entrar (passo h) e os estados da
 * conta da Casca (passo d). O menu, os atalhos e a conta saíram no passo b do item 48: agora são o
 * MenuLateral, a BarraSuperior, o MenuCelular e o MenuDaConta de components/alicerce/. Este arquivo some
 * quando Entrar e os estados migrarem.
 */
export function Cabecalho() {
  return (
    <>
      {/* fixed, não sticky: no fim da rolagem o "quique" do navegador arrastava o sticky. */}
      <header className="cabecalho-vidro sem-impressao fixed inset-x-0 top-0 z-30">
        <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-2 lg:min-h-[63px] lg:px-6">
          <Link href="/" aria-label="Base360 Vendas, início" className="focus-ring flex shrink-0 items-center">
            <LockupVendas className="h-[24px] lg:h-[28px]" />
          </Link>
        </div>
      </header>
      {/* Fora do header: o desfoque dele viraria referência do position: fixed. */}
      {/* Reserva a altura do cabeçalho fixo (60 + 1 px no celular, 63 + 1 px no computador). */}
      <div aria-hidden className="sem-impressao h-[61px] lg:h-16" />
      <AvisoOffline />
    </>
  );
}
