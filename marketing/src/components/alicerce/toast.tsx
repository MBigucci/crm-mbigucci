// Cópia gerada de crm/src/components/alicerce/toast.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
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
  /** Chamada uma vez quando o toast acaba por conta própria: passou o tempo, tocou no X ou outro toast o substituiu (a tela dona do aviso limpa o estado dela). Não é chamada ao tocar na ação (quem desfaz limpa o próprio estado) nem quando `fechar(id)` o tira (quem tira já cuidou do estado). */
  aoFechar?: () => void;
};

const SEGUNDOS = 8_000;
/** O mesmo valor de `--mov-base` (200ms): o tempo da saída antes de tirar o toast da tela. */
const SAIDA_MS = 200;

type Pedido = { id: number; texto: string; opcoes: OpcoesDoToast; fim: { feito: boolean } };

/** Chama o `aoFechar` do pedido uma vez só (passou o tempo, X, ou o toast foi substituído). */
function terminar(p: Pedido) {
  if (p.fim.feito) return;
  p.fim.feito = true;
  p.opcoes.aoFechar?.();
}
type Api = {
  /** Devolve o id do toast, para `fechar(id)` tirar só ele (e não um que o tenha substituído). */
  mostrar: (texto: string, opcoes?: OpcoesDoToast) => number;
  /** Sem id, tira o toast da tela; com id, só se ainda for esse. */
  fechar: (id?: number) => void;
};

const SemToast: Api = { mostrar: () => 0, fechar: () => undefined };
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
  const noAr = useRef<Pedido | null>(null);
  const mostrar = useCallback((texto: string, opcoes: OpcoesDoToast = {}) => {
    const anterior = noAr.current;
    const pedido: Pedido = { id: ++contador, texto, opcoes, fim: { feito: false } };
    noAr.current = pedido;
    setAtual(pedido);
    // O toast que sai por substituição também avisa o fim, para a tela dona dele não ficar com o aviso preso.
    if (anterior) terminar(anterior);
    return pedido.id;
  }, []);
  // Confere o id: o fim de um toast (a saída leva 200 ms) não pode apagar o toast novo que o substituiu.
  const fechar = useCallback((id?: number) => {
    if (id !== undefined && noAr.current?.id !== id) return;
    noAr.current = null;
    setAtual(null);
  }, []);
  const api = useMemo(() => ({ mostrar, fechar }), [mostrar, fechar]);
  return (
    <Contexto.Provider value={api}>
      {children}
      {atual && <Toast key={atual.id} pedido={atual} onFim={fechar} />}
    </Contexto.Provider>
  );
}

function Toast({ pedido, onFim }: { pedido: Pedido; onFim: (id: number) => void }) {
  const { texto, opcoes } = pedido;
  const tipo = opcoes.tipo ?? "info";
  const [montado, setMontado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const cronometro = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duracao = opcoes.duracao ?? (tipo === "erro" ? 0 : SEGUNDOS);

  const fechar = useCallback(() => {
    if (cronometro.current) clearTimeout(cronometro.current);
    setVisivel(false);
    setTimeout(() => onFim(pedido.id), SAIDA_MS);
    terminar(pedido);
  }, [onFim, pedido]);
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
            // Quem desfaz já limpa o próprio estado (e pode ter trocado o aviso): o aoFechar não roda aqui.
            pedido.fim.feito = true;
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
