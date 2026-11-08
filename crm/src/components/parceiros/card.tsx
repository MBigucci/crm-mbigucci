"use client";

import { useRef, useState } from "react";
import { formatarDataHora, linkWhatsapp, ESTAGIOS, type ParceiroComSituacao } from "@/lib/parceiros";
import { ProximoContatoParceiro, TextoPrazo } from "./partes";
import { RegistrarInteracao } from "./registrar-interacao";
import { CardDeItem } from "../alicerce/card-de-item";
import { Selo } from "../alicerce/selo";
import { PainelLateral } from "../alicerce/painel-lateral";
import { useToast } from "../alicerce/toast";

const COMO_ENTROU: Record<string, string> = { link: "pelo link", estande: "no estande", manual: "à mão" };
export function subtituloParceiro(p: Pick<ParceiroComSituacao, "empresa" | "creci">) {
  return [p.empresa?.trim() || "Autônomo", p.creci ? `CRECI ${p.creci}` : null].filter(Boolean).join(" · ");
}

/** CardDeItem.md:3-22; tarefa com três campos no PainelLateral.md:3. */
export function CardParceiro({ p, agora, eu, dono, destaque, onSalvo }: { p: ParceiroComSituacao; agora: Date; eu: string; dono?: string; destaque: boolean; onSalvo: () => Promise<void> }) {
  const [registrando, setRegistrando] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const meu = p.gerente_id === eu;
  const wa = linkWhatsapp(p.whatsapp_norm);
  return <>
    <CardDeItem href={`/parceiros/ficha/?id=${p.id}`} titulo={p.nome} destaque={destaque}
      linhas={<>
        <p className="mb-item__linha"><TextoPrazo faixa={p.faixa} dias={p.dias_prazo} comecou={!!p.ultima_interacao_em} /></p>
        <p className="mb-item__linha">{subtituloParceiro(p)}</p>
        <p className="mb-item__linha">{p.estagio === "novo" ? `Recebido ${COMO_ENTROU[p.entrada] ?? ""} em ${formatarDataHora(p.atribuido_em)}` : <>Próximo contato: <ProximoContatoParceiro dia={p.proximo_contato} agora={agora} /></>}</p>
        {dono && <p className="mb-item__linha">Gerente: {dono}</p>}
        {p.reentrada_em && <p className="mb-item__linha mb-item__linha--forte">! Procurou a MBigucci de novo em {formatarDataHora(p.reentrada_em)}</p>}
      </>}
      rodape={<Selo>{ESTAGIOS.find((e) => e.slug === p.estagio)?.nome ?? p.estagio}</Selo>}
      faixa={(meu || wa) ? <>
        {meu && <button ref={botao} type="button" className="mb-botao mb-botao--secundario" aria-haspopup="dialog" onClick={() => setRegistrando(true)}>Registrar interação</button>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mb-botao mb-botao--whatsapp">WhatsApp →</a>}
      </> : undefined}
    />
    <PainelLateral aberto={registrando} onFechar={() => setRegistrando(false)} titulo="Registrar interação" descricao={p.nome} foco={() => botao.current}>
      <RegistrarInteracao parceiroId={p.id} idBase={`card-${p.id}`} onCancelar={() => setRegistrando(false)} onSalvo={async () => { setRegistrando(false); toast.mostrar("Interação registrada. O prazo dos 90 dias recomeçou.", { tipo: "sucesso" }); await onSalvo(); }} />
    </PainelLateral>
  </>;
}
