"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * O que o MB.popup.ligar faz, no estado do React (o MB.*.ligar não vai em DOM do React): abre e fecha,
 * põe o foco no primeiro item ao abrir, fecha com Esc (o foco volta ao botão) e com clique fora.
 * `raiz` é o contêiner (.mb-ancora) que tem o botão e o popup: clicar dentro dele não fecha.
 */
export function usePopup(fecharAoMudar?: unknown) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const raiz = useRef<HTMLDivElement>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }, []);
  const alternar = useCallback(() => setAberto((a) => !a), []);

  // Muda a página, fecha.
  useEffect(() => setAberto(false), [fecharAoMudar]);

  useEffect(() => {
    if (!aberto) return;
    const primeiro = raiz.current?.querySelector<HTMLElement>('[role="menu"] a, [role="menu"] button');
    primeiro?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar(true);
    };
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) fechar(false);
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("click", fora, true);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("click", fora, true);
    };
  }, [aberto, fechar]);

  return { aberto, alternar, fechar, botao, raiz };
}
