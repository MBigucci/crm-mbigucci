"use client";

import { useEffect, useState } from "react";
import { Icone } from "./icone";

const VOLTOU_MS = 4_000;

/**
 * AvisoConexao do Alicerce (project/components/AvisoConexao), no estado do React (sem MB.conexao.ligar):
 * pílula de vidro fixa no topo enquanto o aparelho está sem internet; ao voltar, troca para
 * `.mb-conexao--voltou` e some em 4 s. Não fecha sozinho nem com clique enquanto falta a conexão.
 * O elemento fica sempre montado (`hidden` quando não há o que dizer) para o leitor de tela anunciar a troca.
 * O texto é o do Vendas de hoje: não há fila offline, então nada é gravado até a internet voltar (o
 * Alicerce prevê "as mudanças ficam no aparelho e sobem depois", que aqui não é verdade).
 */
export function AvisoConexao() {
  // "sem" enquanto offline; "voltou" por 4 s depois que a conexão volta.
  const [estado, setEstado] = useState<"ok" | "sem" | "voltou">("ok");

  useEffect(() => {
    let cronometro: ReturnType<typeof setTimeout> | undefined;
    const caiu = () => {
      clearTimeout(cronometro);
      setEstado("sem");
    };
    const voltou = () => {
      clearTimeout(cronometro);
      setEstado("voltou");
      cronometro = setTimeout(() => setEstado("ok"), VOLTOU_MS);
    };
    if (!navigator.onLine) caiu();
    window.addEventListener("offline", caiu);
    window.addEventListener("online", voltou);
    return () => {
      clearTimeout(cronometro);
      window.removeEventListener("offline", caiu);
      window.removeEventListener("online", voltou);
    };
  }, []);

  return (
    <div className={`mb-conexao${estado === "voltou" ? " mb-conexao--voltou" : ""}`} role="status" hidden={estado === "ok"}>
      {estado === "voltou" ? (
        <>
          <Icone nome="sucesso" />
          <span className="mb-conexao__texto">Conexão de volta.</span>
        </>
      ) : (
        <>
          <Icone nome="sem-conexao" />
          <span className="mb-conexao__texto">Sem conexão</span>
          <span className="mb-conexao__detalhe">· nada é gravado sem internet</span>
        </>
      )}
    </div>
  );
}
