"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { db, novoId } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";

import { chaveRascunhoNovaVenda, chaveRascunhoVenda, lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import { diaIso, formatarDia, formatarReais, imovelDaVenda, lerReais, type Venda } from "@/lib/vendas";
import { corrigirVenda, marcarPaga, registrarVenda } from "@/lib/vendas-dados";

import { Aviso } from "@/components/alicerce/aviso";
import { Pares } from "@/components/alicerce/pares";
import { useToast } from "@/components/alicerce/toast";
import { CorrigirAlicerce, MotivoAlicerce, PagarAlicerce, RegistrarVendaAlicerce, SeloDaVenda } from "./venda-alicerce";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { CampoSelecao } from "@/components/alicerce/campo";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";

const reaisParaCampo = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Registrar a venda pela ficha. O banco leva o lead para a etapa Venda e grava o
 * histórico. A venda conta no mês da assinatura; só a paga entra no VGV válido.
 */
export function RegistrarVenda({
  lead,
  onRegistrada,
  onCancelar,

  painel = false,
  antes,
}: {
  lead: { id: string; nome?: string; empreendimento: string | null; valor: number | null };
  onRegistrada: () => void;
  onCancelar: () => void;
  painel?: boolean;
  antes?: React.ReactNode;
}) {
  const hoje = diaIso(new Date());
  const [f, setF] = useState({
    empreendimento: lead.empreendimento ?? "",
    unidade: "",
    vgv: lead.valor ? reaisParaCampo(Number(lead.valor)) : "",
    assinada_em: hoje,
    paga: false,
    pago_em: hoje,
    observacao: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editado, setEditado] = useState(false);
  const restauradoRef = useRef(false);

  useEffect(() => {
    const r = lerRascunho<typeof f>(chaveRascunhoVenda(lead.id));
    if (r) {
      setF((anterior) => ({ ...anterior, ...r }));
      setEditado(true);
    }
    restauradoRef.current = true;
  }, [lead.id]);

  useEffect(() => {
    if (!restauradoRef.current || !editado) return;
    salvarRascunho(chaveRascunhoVenda(lead.id), f);
  }, [lead.id, f, editado]);

  // Um id por formulário aberto: o reenvio (resposta perdida) não registra a venda duas vezes.
  const [idVenda] = useState(novoId);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const vgv = lerReais(f.vgv);
    if (!f.empreendimento.trim()) return setErro("Escolha o empreendimento.");
    if (!vgv) return setErro("Confira o VGV: só números, como 480.000.");
    if (!f.assinada_em || f.assinada_em > hoje) return setErro("Confira a data da assinatura: até hoje.");
    if (f.paga && (!f.pago_em || f.pago_em > hoje)) return setErro("Confira a data do pagamento: até hoje.");
    setErro(null);
    setSalvando(true);
    const r = await registrarVenda(idVenda, {
      lead_id: lead.id,
      empreendimento: f.empreendimento.trim(),
      unidade: f.unidade.trim() || null,
      vgv,
      assinada_em: f.assinada_em,
      pagamento: f.paga ? "pago" : "pendente",
      pago_em: f.paga ? f.pago_em : null,
      observacao: f.observacao.trim() || null,
    });
    setSalvando(false);
    if (r) return setErro(r);
    limparRascunho(chaveRascunhoVenda(lead.id));
    setEditado(false);
    onRegistrada();
  }

  const cancelar = () => {
    // Cancelar descarta o rascunho: senão a ficha reabriria o formulário na próxima visita.
    limparRascunho(chaveRascunhoVenda(lead.id));
    onCancelar();
  };
  return (
      <RegistrarVendaAlicerce
        painel={painel}
        antes={antes}
        nome={lead.nome}
        f={f}
        setF={setF}
        setEditado={setEditado}
        erro={erro}
        salvando={salvando}
        hoje={hoje}
        onSubmit={salvar}
        onCancelar={cancelar}
      />
    );
}

type Painel = null | "pagar" | "corrigir" | "cancelar";

/**
 * Card da venda: imóvel, VGV, assinatura e pagamento. O corretor marca como
 * paga. Quem corrige a equipe (vendas.corrigir_equipe) corrige, cancela e
 * reativa, sempre com o motivo.
 */
export function CardVenda({
  venda: v,
  lead,
  corretor,
  onMudou,
}: {
  venda: Venda;
  /** Fora da ficha, o nome do cliente com o link. */
  lead?: { id: string; nome: string } | null;
  corretor?: string;
  onMudou: () => void;
}) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const toast = useToast();
  const [painel, setPainel] = useState<Painel>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => setPainel(null), [v]);

  const corrige = pode("vendas.corrigir_equipe");
  const paga = (v.corretor_id === eu.id && pode("leads.cadastrar")) || corrige;
  const ativa = v.status === "ativa";
  const quem = lead?.nome ? `${lead.nome}, ${imovelDaVenda(v)}` : imovelDaVenda(v);

  async function depois(e: string | null, aviso: string) {
    setErro(e);
    if (e) return;
    // No Alicerce o que deu certo sai em Toast.
    toast.mostrar(aviso, { tipo: "sucesso" });
    setPainel(null);
    onMudou();
  }

  return (
      <li className="mb-cartao">
        <div className="mb-cartao__corpo ficha__corpo">
          <div className="mb-lead__cabeca">
            <p className="ficha__valor mb-valor">{formatarReais(Number(v.vgv))}</p>
            <SeloDaVenda venda={v} />
          </div>
          {lead && (
            <Link href={`/leads/ficha/?id=${lead.id}`} className="mb-link">
              {lead.nome}
            </Link>
          )}
          <Pares
            itens={[
              { rotulo: "Imóvel", valor: imovelDaVenda(v) },
              { rotulo: "Assinada em", valor: formatarDia(v.assinada_em) },
              ...(corretor ? [{ rotulo: "Corretor", valor: corretor }] : []),
              ...(v.status === "cancelada" && v.motivo_cancelamento ? [{ rotulo: "Cancelamento", valor: v.motivo_cancelamento }] : []),
            ]}
          />
          {v.observacao && <p className="ficha__quebra">{v.observacao}</p>}
          {erro && <Aviso tom="erro" titulo={erro} />}
          {painel === "pagar" && (
            <PagarAlicerce
              onCancelar={() => setPainel(null)}
              onSalvar={async (data) => depois(await marcarPaga(v.id, data), `Venda paga em ${formatarDia(data)}.`)}
            />
          )}
          {painel === "corrigir" && (
            <CorrigirAlicerce
              venda={v}
              onCancelar={() => setPainel(null)}
              onSalvar={async (campos, motivo) => depois(await corrigirVenda(v.id, campos, motivo), "Venda corrigida.")}
            />
          )}
          {painel === "cancelar" && (
            <MotivoAlicerce
              titulo={ativa ? "Cancelar a venda" : "Reativar a venda"}
              texto={
                ativa
                  ? "A venda fica guardada como cancelada e sai das contas. Se for a única do lead, ele volta para Proposta."
                  : "A venda volta a contar e o lead vai para Venda."
              }
              botao={ativa ? "✕ Cancelar venda" : "Reativar venda"}
              onCancelar={() => setPainel(null)}
              onSalvar={async (motivo) =>
                depois(
                  await corrigirVenda(v.id, { status: ativa ? "cancelada" : "ativa" }, motivo),
                  ativa ? "Venda cancelada." : "Venda reativada.",
                )
              }
            />
          )}
        </div>
        {(corrige || (ativa && v.pagamento === "pendente" && paga)) && !painel && (
          <footer className="mb-cartao__rodape">
            {corrige && (
              <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => setPainel("cancelar")}>
                {ativa ? "Cancelar venda" : "Reativar venda"}
              </button>
            )}
            {corrige && ativa && (
              <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => setPainel("corrigir")}>
                Corrigir
              </button>
            )}
            {ativa && v.pagamento === "pendente" && paga && (
              <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" aria-label={`Marcar como paga: ${quem}`} onClick={() => setPainel("pagar")}>
                ✓ Marcar como paga
              </button>
            )}
          </footer>
        )}
      </li>
    );
}

/**
 * "Registrar venda" na página de vendas, como na Bruna. Aqui a venda é sempre de
 * um lead (o histórico e o funil dependem dele): o corretor escolhe o cliente
 * entre os próprios leads ativos e o registro vem preenchido pelo lead.
 */
type LeadParaVenda = { id: string; nome: string; empreendimento: string | null; valor: number | null };

export function NovaVenda({ corretor, onRegistrada }: { corretor: string; onRegistrada: () => void; }) {
  const origem = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [leads, setLeads] = useState<LeadParaVenda[] | null>(null);
  const [escolhido, setEscolhido] = useState("");
  const restauradoRef = useRef(false);

  useEffect(() => {
    const r = lerRascunho<{ aberto?: boolean; leadId?: string }>(chaveRascunhoNovaVenda(corretor));
    if (r) {
      if (r.aberto) setAberto(true);
      if (r.leadId) setEscolhido(r.leadId);
    }
    restauradoRef.current = true;
  }, [corretor]);

  useEffect(() => {
    if (!restauradoRef.current) return;
    if (aberto) {
      salvarRascunho(chaveRascunhoNovaVenda(corretor), { aberto: true, leadId: escolhido });
    } else {
      limparRascunho(chaveRascunhoNovaVenda(corretor));
    }
  }, [corretor, aberto, escolhido]);

  useEffect(() => {
    if (!aberto || leads) return;
    db()
      .from("leads")
      .select("id, nome, empreendimento, valor")
      .eq("dono_id", corretor)
      .eq("status", "ativo")
      .neq("etapa", "venda")
      .order("nome")
      .then(({ data }) => setLeads((data ?? []) as LeadParaVenda[]));
  }, [aberto, leads, corretor]);
  const lead = leads?.find((l) => l.id === escolhido);

  // Bloco 2: mesma seleção, consulta, rascunho e gravação; a tarefa longa abre em PainelLateral.

  const fechar = () => {
    if (escolhido) limparRascunho(chaveRascunhoVenda(escolhido));
    limparRascunho(chaveRascunhoNovaVenda(corretor));
    setAberto(false);
  };
  const cliente = <CampoSelecao rotulo="Cliente" ajuda="Seus leads ativos que ainda não estão em Venda.">
    <select id="nova-venda-lead" className="mb-campo__entrada" value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
      <option value="">Escolha o lead</option>
      {leads?.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
    </select>
  </CampoSelecao>;
  return <>
    <button ref={origem} type="button" className="mb-botao mb-botao--primario" aria-haspopup="dialog" onClick={() => setAberto(true)}>Registrar venda</button>
    <PainelLateral aberto={aberto} onFechar={fechar} foco={() => origem.current} titulo="Registrar venda" descricao={lead?.nome}>
      {aberto && (lead ? <RegistrarVenda key={lead.id} lead={lead} painel antes={cliente} onCancelar={fechar} onRegistrada={() => {
        limparRascunho(chaveRascunhoNovaVenda(corretor)); setAberto(false); setEscolhido(""); setLeads(null);
        toast.mostrar("Venda registrada.", { tipo: "sucesso" }); onRegistrada();
      }} /> : <div className="mb-lateral__corpo">{!leads ? <CarregandoTabela texto="Carregando seus leads…" /> : !leads.length ? <EstadoVazio titulo="Nenhum lead para registrar a venda" texto="Seus leads ativos que ainda não estão em Venda aparecem aqui." /> : cliente}</div>)}
    </PainelLateral>
  </>;
}
