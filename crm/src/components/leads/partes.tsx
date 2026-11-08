"use client";

import { useEffect, useRef } from "react";
import { formatarQuando, formatarWhatsapp, temperatura, type Lead } from "@/lib/leads";
import { aDetalhar, seloSemContato, TOQUE } from "@/lib/followup";
import { prazoDoLead, seloPrazo, seloResposta, type HorarioAtendimento } from "@/lib/prazo";

import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { Chip } from "@/components/alicerce/chip";
import { chipDaTemperatura, nivelDoPrazo, nivelDoSemContato, tomDaEtapa } from "@/components/alicerce/mapas";
import { Prazo } from "@/components/alicerce/prazo";
import { Selo } from "@/components/alicerce/selo";
import { useToast } from "@/components/alicerce/toast";

/** "hoje, 10:42", "ontem, 17:20" ou "em 29/10/2026, 10:42", para o meio de uma frase. */
export function quandoNaFrase(iso: string, agora: Date): string {
  const q = formatarQuando(iso, agora);
  return /^d/.test(q) ? `em ${q}` : q.charAt(0).toLowerCase() + q.slice(1);
}

/**
 * O card do lead no Alicerce (project/components/CardLead, receita do CardDeItem), usado na Lista do dia.
 * Não tem regra própria: mostra os dados do lead com as funções de domínio (prazo do primeiro contato,
 * mensagem nova, toque a detalhar, próximo contato e dias sem contato), na mesma ordem.
 *
 * - O card inteiro abre a ficha; sem "Abrir" e sem ⋯.
 * - `Prazo` na primeira linha, `Chip` de temperatura à direita, `Selo` da etapa e a faixa com
 *   Registrar · WhatsApp →. Com um toque a detalhar, a faixa é WhatsApp → · Detalhar.
 * - Registrar e Detalhar abrem o painel (`onRegistrar`, que recebe o botão para devolver o foco);
 *   o WhatsApp abre a mensagem pronta (`onWhatsapp`), e o toque grava como sempre.
 * - Sem telefone, sem WhatsApp.
 * - Passo e (Leads e Agenda), só acréscimos opcionais: `dono` (a linha do corretor, para quem vê a equipe) e o
 *   ✕ Descartado em Selo. Sem `onRegistrar` (lead de outro corretor) não há Registrar, nem a linha do toque a
 *   detalhar, nem Detalhar (o card antigo só os tinha com `onToque`); sem `onWhatsapp`, não há WhatsApp. Sem
 *   nenhuma ação, o card fica sem faixa.
 */
export function CardLeadAlicerce({
  lead,
  agora,
  horario,
  etapa,
  destaque = false,
  indice,
  dono,
  onRegistrar,
  onWhatsapp,
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  etapa: string;
  destaque?: boolean;
  indice?: number;
  /** O corretor dono, para quem vê a equipe (“A distribuir” quando não há). */
  dono?: string;
  onRegistrar?: (botao: HTMLElement) => void;
  onWhatsapp?: () => void;
}) {
  const prazo = prazoDoLead(lead, agora, horario);
  const toque = onRegistrar ? aDetalhar(lead) : null;
  const resposta = seloResposta(lead, agora);
  const semContato = seloSemContato(lead, agora, true);
  const contato = lead.proximo_contato;
  const atrasado = !!contato && new Date(contato).getTime() < agora.getTime();
  const selo = prazo ? seloPrazo(prazo, agora) : null;

  const linhaDoContato = !contato ? (
    <span className="mb-item__linha">Sem próximo contato</span>
  ) : atrasado ? (
    <span className="mb-item__linha">
      <Prazo nivel="estourado">! Atrasado · {formatarQuando(contato, agora)}</Prazo>
    </span>
  ) : (
    <span className="mb-item__linha">Próximo contato: {quandoNaFrase(contato, agora)}</span>
  );

  const linhas = (
    <>
      {resposta && (
        <span className="mb-item__linha">
          <Prazo nivel={nivelDoPrazo(resposta.nivel)}>
            {resposta.sinal} {resposta.texto}
          </Prazo>
        </span>
      )}
      {selo ? (
        <>
          <span className="mb-item__linha">
            <Prazo nivel={nivelDoPrazo(selo.nivel)}>
              {selo.sinal} {selo.texto}
            </Prazo>
          </span>
          {contato && linhaDoContato}
        </>
      ) : (
        <>
          {toque && (
            <span className="mb-item__linha">
              <Prazo nivel="atencao">
                ! {TOQUE[toque.tipo].texto} {quandoNaFrase(toque.em, agora)}
              </Prazo>
            </span>
          )}
          {linhaDoContato}
          {semContato && (
            <span className="mb-item__linha">
              <Prazo nivel={nivelDoSemContato(semContato.nivel)}>! {semContato.texto}</Prazo>
            </span>
          )}
        </>
      )}
      {dono && <span className="mb-item__linha">{dono}</span>}
    </>
  );

  const t = chipDaTemperatura(lead.temperatura);
  const botao = (rotulo: string, rotuloAcessivel: string) =>
    onRegistrar ? (
      <button className="mb-botao mb-botao--secundario" type="button" aria-haspopup="dialog" aria-label={rotuloAcessivel} onClick={(e) => onRegistrar(e.currentTarget)}>
        {rotulo}
      </button>
    ) : null;
  const whatsapp =
    lead.whatsapp && onWhatsapp ? (
      <BotaoWhatsapp onClick={onWhatsapp} rotuloAcessivel={`WhatsApp de ${lead.nome}, ${formatarWhatsapp(lead.whatsapp)}`} />
    ) : null;
  const comAcao = !!onRegistrar || !!whatsapp;

  return (
    <CardDeItem
      href={`/leads/ficha/?id=${lead.id}`}
      titulo={lead.nome}
      linhas={linhas}
      direita={
        <Chip nivel={t.nivel} sinal={t.sinal}>
          {t.texto}
        </Chip>
      }
      texto={
        lead.ultima_interacao_texto && lead.ultima_interacao_em
          ? `${formatarQuando(lead.ultima_interacao_em, agora)} · ${lead.ultima_interacao_texto}`
          : "Nenhuma interação registrada."
      }
      rodape={
        <>
          <Selo tom={tomDaEtapa(lead.etapa)}>{etapa}</Selo>
          {lead.status === "descartado" && <Selo tom="etapa-descartado">✕ Descartado</Selo>}
        </>
      }
      faixa={
        !comAcao ? undefined : toque ? (
          <>
            {whatsapp}
            {botao("Detalhar", `Detalhar contato: ${lead.nome}`)}
          </>
        ) : (
          <>
            {botao("Registrar", `Registrar interação: ${lead.nome}`)}
            {whatsapp}
          </>
        )
      }
      destaque={destaque}
      indice={indice}
    />
  );
}

/**
 * Desfazer no lugar de pedir confirmação antes: o Toast do Alicerce (sucesso, com o botão Desfazer, 8 s),
 * com a mesma assinatura de sempre para as telas que o usam. Desfazer grava de novo o valor anterior,
 * então o histórico mostra as duas mudanças. O Toast fica no ToastProvider da Casca.
 * O `onFim` roda quando o aviso acaba (passou o tempo, tocou no X ou outro toast o substituiu), para a tela limpar o
 * estado dela. Cada texto novo é um toast novo; para o mesmo texto de novo com o anterior ainda na tela, a tela passa
 * uma `chave` diferente por aviso (opcional).
 */
export function AvisoDesfazer({ texto, onDesfazer, onFim, chave }: { texto: string; onDesfazer: () => void; onFim: () => void; chave?: string | number }) {
  const toast = useToast();
  const desfazer = useRef(onDesfazer);
  const fim = useRef(onFim);
  desfazer.current = onDesfazer;
  fim.current = onFim;
  useEffect(() => {
    let ativo = true;
    const id = toast.mostrar(texto, {
      tipo: "sucesso",
      aoDesfazer: () => desfazer.current(),
      // Depois de desfazer, a tela pode ter trocado o aviso (ou tirado): só avisa o fim se ainda for este.
      aoFechar: () => {
        if (ativo) fim.current();
      },
    });
    return () => {
      ativo = false;
      toast.fechar(id);
    };
  }, [texto, chave, toast]);
  return null;
}
