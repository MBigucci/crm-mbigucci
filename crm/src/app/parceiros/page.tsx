"use client";

import Link from "next/link";

import { useMemo, useState } from "react";
import { Casca } from "@/components/casca";
import { BarraDeFiltros, type FiltroDaBarra } from "@/components/alicerce/barra-de-filtros";
import { Seletor } from "@/components/alicerce/seletor";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { EstadoDePagina, CopiarDetalhes } from "@/components/alicerce/estado-de-pagina";
import { CardParceiro } from "@/components/parceiros/card";
import { ContatosDoDiaParceiros } from "@/components/parceiros/contatos-do-dia";
import { LinhaProximoDaVez, VerFila } from "@/components/parceiros/fila";
import { CabecalhoParceiros, ComPermissao } from "@/components/parceiros/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import {
  contarPorEstagio,
  ESTAGIOS,

  filtrarParceiros,
  maisUrgente,
  ordenarParceiros,
  resumoCarteira,
  type Estagio,
  type Faixa,
} from "@/lib/parceiros";
import { useCarteira, useFila, useGerentes } from "@/lib/parceiros-dados";

export default function ParceirosPage() {
  return (
    <Casca titulo="Parceiros" migrada>
      <ComPermissao>
        <Parceiros />
      </ComPermissao>
    </Casca>
  );
}

const ORDEM_FAIXAS: Faixa[] = ["ok", "atencao", "risco"];

function Parceiros() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veTodos = pode("parceiros.ver_todos");
  const cadastra = pode("parceiros.cadastrar");
  const { lista, erro, recarregar } = useCarteira();
  const fila = useFila();
  const gerentes = useGerentes(veTodos);
  const [agora] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [faixa, setFaixa] = useState<Faixa | null>(null);
  const [estagio, setEstagio] = useState<Estagio | null>(null);
  const [gerente, setGerente] = useState<string | null>(null);

  const nomeGerente = useMemo(() => new Map(gerentes.map((g) => [g.id, g.nome])), [gerentes]);
  // O resumo e as contagens são da carteira escolhida (do gerente filtrado, para quem vê todos).
  const base = useMemo(
    () => (lista ?? []).filter((p) => !gerente || p.gerente_id === gerente),
    [lista, gerente],
  );
  const resumo = useMemo(() => resumoCarteira(base, agora), [base, agora]);
  const porEstagio = useMemo(() => contarPorEstagio(base), [base]);
  const visiveis = useMemo(
    () => ordenarParceiros(filtrarParceiros(base, { faixa, estagio, gerente: null, busca }), agora),
    [base, faixa, estagio, busca, agora],
  );
  const destaque = useMemo(() => maisUrgente(visiveis, agora), [visiveis, agora]);
  const filtrando = !!(busca.trim() || faixa || estagio);

  const limpar = () => { setBusca(""); setFaixa(null); setEstagio(null); setGerente(null); };
  const filtros: FiltroDaBarra[] = [
    { rotulo: "Estágio", valor: estagio ?? "", onChange: (v) => setEstagio(v as Estagio || null), opcoes: [{ valor: "", rotulo: "Todos os estágios" }, ...ESTAGIOS.filter((e) => e.ativo).map((e) => ({ valor: e.slug, rotulo: e.nome + " · " + porEstagio[e.slug] }))] },
    ...(veTodos ? [{ rotulo: "Gerente", valor: gerente ?? "", onChange: (v: string) => setGerente(v || null), opcoes: [{ valor: "", rotulo: "Todos os gerentes" }, ...gerentes.map((g) => ({ valor: g.id, rotulo: g.id === eu.id ? g.nome + " (você)" : g.nome }))] }] : []),
  ];
  return <div className="pagina-alicerce parcerias-pilha">
    <CabecalhoParceiros titulo="Parceiros" voltar={false} subtitulo="Cuide dos contatos e acompanhe o prazo de 90 dias." acoes={cadastra && <Link href="/parceiros/evento/" className="mb-botao mb-botao--secundario">Registrar evento</Link>} />
    <BarraDeFiltros escopo={veTodos ? "Parceiros de todos os gerentes" : "Seus parceiros"} busca={{ valor: busca, onChange: setBusca, placeholder: "Nome, empresa, WhatsApp ou CRECI" }} filtros={filtros} contagem={lista ? visiveis.length + (visiveis.length === 1 ? " parceiro" : " parceiros") : undefined} />
    {lista && lista.length > 0 && <div className="parcerias-pilha">
      <span className="mb-sobrelinha" id="faixas-prazo">Dias sem interação</span>
      <Seletor idRotulo="faixas-prazo" grade="linha" pequeno valor={faixa} onChange={(f) => setFaixa(faixa === f ? null : f)} opcoes={ORDEM_FAIXAS.map((f) => ({ valor: f, rotulo: <>{f === "ok" ? "Até 30 dias" : f === "atencao" ? "31 a 60 dias" : "61 a 90 dias"} <span className="mb-opcao__contagem">{resumo[f]}</span></> }))} />
      <p className="mb-campo__ajuda">{resumo.novos} sem a primeira interação · {resumo.vencidos} com contato vencido{resumo.reentradas > 0 && " · " + resumo.reentradas + " procuraram de novo"}</p>
    </div>}
    <LinhaProximoDaVez fila={fila} eu={eu.id} />
    {lista && cadastra && <ContatosDoDiaParceiros lista={lista} eu={eu.id} agora={agora} alicerce />}
    {erro ? <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar os parceiros" texto="Tente de novo. O que você já salvou continua salvo." detalhe={<CopiarDetalhes codigo={erro} />} acoes={<button type="button" className="mb-botao mb-botao--primario" onClick={() => void recarregar()}>Tentar de novo</button>} /> : !lista ? <CarregandoLeads /> : !lista.length ? <EstadoVazio titulo="Nenhum parceiro ainda" texto={cadastra ? "Cadastre o primeiro em + Novo parceiro. Os que chegarem pela roleta também aparecem aqui." : "Os parceiros aparecem quando os gerentes cadastrarem ou a roleta distribuir."} /> : !visiveis.length ? <EstadoVazio titulo="Nenhum parceiro com esses filtros" texto="Limpe os filtros para ver a carteira." acao={<button type="button" className="mb-botao mb-botao--secundario" onClick={limpar}>Limpar filtros</button>} /> : <section aria-labelledby="lista-parceiros">
      <h2 id="lista-parceiros" className="mb-sobrelinha">{filtrando ? "Encontrados" : "Parceiros"} · {visiveis.length}</h2>
      <ul className="mb-itens mb-itens--duas">{visiveis.map((p) => <CardParceiro key={p.id} p={p} agora={agora} eu={eu.id} dono={veTodos ? (p.gerente_id ? (nomeGerente.get(p.gerente_id) ?? "Gerente") : "Sem gerente") : undefined} destaque={p.id === destaque} onSalvo={recarregar} />)}</ul>
    </section>}
    <VerFila fila={fila} eu={eu.id} />
  </div>;
}
