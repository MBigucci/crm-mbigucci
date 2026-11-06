"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Casca } from "@/components/casca";
import { useSessao } from "@/lib/sessao";

/** Início do Marketing: o gerente geral vai direto ao Direcionador. */
export default function Inicio() {
  const { ehGerenteGeral } = useSessao();
  const router = useRouter();
  useEffect(() => {
    if (ehGerenteGeral) router.replace("/direcionador/");
  }, [ehGerenteGeral, router]);

  return (
    <Casca titulo="Base360 Marketing" eyebrow="Início">
      {!ehGerenteGeral && (
        <div className="card max-w-[560px]">
          <p className="text-ink-soft">O Marketing ainda não tem telas para o seu perfil. Volte ao Base360 Vendas pelo endereço de sempre.</p>
        </div>
      )}
    </Casca>
  );
}
