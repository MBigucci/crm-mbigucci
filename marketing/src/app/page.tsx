"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Casca } from "@/components/casca";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { useSessao } from "@/lib/sessao";

/**
 * Início do Marketing: o gerente geral vai direto ao Direcionador. Quem não é: EstadosDePagina "Sem permissão"
 * (guia, tabela de estados: o título diz de qual perfil é a página; a ação volta ao início de outro módulo).
 */
export default function Inicio() {
  const { ehGerenteGeral } = useSessao();
  const router = useRouter();
  useEffect(() => {
    if (ehGerenteGeral) router.replace("/direcionador/");
  }, [ehGerenteGeral, router]);

  return (
    <Casca titulo="Início">
      {ehGerenteGeral ? (
        <div aria-busy="true">
          <span className="mb-visualmente-oculto">Abrindo o Direcionador…</span>
        </div>
      ) : (
        <EstadoDePagina
          tipo="sem-permissao"
          titulo="O Marketing é do perfil Gerente geral"
          texto="Peça o acesso ao gerente geral. O Base360 Vendas continua aberto para você."
          // <a> comum, não o Link: o Vendas é um site irmão, fora do basePath do Marketing.
          acoes={
            <a className="mb-botao mb-botao--secundario" href="/vendas/">
              Voltar para o Base360 Vendas
            </a>
          }
        />
      )}
    </Casca>
  );
}
