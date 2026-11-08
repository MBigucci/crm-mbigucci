"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Casca } from "@/components/casca";
import { NovaVenda } from "@/components/vendas/vendas";
import { ResumoVendasAlicerce, TabelaDeVendas } from "@/components/vendas/lista-alicerce";
import { NavegadorDePeriodo } from "@/components/alicerce/navegador-de-periodo";
import { CampoSelecao } from "@/components/alicerce/campo";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { EstadoDePagina, CopiarDetalhes, LinkDoEstado } from "@/components/alicerce/estado-de-pagina";
import { usePerfil, useSessao } from "@/lib/sessao";
import { useCorretores } from "@/lib/leads-dados";
import { somarVendas } from "@/lib/vendas";
import { useNomes, useVendas } from "@/lib/vendas-dados";

export default function VendasPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca titulo={veOutros ? "Vendas da equipe" : "Minhas vendas"} migrada>
      <Suspense fallback={<CarregandoTabela texto="Carregando vendas…" />}>
        <Vendas />
      </Suspense>
    </Casca>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

/** Mês ou ano, pelo dia da assinatura. Fica no endereço (?p=mes&d=2026-10). */
function usePeriodoVendas() {
  const sp = useSearchParams();
  const hoje = new Date();
  const tipo = sp.get("p") === "ano" ? "ano" : "mes";
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(sp.get("d") ?? "");
  const ano = m ? Number(m[1]) : hoje.getFullYear();
  const mes = m?.[2] ? Number(m[2]) - 1 : hoje.getMonth();
  return useMemo(() => {
    if (tipo === "ano") return { tipo, ano, mes, ini: `${ano}-01-01`, fim: `${ano + 1}-01-01`, rotulo: String(ano) };
    const prox = mes === 11 ? { a: ano + 1, m: 0 } : { a: ano, m: mes + 1 };
    return { tipo, ano, mes, ini: `${ano}-${dd(mes + 1)}-01`, fim: `${prox.a}-${dd(prox.m + 1)}-01`, rotulo: `${MESES[mes]} de ${ano}` };
  }, [tipo, ano, mes]);
}

function Vendas() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const permitido = veOutros || pode("leads.cadastrar");
  const sp = useSearchParams();
  const router = useRouter();
  const per = usePeriodoVendas();
  const corretor = veOutros ? sp.get("c") : null;
  const { vendas, erro, recarregar } = useVendas(per.ini, per.fim, corretor);
  const corretores = useCorretores(veOutros);
  const nomes = useNomes(veOutros ? (vendas ?? []).map((v) => v.corretor_id) : []);
  const [canceladas, setCanceladas] = useState(false);

  const ir = (mudar: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/vendas/?${q.toString()}`, { scroll: false });
  };
  const deslocar = (n: number) => {
    if (per.tipo === "ano") return ir({ d: String(per.ano + n) });
    const d = new Date(per.ano, per.mes + n, 1);
    ir({ d: `${d.getFullYear()}-${dd(d.getMonth() + 1)}` });
  };
  const hoje = new Date();
  const ehAtual = per.ano === hoje.getFullYear() && (per.tipo === "ano" || per.mes === hoje.getMonth());

  if (!permitido) return <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." acoes={<LinkDoEstado href="/">Voltar para o início</LinkDoEstado>} />;

  const ativas = (vendas ?? []).filter((v) => v.status === "ativa");
  const listaCanceladas = (vendas ?? []).filter((v) => v.status === "cancelada");
  const t = somarVendas(vendas ?? []);

  const chaveOrdem = sp.get("ordem");
  const ordem = chaveOrdem === "cliente" || chaveOrdem === "vgv" ? chaveOrdem : "assinada";
  const sentido = sp.get("sentido") === "asc" ? "asc" : "desc";
  const ordenar = (chave: "cliente" | "vgv" | "assinada", direcao?: "asc" | "desc") => ir({ ordem: chave, sentido: direcao ?? (ordem === chave && sentido === "desc" ? "asc" : "desc") });
  const tabela = (linhas: typeof ativas, canceladas = false) => <TabelaDeVendas vendas={linhas} veOutros={veOutros} nomes={nomes} recarregar={recarregar} ordem={ordem} sentido={sentido} onOrdenar={ordenar} canceladas={canceladas} />;
  return <div className="pagina-alicerce vendas-pilha">
    <header className="mb-cabecalho">
      <div className="mb-cabecalho__texto"><h1 className="titulo-tela">{veOutros ? "Vendas da equipe" : "Minhas vendas"}</h1><p className="mb-cabecalho__subtitulo">Confira as vendas pelo mês da assinatura. O VGV válido é o assinado e pago.</p></div>
      {pode("leads.cadastrar") && !veOutros && <div className="mb-grupo-botoes"><NovaVenda alicerce corretor={eu.id} onRegistrada={recarregar} /></div>}
    </header>
    <section className="vendas-pilha" aria-label="Período das vendas">
      <div className="vendas-filtros">
        <div className="mb-campo"><span id="periodo-vendas" className="mb-campo__rotulo">Período, pela assinatura</span><div className="mb-segmentado" role="group" aria-labelledby="periodo-vendas">
          {(["mes", "ano"] as const).map((x) => <button key={x} type="button" aria-pressed={per.tipo === x} onClick={() => ir({ p: x === "ano" ? "ano" : null, d: x === "ano" ? String(per.ano) : null })}>{x === "mes" ? "Mês" : "Ano"}</button>)}
        </div></div>
        {veOutros && <CampoSelecao rotulo="Corretor"><select id="corretor" className="mb-campo__entrada" value={corretor ?? ""} onChange={(e) => ir({ c: e.target.value || null })}><option value="">Todos os corretores</option>{corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></CampoSelecao>}
      </div>
      <NavegadorDePeriodo nome="Período das vendas" rotulo={per.rotulo} aoAnterior={() => deslocar(-1)} aoSeguinte={() => deslocar(1)} aoVoltar={!ehAtual ? () => ir({ d: null }) : undefined} />
    </section>
    {erro ? <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar as vendas" texto="Tente de novo. O que você já salvou continua salvo." detalhe={<CopiarDetalhes codigo={erro} />} acoes={<button type="button" className="mb-botao mb-botao--primario" onClick={recarregar}>Tentar de novo</button>} /> : !vendas ? <CarregandoTabela texto="Carregando vendas…" /> : <>
      <p className="mb-campo__ajuda">{ativas.length} {ativas.length === 1 ? "venda assinada" : "vendas assinadas"} no período</p>
      <ResumoVendasAlicerce t={t} />
      {!ativas.length ? <EstadoVazio titulo="Nenhuma venda no período" texto={pode("leads.cadastrar") && !veOutros ? "Quando um lead for para Venda, o registro aparece aqui." : "Quando um corretor registrar uma venda, ela aparece aqui."} /> : tabela(ativas)}
      {listaCanceladas.length > 0 && <Recolhivel titulo="Ver as canceladas" contagem={`· ${listaCanceladas.length}`} aberto={canceladas} onAlternar={setCanceladas}>{tabela(listaCanceladas, true)}</Recolhivel>}
    </>}
  </div>;
}
