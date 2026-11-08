"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/alicerce/aviso";
import { Campo, CampoEmGrupo } from "@/components/alicerce/campo";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { excluirDestino, salvarDestino, salvarEndereco } from "@/lib/direcionador-dados";
import { enderecoTxt, type DestinoTela } from "@/lib/telas";

const semSinal = (t: string) => t.replace(/^✕\s*/, "");

/**
 * Criar ou editar um destino externo no PainelLateral (guia PainelLateral): nome, entrega, endereço, limite por
 * dia, Registrar os envios e ligado. O endereço vai para o cofre (Vault) e volta mascarado; o campo fica vazio e
 * só troca o guardado quando é preenchido. Entrega e as caixas ligar/desligar são do formulário (só valem ao
 * salvar), então usam Marcador, não Interruptor (guia Interruptor, "Interruptor ou caixa de marcar?").
 */
export function EditorDestino({
  aberto,
  destino,
  usado,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  destino: DestinoTela | null;
  /** Está em alguma regra: não dá para excluir. */
  usado: boolean;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
}) {
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
  const alerta = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (erro) alerta.current?.scrollIntoView({ block: "nearest" });
  }, [erro]);

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
      onSalvo(destino ? "Destino salvo." : "Destino criado. Use-o numa regra para começar a receber leads.");
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
      onSalvo(`Destino excluído: ${destino.nome}.`);
    } catch (e) {
      setErro(`✕ ${e instanceof Error ? e.message : String(e)}`);
      setSalvando(false);
    }
  }

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo={destino ? "Editar destino" : "Cadastrar destino"}
      descricao={destino ? destino.nome : "Novo destino"}
      rodape={
        <div className="mb-lateral__rodape">
          {destino &&
            (usado ? (
              <span className="mkt-nota mkt-rodape-esquerda">Está em uma regra: tire de lá para excluir.</span>
            ) : confirmarExclusao ? (
              <button type="button" className="mb-botao mb-botao--perigo mkt-rodape-esquerda" onClick={excluir} disabled={salvando}>
                Excluir de vez
              </button>
            ) : (
              <button type="button" className="mb-botao mb-botao--discreto mkt-rodape-esquerda" onClick={() => setConfirmarExclusao(true)}>
                Excluir destino
              </button>
            ))}
          <button type="button" className="mb-botao mb-botao--secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" form="form-destino" className="mb-botao mb-botao--primario" aria-busy={salvando || undefined} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar destino"}
          </button>
        </div>
      }
    >
      <div className="mb-lateral__corpo">
        <form id="form-destino" className="mkt-form" onSubmit={salvar} noValidate>
          <Campo rotulo="Nome" ajuda="Só você vê este nome. Ele nunca vai no e-mail nem na chamada ao destino.">
            <input className="mb-campo__entrada" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <fieldset className="mkt-grupo">
            <legend className="mb-campo__rotulo">Entrega</legend>
            {(
              [
                ["email", "E-mail", "Sai da caixa de entrada, sem cópia em Enviados, com o assunto Novo contato."],
                ["porta", "Porta de entrada", "Uma chamada POST por lead, pela especificação da porta de entrada."],
              ] as const
            ).map(([v, titulo, ajuda]) => (
              <label key={v} className="mb-marcador">
                <input type="radio" name="d-modo" checked={modo === v} onChange={() => setModo(v)} />
                <span>
                  {titulo}
                  <span className="mb-marcador__detalhe">{ajuda}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <CampoEmGrupo id="d-endereco" rotulo="Endereço">
            {temEndereco && (
              <span className="mkt-nota">
                Guardado no cofre: <span className="mkt-num">{enderecoTxt(destino!)}</span>. Preencha só para trocar.
              </span>
            )}
            {trocouModo && destino?.endereco && <Aviso tom="alerta" titulo="Trocar a entrega apaga o endereço guardado" texto="Digite o novo." />}
            {modo === "email" ? (
              <Campo rotulo="E-mail de entrega">
                <input className="mb-campo__entrada" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>
            ) : (
              <>
                <Campo rotulo="Endereço da porta (https://)">
                  <input className="mb-campo__entrada" type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
                </Campo>
                <Campo rotulo="Chave" ajuda="A chave nunca volta para a tela. Vazia, fica a que já está guardada.">
                  <input className="mb-campo__entrada" type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} />
                </Campo>
              </>
            )}
          </CampoEmGrupo>

          <Campo rotulo="Limite por dia" opcional="vazio, sem limite" ajuda="Passou do limite, o resto do dia vai para o Base360 Vendas.">
            <input className="mb-campo__entrada mkt-curto" type="number" min={1} step={1} inputMode="numeric" placeholder="Sem limite" value={limite} onChange={(e) => setLimite(e.target.value)} />
          </Campo>

          <fieldset className="mkt-grupo">
            <legend className="mb-campo__rotulo">Registro e estado</legend>
            <label className="mb-marcador">
              <input type="checkbox" checked={registrar} onChange={() => setRegistrar((v) => !v)} />
              <span>
                Registrar os envios
                <span className="mb-marcador__detalhe">
                  {registrar ? "Cada lead enviado entra na base de contatos do Marketing, com o envio no histórico." : "Nada fica registrado: nem contato, nem evento."}
                </span>
              </span>
            </label>
            <label className="mb-marcador">
              <input type="checkbox" checked={ativo} onChange={() => setAtivo((v) => !v)} />
              Destino ligado
            </label>
          </fieldset>

          {erro && (
            <div ref={alerta}>
              <Aviso tom="erro" titulo={semSinal(erro)} />
            </div>
          )}
        </form>
      </div>
    </PainelLateral>
  );
}
