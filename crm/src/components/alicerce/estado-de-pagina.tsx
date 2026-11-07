"use client";

import { useState } from "react";
import Link from "next/link";
import { Icone } from "./icone";
import type { NomeIcone } from "./icones.gerado.ts";

/**
 * EstadosDePagina do Alicerce (project/components/EstadosDePagina): quando a tela não tem o que mostrar por um
 * motivo que não é "a lista está vazia" (isso é EstadoVazio). Sobrelinha com o nome do estado, título com o
 * fato, texto com o próximo passo, uma ação e, se precisar, o detalhe. As mesmas palavras em todos os módulos.
 * Os textos de cada estado estão em TEXTOS (do Vocabulário e do README da peça); o código técnico nunca vai
 * na tela: só em "Copiar detalhes para o suporte".
 */
export type TipoDeEstado = "erro-de-carga" | "sem-permissao" | "nao-encontrado" | "em-analise" | "desativado" | "sem-modulos" | "em-construcao" | "sem-conexao";

const TIPOS: Record<TipoDeEstado, { sobrelinha: string; icone: NomeIcone; tom?: "erro" | "alerta" | "info" }> = {
  "erro-de-carga": { sobrelinha: "Erro de carga", icone: "atualizar", tom: "erro" },
  "sem-permissao": { sobrelinha: "Sem permissão", icone: "cadeado" },
  "nao-encontrado": { sobrelinha: "Não encontrado", icone: "busca" },
  "em-analise": { sobrelinha: "Acesso em análise", icone: "agenda", tom: "info" },
  desativado: { sobrelinha: "Acesso desativado", icone: "encerrado" },
  "sem-modulos": { sobrelinha: "Sem módulos", icone: "modulos" },
  "em-construcao": { sobrelinha: "Em construção", icone: "obra" },
  "sem-conexao": { sobrelinha: "Sem conexão", icone: "sem-conexao", tom: "alerta" },
};

export function EstadoDePagina({
  tipo,
  titulo,
  texto,
  acoes,
  detalhe,
  compacto,
}: {
  tipo: TipoDeEstado;
  titulo: string;
  texto: string;
  /** A ação do estado, já com as classes `.mb-botao` (uma só; o erro de carga leva o primário). */
  acoes?: React.ReactNode;
  detalhe?: React.ReactNode;
  /** Dentro de um cartão ou tabela que falhou sozinha. */
  compacto?: boolean;
}) {
  const { sobrelinha, icone, tom } = TIPOS[tipo];
  return (
    <div className={`mb-estado${compacto ? " mb-estado--compacto" : ""}${tom ? ` mb-estado--${tom}` : ""}`}>
      <span className="mb-estado__icone">
        <Icone nome={icone} />
      </span>
      <span className="mb-estado__sobrelinha">{sobrelinha}</span>
      <h2 className="mb-estado__titulo">{titulo}</h2>
      <p className="mb-estado__texto">{texto}</p>
      {acoes && <div className="mb-estado__acoes">{acoes}</div>}
      {detalhe && <span className="mb-estado__detalhe">{detalhe}</span>}
    </div>
  );
}

/** Botão discreto "Copiar detalhes para o suporte": copia o código técnico, o endereço e a hora para a área de transferência. */
export function CopiarDetalhes({ codigo }: { codigo?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    const linhas = [codigo ? `Código: ${codigo}` : null, `Endereço: ${location.href}`, `Hora: ${new Date().toLocaleString("pt-BR")}`].filter(Boolean);
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={copiar}>
      {copiado ? "✓ Detalhes copiados" : "Copiar detalhes para o suporte"}
    </button>
  );
}

/** Link com cara de botão (`a.mb-botao`) para a ação de voltar/ir. */
export function LinkDoEstado({ href, children, primario }: { href: string; children: React.ReactNode; primario?: boolean }) {
  return (
    <Link href={href} className={`mb-botao ${primario ? "mb-botao--primario" : "mb-botao--secundario"}`}>
      {children}
    </Link>
  );
}
