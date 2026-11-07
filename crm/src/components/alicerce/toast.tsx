"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./icone";

type TipoDoToast = "info" | "sucesso" | "alerta" | "erro";
export type OpcoesDoToast = {
  tipo?: TipoDoToast;
  /** Mostra o botão (rótulo em `acao`, padrão “Desfazer”) e chama a função ao tocar nele. */
  aoDesfazer?: () => void;
  acao?: string;
  /** Em milissegundos. Padrão: 8 s; o de erro fica até fechar (0). */
  duracao?: number;
};

const SEGUNDOS = 8_000;
/** O mesmo valor de `--mov-base` (200ms): o tempo da saída antes de tirar o toast da tela. */
const SAIDA_MS = 200;

type Pedido = { id: number; texto: string; opcoes: OpcoesDoToast };
type Api = { mostrar: (texto: string, opcoes?: OpcoesDoToast) => void; fechar: () => void };

const SemToast: Api = { mostrar: () => undefined, fechar: () => undefined };
const Contexto = createContext<Api>(SemToast);

/** Toast do Alicerce: `const toast = useToast(); toast.mostrar("Interação registrada.", { tipo: "sucesso" })`. Sem o provider, não faz nada. */
export const useToast = () => useContext(Contexto);

let contador = 0;

/**
 * Toast do Alicerce (project/components/Toast), no estado do React: o Aviso que flutua, embaixo e no centro,
 * um por vez (o novo substitui o anterior). Os quatro usos: Desfazer, confirmar o que deu certo, erro que não
 * bloqueia (fica até fechar) e informação do sistema. Some em 8 s; o tempo pausa com o ponteiro ou o foco em
 * cima. O de erro é `role="alert"`; os outros, `role="status"`. Vai para o <body> por portal: o `position: fixed`
 * não pode ficar preso a um ancestral com `transform`.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [atual, setAtual] = useState<Pedido | null>(null);
  const mostrar = useCallback((texto: string, opcoes: OpcoesDoToast = {}) => setAtual({ id: ++contador, texto, opcoes }), []);
  const fechar = useCallback(() => setAtual(null), []);
  const api = useMemo(() => ({ mostrar, fechar }), [mostrar, fechar]);
  return (
    <Contexto.Provider value={api}>
      {children}
      {atual && <Toast key={atual.id} pedido={atual} onFim={fechar} />}
    </Contexto.Provider>
  );
}

function Toast({ pedido, onFim }: { pedido: Pedido; onFim: () => void }) {
  const { texto, opcoes } = pedido;
  const tipo = opcoes.tipo ?? "info";
  const [montado, setMontado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const cronometro = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duracao = opcoes.duracao ?? (tipo === "erro" ? 0 : SEGUNDOS);

  const fechar = useCallback(() => {
    if (cronometro.current) clearTimeout(cronometro.current);
    setVisivel(false);
    setTimeout(onFim, SAIDA_MS);
  }, [onFim]);
  const contar = useCallback(() => {
    if (cronometro.current) clearTimeout(cronometro.current);
    if (duracao > 0) cronometro.current = setTimeout(fechar, duracao);
  }, [duracao, fechar]);
  const pausar = useCallback(() => {
    if (cronometro.current) clearTimeout(cronometro.current);
  }, []);

  useEffect(() => {
    setMontado(true);
    // Depois da primeira pintura, para a entrada animar (a classe --visivel muda opacidade e posição).
    const q = requestAnimationFrame(() => requestAnimationFrame(() => setVisivel(true)));
    contar();
    return () => {
      cancelAnimationFrame(q);
      if (cronometro.current) clearTimeout(cronometro.current);
    };
  }, [contar]);

  if (!montado) return null;
  return createPortal(
    <div
      className={`mb-toast${tipo === "info" ? "" : ` mb-toast--${tipo}`}${visivel ? " mb-toast--visivel" : ""}`}
      role={tipo === "erro" ? "alert" : "status"}
      aria-live={tipo === "erro" ? "assertive" : "polite"}
      onMouseEnter={pausar}
      onMouseLeave={contar}
      onFocus={pausar}
      onBlur={contar}
    >
      <Icone nome={tipo === "info" ? "info" : tipo} />
      <span className="mb-toast__texto">{texto}</span>
      {opcoes.aoDesfazer && (
        <button
          type="button"
          className="mb-toast__acao"
          onClick={() => {
            opcoes.aoDesfazer?.();
            fechar();
          }}
        >
          {opcoes.acao ?? "Desfazer"}
        </button>
      )}
      <button type="button" className="mb-toast__fechar" aria-label="Fechar aviso" onClick={fechar}>
        <Icone nome="fechar" />
      </button>
    </div>,
    document.body,
  );
}
