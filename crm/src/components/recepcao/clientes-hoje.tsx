"use client";
import { useState } from "react";
import clsx from "clsx";
import { useCatalogo } from "@/lib/catalogo-dados";
import { BuscaComSugestoes } from "@/components/alicerce/busca-com-sugestoes";
import { normalizarWhatsapp } from "@/lib/leads";
import { horaCheia, nomeTipo, type ClienteHoje, type Midia } from "@/lib/recepcao";
import { corrigirCliente } from "@/lib/recepcao-dados";
import { Tabela } from "@/components/alicerce/tabela";
import { Cartao } from "@/components/alicerce/cartao";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Aviso } from "@/components/alicerce/aviso";

/** Uma tabela de registros; o CSS do Alicerce vira cards no celular. */
export function ClientesDeHoje({ clientes, midias, standNome, onMudou }: { clientes: ClienteHoje[]; midias: Midia[]; standNome: string; tela: "pc" | "celular"; onMudou: () => void }) {
  const [editando, setEditando] = useState<string | null>(null);
  const selecionado = clientes.find(c => c.id === editando);
  const ativos = clientes.filter(c => c.status === "ativo").length;
  const atendeu = (c: ClienteHoje) => c.parceiro ? "Parceiro " + c.parceiro : c.anunciado && c.anunciado !== c.corretor ? c.anunciado + " · indicou " + c.corretor : c.corretor ?? "–";
  return <Cartao id="t-clientes" titulo="Clientes de hoje" descricao={standNome + " · " + ativos + (ativos === 1 ? " cliente" : " clientes")}>
    {!clientes.length ? <EstadoVazio titulo="Nenhum cliente registrado hoje" texto="O primeiro atendimento aparece aqui." /> : <Tabela tipo="registros"><thead><tr>{["Cliente", "Tipo e hora", "Atendeu", "Especialista", "Como conheceu"].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{clientes.map(c => <tr key={c.id}>
      <td><span>{c.status === "ativo" ? <button className="mb-tabela__alvo" onClick={() => setEditando(c.id)}>{c.cliente_nome}</button> : <strong>{c.cliente_nome}</strong>}<small className="mb-tabela__secundario">{[c.final_telefone ? "final " + c.final_telefone : "Sem telefone", c.veio_sozinho ? "Veio sozinho" : "Com " + c.acompanhante].join(" · ")}</small>{c.status === "cancelado" && <small className="mb-tabela__secundario">Desfeito</small>}</span></td>
      <td data-rotulo="Tipo e hora"><span>{nomeTipo(c.tipo)} · {horaCheia(c.registrado_em)}{c.antes_da_vez ? " · Antes da vez" : ""}</span></td>
      <td data-rotulo="Atendeu"><span>{atendeu(c)}{c.parceiro && c.gerente && <small className="mb-tabela__secundario">Gerente {c.gerente}</small>}{c.encontrado_na_carteira != null && <small className="mb-tabela__secundario">{c.encontrado_na_carteira ? "Já estava na carteira" : "Lead criado"}</small>}</span></td>
      <td data-rotulo="Especialista"><span>{c.especialista ?? "–"}</span></td>
      <td data-rotulo="Como conheceu"><span>{c.midias.map(slug => midias.find(m => m.slug === slug)?.nome ?? slug).join(", ") || "–"}</span></td>
    </tr>)}</tbody></Tabela>}
    <p className="mb-campo__ajuda">Abra o cliente para corrigir. Até 30 min, sem motivo; depois, informe o motivo. Para trocar o tipo ou quem atendeu, use Desfazer e registre de novo. Dias anteriores só pela busca do Retorno.</p>
    {selecionado && <Corrigir key={selecionado.id} cliente={selecionado} midias={midias} onFechar={() => setEditando(null)} onSalvo={onMudou} />}
  </Cartao>;
}

function Corrigir({ cliente, midias, onFechar, onSalvo }: { cliente: ClienteHoje; midias: Midia[]; onFechar: () => void; onSalvo: () => void }) {
  const { catalogo } = useCatalogo();
  const [marcadas, setMarcadas] = useState<string[]>(cliente.midias);
  const [nome, setNome] = useState(cliente.cliente_nome);
  const [telefone, setTelefone] = useState("");
  const [sozinho, setSozinho] = useState(cliente.veio_sozinho);
  const [acompanhante, setAcompanhante] = useState(cliente.acompanhante ?? "");
  const [empreendimento, setEmpreendimento] = useState(cliente.empreendimento ?? "");
  const [observacao, setObservacao] = useState(cliente.observacao ?? "");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pedeMotivo = !cliente.pode_corrigir_sem_motivo;
  const inp = "mb-campo__entrada";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const numero = telefone.trim() ? normalizarWhatsapp(telefone) : null;
    if (telefone.trim() && !numero) return setErro("Confira o telefone.");
    if (!sozinho && !acompanhante.trim()) return setErro("Digite o nome do acompanhante ou marque Veio sozinho.");
    if (pedeMotivo && !motivo.trim()) return setErro("Escreva o motivo da correção.");
    setSalvando(true);
    const r = await corrigirCliente(
      cliente.id,
      {
        midias: marcadas,
        nome: nome.trim(),
        ...(numero ? { whatsapp: numero } : {}),
        veio_sozinho: sozinho,
        acompanhante: sozinho ? null : acompanhante.trim(),
        empreendimento: empreendimento.trim(),
        observacao: observacao.trim(),
      },
      motivo.trim() || null,
    );
    setSalvando(false);
    if (r.erro !== undefined) return setErro(r.erro);
    onFechar();
    onSalvo();
  }

  return (
    <PainelLateral aberto onFechar={onFechar} titulo="Corrigir atendimento" descricao={cliente.cliente_nome}><form className="stand-painel-form" onSubmit={salvar} noValidate><div className="mb-lateral__corpo stand-pilha">

      <div className="mb-opcoes mb-opcoes--linha">
        {midias
          .filter((m) => m.ativo || marcadas.includes(m.slug))
          .map((m) => (
            <button
              key={m.slug}
              type="button"
              aria-pressed={marcadas.includes(m.slug)}
              className="mb-opcao"
              onClick={() => setMarcadas((x) => (x.includes(m.slug) ? x.filter((y) => y !== m.slug) : [...x, m.slug]))}
            >
              {marcadas.includes(m.slug) ? "✓ " : ""}
              {m.nome}
            </button>
          ))}
      </div>
      <div className="stand-pilha">
        <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor={`k-nome-${cliente.id}`}>Cliente</label>
          <input id={`k-nome-${cliente.id}`} className={inp} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor={`k-tel-${cliente.id}`}>
            Telefone{cliente.final_telefone ? ` · hoje final ${cliente.final_telefone}` : ""}
          </label>
          <input
            id={`k-tel-${cliente.id}`}
            className={clsx(inp, "stand-num")}
            type="tel"
            inputMode="tel"
            placeholder="Só se for trocar"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
        <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor={`k-acomp-${cliente.id}`}>Acompanhante</label>
          <div className="flex gap-2">
            <input
              id={`k-acomp-${cliente.id}`}
              className={inp}
              disabled={sozinho}
              value={sozinho ? "" : acompanhante}
              onChange={(e) => setAcompanhante(e.target.value)}
            />
            <button
              type="button"
              aria-pressed={sozinho}
              className="mb-opcao"
              onClick={() => setSozinho((s) => !s)}
            >
              Sozinho
            </button>
          </div>
        </div>
        <BuscaComSugestoes rotulo="Empreendimento" idEntrada={`k-emp-${cliente.id}`} valor={empreendimento} onChange={setEmpreendimento} opcoes={(catalogo ?? []).filter(e => e.ativo !== false).map(e => ({ valor: e.nome }))} ajuda="Pode escrever o nome se não estiver no catálogo." />
        <div className="md:col-span-2">
          <label className="mb-campo__rotulo" htmlFor={`k-obs-${cliente.id}`}>Observação</label>
          <input id={`k-obs-${cliente.id}`} className={inp} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>
      {pedeMotivo && (
        <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor={`k-mot-${cliente.id}`}>Motivo da correção · passou de 30 min</label>
          <input id={`k-mot-${cliente.id}`} className={inp} maxLength={280} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
      )}
      {erro && <Aviso tom="erro" titulo={erro} />}
      </div><div className="mb-lateral__rodape">
        <button type="button" className="mb-botao mb-botao--discreto" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar correção"}
        </button>
      </div>
    </form></PainelLateral>
  );
}
