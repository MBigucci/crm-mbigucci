"use client";

import { useEffect, useRef, useState } from "react";
import { excluirDestino, salvarDestino, salvarEndereco } from "@/lib/direcionador-dados";
import { enderecoTxt, type DestinoTela } from "@/lib/telas";
import { Chip } from "./editor-regra";

/**
 * Criar ou editar um destino externo: nome, entrega, endereço, limite por dia,
 * Registrar os envios e ligado. O endereço vai para o cofre (Vault) e volta
 * mascarado; o campo fica vazio e só troca o guardado quando é preenchido.
 */
export function EditorDestino({
  destino,
  usado,
  onFechar,
  onSalvo,
}: {
  destino: DestinoTela | null;
  /** Está em alguma regra: não dá para excluir. */
  usado: boolean;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [nome, setNome] = useState(destino?.nome ?? "");
  const [modo, setModo] = useState<"email" | "porta">(destino?.modo === "porta" ? "porta" : "email");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [chave, setChave] = useState("");
  const [limite, setLimite] = useState(destino?.limite_dia ? String(destino.limite_dia) : "");
  const [registrar, setRegistrar] = useState(destino?.registrar_envios ?? false);
  const [ativo, setAtivo] = useState(destino?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const alerta = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (erro) alerta.current?.scrollIntoView({ block: "nearest" });
  }, [erro]);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  const trocouModo = destino && destino.modo !== modo;
  const temEndereco = !!destino?.endereco && !trocouModo;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("✕ Digite o nome do destino.");
    const lim = limite.trim() ? Number(limite) : null;
    if (lim !== null && (!Number.isInteger(lim) || lim <= 0)) return setErro("✕ O limite por dia é um número inteiro maior que zero, ou vazio para sem limite.");
    const preencheu = modo === "email" ? !!email.trim() : !!url.trim() || !!chave.trim();
    if (!temEndereco && !preencheu) return setErro(modo === "email" ? "✕ Digite o e-mail de entrega." : "✕ Digite o endereço e a chave da porta de entrada.");
    // A troca do endereço da porta pede o endereço; a chave pode ficar a guardada.
    if (modo === "porta" && preencheu && !url.trim()) return setErro("✕ Digite o endereço da porta, começando com https://.");
    setErro(null);
    setSalvando(true);
    try {
      const id = await salvarDestino({ id: destino?.id, nome: nome.trim(), modo, registrar_envios: registrar, limite_dia: lim, ativo });
      if (preencheu) {
        await salvarEndereco(id, modo === "email" ? { email: email.trim() } : { url: url.trim(), ...(chave.trim() ? { chave: chave.trim() } : {}) });
      }
      onSalvo(destino ? "✓ Destino salvo" : "✓ Destino criado. Use-o numa regra para começar a receber leads");
    } catch (e) {
      setErro(`✕ ${e instanceof Error ? e.message : String(e)}`);
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!destino) return;
    setSalvando(true);
    try {
      await excluirDestino(destino.id);
      onSalvo(`✓ Destino excluído: ${destino.nome}`);
    } catch (e) {
      setErro(`✕ ${e instanceof Error ? e.message : String(e)}`);
      setSalvando(false);
    }
  }

  return (
    <dialog ref={dialogo} className="dialogo" aria-labelledby="dest-titulo" onClose={onFechar}>
      <form className="flex max-h-[calc(100dvh-26px)] flex-col" onSubmit={salvar} noValidate>
        <div className="dialogo-cab">
          <span className="eyebrow">{destino ? "Destino" : "Novo destino"}</span>
          <h2 className="titulo-card mt-[2px]" id="dest-titulo">
            {destino ? "Editar destino" : "Cadastrar destino"}
          </h2>
        </div>
        <div className="dialogo-corpo">
          <div>
            <label className="field-label" htmlFor="d-nome">
              Nome
            </label>
            <input id="d-nome" className="input" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            <p className="mt-[6px] text-[13px] text-ink-soft">Só você vê este nome. Ele nunca vai no e-mail nem na chamada ao destino.</p>
          </div>

          <fieldset>
            <legend className="field-label">Entrega</legend>
            <div className="grid gap-[6px]">
              {(
                [
                  ["email", "E-mail", "Sai da caixa de entrada, sem cópia em Enviados, com o assunto Novo contato."],
                  ["porta", "Porta de entrada", "Uma chamada POST por lead, pela especificação da porta de entrada."],
                ] as const
              ).map(([v, titulo, ajuda]) => (
                <label key={v} className="flex cursor-pointer items-start gap-[10px] rounded-sm border border-control px-3 py-[9px]">
                  <input type="radio" name="d-modo" className="checkbox mt-[2px]" checked={modo === v} onChange={() => setModo(v)} />
                  <span>
                    <span className="font-semibold">{titulo}</span>
                    <span className="block text-[13px] text-ink-soft">{ajuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Endereço</legend>
            {temEndereco && (
              <p className="mb-2 text-[13px] text-ink-soft">
                Guardado no cofre: <span className="num text-ink">{enderecoTxt(destino!)}</span>. Preencha só para trocar.
              </p>
            )}
            {trocouModo && destino?.endereco && <p className="mb-2 text-[13px] font-semibold text-wa">! Trocar a entrega apaga o endereço guardado. Digite o novo.</p>}
            {modo === "email" ? (
              <>
                <label className="field-label" htmlFor="d-email">
                  E-mail de entrega
                </label>
                <input id="d-email" className="input" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
              </>
            ) : (
              <div className="grid gap-3">
                <div>
                  <label className="field-label" htmlFor="d-url">
                    Endereço da porta (https://)
                  </label>
                  <input id="d-url" className="input" type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="d-chave">
                    Chave
                  </label>
                  <input id="d-chave" className="input" type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} />
                  <p className="mt-[6px] text-[13px] text-ink-soft">A chave nunca volta para a tela. Vazia, fica a que já está guardada.</p>
                </div>
              </div>
            )}
          </fieldset>

          <div>
            <label className="field-label" htmlFor="d-limite">
              Limite por dia
            </label>
            <input id="d-limite" className="input num w-[140px]" type="number" min={1} step={1} inputMode="numeric" placeholder="Sem limite" value={limite} onChange={(e) => setLimite(e.target.value)} />
            <p className="mt-[6px] text-[13px] text-ink-soft">Passou do limite, o resto do dia vai para o Base360 Vendas. Vazio, sem limite.</p>
          </div>

          <div>
            <Chip marcado={registrar} onChange={() => setRegistrar((v) => !v)} texto="Registrar os envios" />
            <p className="mt-[6px] text-[13px] text-ink-soft">
              {registrar
                ? "✓ Cada lead enviado entra na base de contatos do Marketing, com o envio no histórico."
                : "– Nada fica registrado: nem contato, nem evento."}
            </p>
          </div>
          <Chip marcado={ativo} onChange={() => setAtivo((v) => !v)} texto="Destino ligado" />

          {erro && (
            <p ref={alerta} className="aviso-erro" role="alert">
              {erro}
            </p>
          )}
        </div>
        <div className="dialogo-rod">
          {destino &&
            (usado ? (
              <p className="mr-auto basis-full text-[13px] text-ink-soft sm:basis-auto">Está em uma regra: tire de lá para excluir.</p>
            ) : confirmarExclusao ? (
              <button type="button" className="btn btn-ghost focus-ring mr-auto basis-full sm:basis-auto" onClick={excluir} disabled={salvando}>
                ✕ Excluir de vez
              </button>
            ) : (
              <button type="button" className="link-texto focus-ring mr-auto min-h-[44px] basis-full text-left text-[13px] sm:min-h-0 sm:basis-auto" onClick={() => setConfirmarExclusao(true)}>
                Excluir destino
              </button>
            ))}
          <button type="button" className="btn btn-ghost focus-ring flex-1 sm:flex-none" onClick={() => dialogo.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-red focus-ring flex-1 sm:flex-none" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar destino"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
