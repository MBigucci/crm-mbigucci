"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { db, novoId } from "@/lib/supabase";
import { erroAoSalvar, jaEstavaSalvo } from "@/lib/erros";
import { deCampos, paraCampos, TIPOS_INTERACAO, type TipoInteracao } from "@/lib/leads";
import { LIMITE_TENTATIVAS, sugerirProximaTentativa, TEXTO_SEM_RESPOSTA, TOQUE, type TipoToque } from "@/lib/followup";
import { chaveRascunhoInteracao, lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import { Aviso } from "@/components/alicerce/aviso";
import { Campo, CampoEmGrupo } from "@/components/alicerce/campo";
import { DataHora } from "@/components/alicerce/data-hora";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Seletor } from "@/components/alicerce/seletor";
import { CampoProximoContato, quandoNaFrase } from "./partes";

export type PropsRegistrarInteracao = {
  leadId: string;
  toque: { tipo: TipoToque; em: string } | null;
  semResposta: { pode: boolean; n: number };
  onSalvo: () => Promise<void>;
};

/**
 * Registrar interação: o estado e a gravação, sem desenho (a ficha e a Lista do dia desenham cada uma o seu).
 *
 * Toda interação tem um tipo (1 toque) e termina com o próximo contato: dia e hora.
 * Depois do toque em WhatsApp ou Ligar, o tipo já vem marcado. "Sem resposta"
 * só aparece com 2 dias ou mais desde a última interação detalhada; escolhê-lo
 * preenche o texto padrão e o próximo contato em 2 dias, e grava ao Registrar.
 * O rascunho (tipo, texto e próximo contato) fica guardado no aparelho por lead.
 */
export function useRegistrarInteracao({ leadId, toque, semResposta, onSalvo }: PropsRegistrarInteracao) {
  const [tipo, setTipo] = useState<TipoInteracao>("whatsapp");
  const [texto, setTexto] = useState("");
  const [contato, setContato] = useState({ data: "", hora: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // "✓ Interação registrada" por alguns segundos depois de gravar (Felipe, 06/11/2026).
  const [registrado, setRegistrado] = useState(false);
  useEffect(() => {
    if (!registrado) return;
    const t = setTimeout(() => setRegistrado(false), 6000);
    return () => clearTimeout(t);
  }, [registrado]);
  // Mesmo id até gravar: se a resposta se perder e a pessoa tocar de novo, não duplica.
  const idEnvio = useRef<string | null>(null);
  const restauradoRef = useRef(false);
  // O texto e a data de antes de escolher Sem resposta, para voltar se trocar de tipo.
  const antesDoSemResposta = useRef<{ texto: string; contato: { data: string; hora: string } } | null>(null);

  useEffect(() => {
    const r = lerRascunho<{ tipo?: TipoInteracao; texto?: string; contato?: { data: string; hora: string } }>(
      chaveRascunhoInteracao(leadId),
    );
    if (r) {
      if (r.tipo) setTipo(r.tipo);
      if (typeof r.texto === "string") setTexto(r.texto);
      if (r.contato && typeof r.contato === "object") setContato(r.contato);
    }
    restauradoRef.current = true;
  }, [leadId]);

  // Depois do toque, Registrar interação já vem com o tipo marcado (WhatsApp ou Ligação).
  const toqueEm = toque?.em;
  const toqueTipo = toque?.tipo;
  useEffect(() => {
    if (toqueEm && toqueTipo) escolher(TOQUE[toqueTipo].tipoDetalhe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toqueEm, toqueTipo]);

  useEffect(() => {
    if (!restauradoRef.current) return;
    const vazio = !texto.trim() && !contato.data && !contato.hora && tipo === "whatsapp";
    if (vazio) {
      limparRascunho(chaveRascunhoInteracao(leadId));
    } else {
      salvarRascunho(chaveRascunhoInteracao(leadId), { tipo, texto, contato });
    }
  }, [leadId, tipo, texto, contato]);

  function escolher(novo: TipoInteracao) {
    if (novo === tipo) return;
    if (novo === "tentativa") {
      antesDoSemResposta.current = { texto, contato };
      setTexto(TEXTO_SEM_RESPOSTA);
      setContato(paraCampos(sugerirProximaTentativa(new Date())));
    } else if (tipo === "tentativa" && antesDoSemResposta.current) {
      setTexto(antesDoSemResposta.current.texto);
      setContato(antesDoSemResposta.current.contato);
      antesDoSemResposta.current = null;
    }
    setTipo(novo);
  }

  // Sem resposta some se deixou de valer (ex.: registrou uma conversa agora), a não ser que já esteja marcado.
  const tipos = [
    ...TIPOS_INTERACAO,
    ...(semResposta.pode || tipo === "tentativa" ? [{ slug: "tentativa" as const, nome: "Sem resposta" }] : []),
  ];

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(null);
    setRegistrado(false);
    if (!texto.trim()) return setErro("Escreva o que aconteceu.");
    if (!contato.data || !contato.hora) return setErro("Marque o dia e a hora do próximo contato.");
    const proximo = deCampos(contato.data, contato.hora);
    if (!proximo) return setErro("Confira o dia e a hora do próximo contato.");
    setSalvando(true);
    idEnvio.current ??= novoId();
    const { error } = await db()
      .from("lead_interacoes")
      .insert({ id: idEnvio.current, lead_id: leadId, tipo, texto: texto.trim(), proximo_contato: proximo });
    setSalvando(false);
    if (error && !jaEstavaSalvo(error)) return setErro(erroAoSalvar(error, "Registrar"));
    idEnvio.current = null;
    antesDoSemResposta.current = null;
    limparRascunho(chaveRascunhoInteracao(leadId));
    setTipo("whatsapp");
    setTexto("");
    setContato({ data: "", hora: "" });
    setRegistrado(true);
    await onSalvo();
  }

  const nTentativa = Math.min(semResposta.n, LIMITE_TENTATIVAS);
  /** O texto do botão que grava. */
  const rotuloDoBotao = salvando ? "Salvando…" : tipo === "tentativa" ? `Registrar tentativa ${nTentativa} de ${LIMITE_TENTATIVAS}` : "Registrar";

  return { tipo, tipos, texto, setTexto, contato, setContato, erro, salvando, registrado, escolher, salvar, rotuloDoBotao };
}

/** O que mostra a frase do toque: “→ Você abriu o WhatsApp hoje, 9h. Conte como foi.” */
const frase = (toque: { tipo: TipoToque; em: string }) =>
  `→ Você ${toque.tipo === "toque_whatsapp" ? "abriu o WhatsApp" : "ligou"} ${quandoNaFrase(toque.em, new Date())}. Conte como foi.`;

/**
 * Registrar interação na ficha do lead: o cartão com o formulário, como sempre foi (DS antigo; o passo f
 * migra a ficha). A Lista do dia usa `RegistrarInteracaoNoPainel`, com a mesma gravação.
 */
export function RegistrarInteracao(props: PropsRegistrarInteracao) {
  const { toque } = props;
  const r = useRegistrarInteracao(props);
  return (
    <form id="registrar" onSubmit={r.salvar} className="card order-[2] grid scroll-mt-[72px] gap-3" noValidate>
      <h2 className="titulo-secao-antigo">Registrar interação</h2>
      {toque && <p className="text-[13px] text-ink-soft">{frase(toque)}</p>}
      <fieldset>
        <legend className="field-label">Como foi</legend>
        <div className={clsx("grid grid-cols-3 gap-2", r.tipos.length > 5 ? "md:grid-cols-6" : "md:grid-cols-5")}>
          {r.tipos.map((t) => {
            const marcado = r.tipo === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={marcado}
                onClick={() => r.escolher(t.slug)}
                className={clsx(
                  "opcao focus-ring rounded-sm border px-1 py-2 text-[13px] font-semibold transition-colors",
                  marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {t.nome}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor="texto">
          O que aconteceu
        </label>
        <textarea
          id="texto"
          className="input min-h-[88px]"
          placeholder="Ex.: Falou que quer visitar no sábado"
          value={r.texto}
          onChange={(e) => r.setTexto(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label">Próximo contato</span>
        <CampoProximoContato idBase="interacao-contato" {...r.contato} onChange={r.setContato} />
      </div>
      {r.erro && <p className="aviso-erro">! {r.erro}</p>}
      <p role="status" className={r.registrado ? "aviso-ok" : "sr-only"}>
        {r.registrado ? "✓ Interação registrada" : ""}
      </p>
      <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={r.salvando}>
        {r.rotuloDoBotao}
      </button>
    </form>
  );
}

/**
 * Registrar interação na Lista do dia (Alicerce): o PainelLateral (no celular, a folha que sobe) com Como foi,
 * O que aconteceu e Próximo contato, e Cancelar e Registrar no rodapé. Mesma gravação, mesmo rascunho e
 * mesmos erros da ficha (`useRegistrarInteracao`). Quem usa monta um por lead (key) e controla `aberto`.
 */
export function RegistrarNoPainel({
  nome,
  etapa,
  aberto,
  onFechar,
  foco,
  ...props
}: PropsRegistrarInteracao & {
  nome: string;
  etapa: string;
  aberto: boolean;
  onFechar: () => void;
  foco?: () => HTMLElement | null;
}) {
  const { toque } = props;
  const r = useRegistrarInteracao(props);
  const corpo = (
    <div className="mb-lateral__corpo">
      <CampoEmGrupo id={`reg-como-${props.leadId}`} rotulo="Como foi" ajuda={toque ? frase(toque) : undefined}>
        <Seletor idRotulo={`reg-como-${props.leadId}`} grade={3} opcoes={r.tipos.map((t) => ({ valor: t.slug, rotulo: t.nome }))} valor={r.tipo} onChange={r.escolher} />
      </CampoEmGrupo>
      <Campo rotulo="O que aconteceu">
        <textarea className="mb-campo__entrada" placeholder="Ex.: Falou que quer visitar no sábado" value={r.texto} onChange={(e) => r.setTexto(e.target.value)} />
      </Campo>
      <CampoEmGrupo id={`reg-prox-${props.leadId}`} rotulo="Próximo contato">
        <DataHora idRotulo={`reg-prox-${props.leadId}`} {...r.contato} onChange={r.setContato} />
      </CampoEmGrupo>
      {r.erro && <Aviso tom="erro" titulo={r.erro} />}
    </div>
  );
  const rodape = (
    <div className="mb-lateral__rodape">
      <button className="mb-botao mb-botao--discreto" type="button" data-mb-fechar onClick={onFechar}>
        Cancelar
      </button>
      <button className="mb-botao mb-botao--primario" type="button" aria-busy={r.salvando || undefined} disabled={r.salvando} onClick={() => r.salvar()}>
        {r.rotuloDoBotao}
      </button>
    </div>
  );
  return (
    <PainelLateral aberto={aberto} onFechar={onFechar} titulo="Registrar interação" descricao={`${nome} · ${etapa}`} rodape={rodape} foco={foco}>
      {corpo}
    </PainelLateral>
  );
}
