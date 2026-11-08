"use client";

import { useEffect, useRef, useState } from "react";
import { novoId } from "@/lib/supabase";
import { lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import {
  chaveRascunhoInteracaoParceiro,
  proximoContatoValido,
  TIPOS_INTERACAO_PARCEIRO,
  type TipoInteracaoParceiro,
} from "@/lib/parceiros";
import { gravarInteracao } from "@/lib/parceiros-dados";
import { CampoDiaContato } from "./partes";
import { Campo, CampoEmGrupo } from "../alicerce/campo";
import { Seletor } from "../alicerce/seletor";
import { Aviso } from "../alicerce/aviso";

type Rascunho = { tipo?: TipoInteracaoParceiro; resumo?: string; proximo?: string };
const TIPO_PADRAO: TipoInteracaoParceiro = "ligacao";

/**
 * Registrar interação com o parceiro: tipo, resumo e próximo contato (opcional,
 * com atalhos de 7, 15 e 30 dias). Toda interação do dono reinicia os 90 dias.
 * O id nasce no aparelho (reenvio não duplica) e o rascunho fica no aparelho até gravar.
 */
export function RegistrarInteracao({
  parceiroId,
  idBase,
  onSalvo,
  onCancelar,
}: {
  parceiroId: string;
  idBase: string;
  onSalvo: () => void | Promise<void>;
  onCancelar?: () => void;
}) {
  const [tipo, setTipo] = useState<TipoInteracaoParceiro>(TIPO_PADRAO);
  const [resumo, setResumo] = useState("");
  const [proximo, setProximo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const idEnvio = useRef<string | null>(null);
  const restaurado = useRef(false);
  const chave = chaveRascunhoInteracaoParceiro(parceiroId);

  useEffect(() => {
    const r = lerRascunho<Rascunho>(chave);
    if (r) {
      if (r.tipo && TIPOS_INTERACAO_PARCEIRO.some((t) => t.slug === r.tipo)) setTipo(r.tipo);
      if (typeof r.resumo === "string") setResumo(r.resumo);
      if (typeof r.proximo === "string") setProximo(r.proximo);
    }
    restaurado.current = true;
  }, [chave]);

  useEffect(() => {
    if (!restaurado.current) return;
    if (!resumo.trim() && !proximo && tipo === TIPO_PADRAO) limparRascunho(chave);
    else salvarRascunho(chave, { tipo, resumo, proximo } satisfies Rascunho);
  }, [chave, tipo, resumo, proximo]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!resumo.trim()) return setErro("Escreva o resumo.");
    if (!proximoContatoValido(proximo, new Date())) return setErro("O próximo contato precisa ser de hoje em diante.");
    setSalvando(true);
    idEnvio.current ??= novoId();
    const falha = await gravarInteracao({
      id: idEnvio.current,
      parceiro_id: parceiroId,
      tipo,
      resumo: resumo.trim(),
      proximo_contato: proximo || null,
    });
    setSalvando(false);
    if (falha) return setErro(falha);
    idEnvio.current = null;
    limparRascunho(chave);
    setTipo(TIPO_PADRAO);
    setResumo("");
    setProximo("");
    await onSalvo();
  }

  return (
    <form id={idBase} onSubmit={salvar} className="parcerias-painel-form" noValidate>
      <div className="mb-lateral__corpo">
      <CampoEmGrupo id={idBase + "-tipo"} rotulo="Tipo">
        <Seletor idRotulo={idBase + "-tipo"} valor={tipo} onChange={setTipo} opcoes={TIPOS_INTERACAO_PARCEIRO.map((t) => ({ valor: t.slug, rotulo: t.nome }))} />
      </CampoEmGrupo>
      <Campo rotulo="Resumo" obrigatorio>
        <textarea id={idBase + "-resumo"} className="mb-campo__entrada" rows={3} placeholder="O que foi combinado" required maxLength={2000} value={resumo} onChange={(e) => setResumo(e.target.value)} />
      </Campo>
      <CampoDiaContato id={idBase + "-proximo"} valor={proximo} onChange={setProximo} />
      <p className="mb-campo__ajuda">O próximo contato entra na sua lista do dia. Registrar reinicia os 90 dias. O rascunho fica neste aparelho.</p>
      {erro && <Aviso tom="erro" titulo="Não foi possível registrar a interação" texto={erro} />}
      </div>
      <div className="mb-lateral__rodape">
        {onCancelar && <button type="button" className="mb-botao mb-botao--discreto" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando} aria-busy={salvando}>{salvando ? "Registrando…" : "Registrar interação"}</button>
      </div>
    </form>
  );
}
