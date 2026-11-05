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
import { CampoDiaContato, Opcao } from "./partes";

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
  destaque = true,
}: {
  parceiroId: string;
  idBase: string;
  onSalvo: () => void | Promise<void>;
  onCancelar?: () => void;
  destaque?: boolean;
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
    <form onSubmit={salvar} className="grid gap-3" noValidate>
      <fieldset>
        <legend className="field-label">Tipo</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIPOS_INTERACAO_PARCEIRO.map((t) => (
            <Opcao key={t.slug} marcado={tipo === t.slug} onClick={() => setTipo(t.slug)} className="px-1">
              {t.nome}
            </Opcao>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor={`${idBase}-resumo`}>
          Resumo
        </label>
        <textarea
          id={`${idBase}-resumo`}
          className="input min-h-[88px]"
          placeholder="O que foi combinado"
          maxLength={2000}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label">Próximo contato</span>
        <CampoDiaContato id={`${idBase}-proximo`} valor={proximo} onChange={setProximo} />
        <p className="mt-1 text-[12px] text-concrete">O próximo contato entra na sua lista do dia.</p>
      </div>
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      <div className="flex flex-wrap gap-2 [&>*]:flex-1">
        {onCancelar && (
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className={destaque ? "btn btn-red btn-lg focus-ring" : "btn btn-ghost btn-lg focus-ring"}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Registrar"}
        </button>
      </div>
      <p className="text-[12px] text-concrete">Registrar reinicia os 90 dias. O rascunho fica salvo se a página recarregar.</p>
    </form>
  );
}
