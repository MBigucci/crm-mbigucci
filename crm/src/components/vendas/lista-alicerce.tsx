"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabela } from "@/components/alicerce/tabela";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Pares } from "@/components/alicerce/pares";
import { CampoSelecao } from "@/components/alicerce/campo";
import { useToast } from "@/components/alicerce/toast";
import { usePerfil, useSessao } from "@/lib/sessao";
import { corrigirVenda, marcarPaga, type VendaComLead } from "@/lib/vendas-dados";
import { formatarReais, formatarDia, imovelDaVenda, type Totais } from "@/lib/vendas";
import { CorrigirAlicerce, MotivoAlicerce, PagarAlicerce, SeloDaVenda } from "./venda-alicerce";
import { CancelarVenda } from "./cancelar-venda";

/** Indicador.md:3-11: os mesmos três totais calculados por somarVendas, sem novas consultas. */
export function ResumoVendasAlicerce({ t }: { t: Totais }) {
  const blocos = [
    { rotulo: "Assinado e pago", valor: t.vgvValido, quantidade: t.pagas },
    { rotulo: "Assinado, com pendentes", valor: t.vgvAssinado, quantidade: t.assinadas },
    { rotulo: "Pagamento pendente", valor: t.vgvAssinado - t.vgvValido, quantidade: t.assinadas - t.pagas },
  ];
  return <section className="mb-indicadores" aria-label="Totais do período">{blocos.map((b) => <div className="mb-indicador" key={b.rotulo}>
    <div className="mb-indicador__cabecalho"><span className="mb-indicador__rotulo">{b.rotulo}</span></div>
    <p className="mb-indicador__valor">{formatarReais(b.valor)}</p>
    <span className="mb-indicador__meta">{b.quantidade} {b.quantidade === 1 ? "venda" : "vendas"}</span>
  </div>)}</section>;
}

type Ordem = "cliente" | "vgv" | "assinada";
type Acao = "detalhe" | "corrigir" | "pagar" | "reativar";

/** TabelaCompleta.md:5-29: a mesma tabela vira cards no celular; a linha abre o registro no painel. */
export function TabelaDeVendas({ vendas, veOutros, nomes, recarregar, ordem, sentido, onOrdenar, canceladas = false }: { vendas: VendaComLead[]; veOutros: boolean; nomes: Map<string, string>; recarregar: () => void; ordem: Ordem; sentido: "asc" | "desc"; onOrdenar: (coluna: Ordem, direcao?: "asc" | "desc") => void; canceladas?: boolean }) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const toast = useToast();
  const [selecao, setSelecao] = useState<{ venda: VendaComLead; origem: HTMLElement } | null>(null);
  const [acao, setAcao] = useState<Acao>("detalhe");
  const [cancelando, setCancelando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const origemDoRegistro = useRef<HTMLElement | null>(null);
  const origemDoDialogo = useRef<HTMLButtonElement>(null);
  // O cabeçalho da tabela vira texto só para leitor de tela no celular. A ordenação tem um Campo visível.
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const atualizar = () => setCelular(media.matches);
    atualizar(); media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);
  const corrige = pode("vendas.corrigir_equipe");
  const v = selecao?.venda;
  const paga = !!v && ((v.corretor_id === eu.id && pode("leads.cadastrar")) || corrige);
  const linhas = useMemo(() => [...vendas].sort((a, b) => {
    const delta = ordem === "vgv" ? Number(a.vgv) - Number(b.vgv) : ordem === "cliente" ? (a.lead?.nome ?? "").localeCompare(b.lead?.nome ?? "", "pt-BR") : a.assinada_em.localeCompare(b.assinada_em);
    return (sentido === "asc" ? 1 : -1) * delta;
  }), [vendas, ordem, sentido]);
  const fechar = () => { setSelecao(null); setErro(null); };
  const manterVenda = () => {
    setCancelando(false);
    // Depois das duas pinturas usadas pelo PainelLateral para reabrir, devolve à ação que abriu o diálogo.
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => origemDoDialogo.current?.focus())));
  };
  const voltar = () => { setAcao("detalhe"); setErro(null); };
  async function executar(gravar: () => Promise<string | null>, texto: string) {
    if (ocupado) return;
    setOcupado(true); setErro(null);
    try {
      const falha = await gravar();
      if (falha) return setErro(falha);
      fechar(); toast.mostrar(texto, { tipo: "sucesso" }); recarregar();
    } catch { setErro("Não foi salvo. Tente de novo. O que você digitou continua aqui."); }
    finally { setOcupado(false); }
  }
  const cabecalho = (chave: Ordem, texto: string, numero = false) => <th scope="col" className={numero ? "mb-tabela__num" : undefined} aria-sort={ordem === chave ? sentido === "asc" ? "ascending" : "descending" : "none"}><button type="button" className="mb-tabela__ordenar" tabIndex={celular ? -1 : undefined} onClick={() => onOrdenar(chave)}>{texto}</button></th>;
  return <>
    <div className="mb-so-celular"><CampoSelecao rotulo={canceladas ? "Ordenar canceladas por" : "Ordenar por"}><select className="mb-campo__entrada" value={`${ordem}:${sentido}`} onChange={(e) => { const [chave, direcao] = e.target.value.split(":"); onOrdenar(chave as Ordem, direcao as "asc" | "desc"); }}>
      <option value="assinada:desc">Assinaturas mais recentes</option><option value="assinada:asc">Assinaturas mais antigas</option><option value="cliente:asc">Cliente, de A a Z</option><option value="cliente:desc">Cliente, de Z a A</option><option value="vgv:desc">Maior VGV primeiro</option><option value="vgv:asc">Menor VGV primeiro</option>
    </select></CampoSelecao></div>
    <Tabela tipo="registros" rotulo={canceladas ? "Vendas canceladas" : "Vendas assinadas"}>
      <thead><tr>{cabecalho("cliente", "Cliente")}<th scope="col">Imóvel</th>{veOutros && <th scope="col">Corretor</th>}{cabecalho("vgv", "VGV", true)}{cabecalho("assinada", "Assinatura", true)}<th scope="col">Situação</th></tr></thead>
      <tbody>{linhas.map((venda) => <tr key={venda.id} aria-selected={v?.id === venda.id}>
        <td><button type="button" className="mb-tabela__alvo" aria-haspopup="dialog" onClick={(e) => { origemDoRegistro.current = e.currentTarget; setSelecao({ venda, origem: e.currentTarget }); setAcao("detalhe"); setErro(null); }}>{venda.lead?.nome || "Cliente não disponível"}</button></td>
        <td data-rotulo="Imóvel">{imovelDaVenda(venda)}</td>
        {veOutros && <td data-rotulo="Corretor">{nomes.get(venda.corretor_id) ?? "Corretor"}</td>}
        <td data-rotulo="VGV" className="mb-tabela__num">{formatarReais(Number(venda.vgv))}</td>
        <td data-rotulo="Assinatura" className="mb-tabela__num">{formatarDia(venda.assinada_em)}</td>
        <td data-rotulo="Situação"><SeloDaVenda venda={venda} /></td>
      </tr>)}</tbody>
      {!canceladas && <tfoot><tr><td colSpan={veOutros ? 3 : 2}>Total assinado</td><td className="mb-tabela__num">{formatarReais(vendas.reduce((s, venda) => s + Number(venda.vgv), 0))}</td><td colSpan={2} /></tr></tfoot>}
    </Tabela>
    <div className="mb-tabela-rodape">{vendas.length} {vendas.length === 1 ? "venda" : "vendas"}{canceladas ? " canceladas" : " assinadas"}</div>
    <PainelLateral aberto={!!v && !cancelando} onFechar={fechar} foco={() => origemDoRegistro.current} titulo={acao === "corrigir" ? "Corrigir venda" : acao === "pagar" ? "Marcar como paga" : acao === "reativar" ? "Reativar venda" : "Venda"} descricao={v ? `${v.lead?.nome || "Cliente não disponível"} · ${imovelDaVenda(v)}` : undefined}>
      {v && acao === "detalhe" && <div className="mb-lateral__corpo vendas-detalhe">
        <SeloDaVenda venda={v} />
        <Pares itens={[
          { rotulo: "Cliente", valor: v.lead ? <Link href={`/leads/ficha/?id=${v.lead.id}`}>{v.lead.nome}</Link> : "Não disponível" },
          { rotulo: "Imóvel", valor: imovelDaVenda(v) },
          { rotulo: "VGV", valor: formatarReais(Number(v.vgv)) },
          { rotulo: "Assinatura", valor: formatarDia(v.assinada_em) },
          ...(veOutros ? [{ rotulo: "Corretor", valor: nomes.get(v.corretor_id) ?? "Corretor" }] : []),
          ...(v.pago_em ? [{ rotulo: "Pagamento", valor: formatarDia(v.pago_em) }] : []),
          ...(v.motivo_cancelamento ? [{ rotulo: "Cancelamento", valor: v.motivo_cancelamento }] : []),
        ]} />
        {v.observacao && <p className="ficha__quebra">{v.observacao}</p>}
        <div className="mb-grupo-botoes">
          {corrige && <button ref={origemDoDialogo} className="mb-botao mb-botao--discreto" type="button" onClick={() => v.status === "ativa" ? setCancelando(true) : setAcao("reativar")}>{v.status === "ativa" ? "Cancelar venda" : "Reativar venda"}</button>}
          {corrige && v.status === "ativa" && <button className="mb-botao mb-botao--secundario" type="button" onClick={() => setAcao("corrigir")}>Corrigir venda</button>}
          {paga && v.status === "ativa" && v.pagamento === "pendente" && <button className="mb-botao mb-botao--primario" type="button" onClick={() => setAcao("pagar")}>Marcar como paga</button>}
        </div>
      </div>}
      {v && acao === "corrigir" && <CorrigirAlicerce painel ocupado={ocupado} falha={erro} venda={v} onCancelar={voltar} onSalvar={(campos, motivo) => executar(() => corrigirVenda(v.id, campos, motivo), "Venda corrigida.")} />}
      {v && acao === "pagar" && <PagarAlicerce painel ocupado={ocupado} falha={erro} onCancelar={voltar} onSalvar={(data) => executar(() => marcarPaga(v.id, data), `Venda paga em ${formatarDia(data)}.`)} />}
      {v && acao === "reativar" && <MotivoAlicerce painel ocupado={ocupado} falha={erro} titulo="Reativar a venda" texto="A venda volta a contar e o lead vai para Venda." botao="Reativar venda" onCancelar={voltar} onSalvar={(motivo) => executar(() => corrigirVenda(v.id, { status: "ativa" }, motivo), "Venda reativada.")} />}
    </PainelLateral>
    {v && cancelando && <CancelarVenda cliente={v.lead?.nome || "este cliente"} onFechar={manterVenda} onConfirmar={async (motivo) => {
      const falha = await corrigirVenda(v.id, { status: "cancelada" }, motivo);
      if (!falha) { setCancelando(false); fechar(); toast.mostrar("Venda cancelada.", { tipo: "sucesso" }); recarregar(); }
      return falha;
    }} />}
  </>;
}
