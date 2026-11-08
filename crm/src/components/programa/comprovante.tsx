"use client";
import { useState } from "react";
import { verComprovante } from "@/lib/programa-dados";
import { Aviso } from "@/components/alicerce/aviso";

/** URL assinada só no toque, por 120 segundos; não publica o bucket. */
export function Comprovante({ caminho }: { caminho: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function abrir() {
    const janela = window.open("about:blank", "_blank");
    if (janela) janela.opener = null;
    setOcupado(true); setErro(null);
    const r = await verComprovante(caminho);
    setOcupado(false);
    if (!r.url) { janela?.close(); setErro(r.erro || "Não foi possível abrir o comprovante. Tente de novo."); }
    else if (janela) janela.location.href = r.url;
    else setErro("Permita abrir uma nova aba para ver o comprovante.");
  }
  return <div><button type="button" className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={abrir}>Ver comprovante ↗</button>{erro && <Aviso tom="erro" titulo={erro} />}</div>;
}
