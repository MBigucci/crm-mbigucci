"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { BarraDeFiltros, type FiltroDaBarra } from "@/components/alicerce/barra-de-filtros";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { ErroPainel } from "@/components/painel/partes";
import { CardDoCatalogo, FASES } from "@/components/empreendimentos/catalogo-alicerce";
import { ehLancamento, FAIXAS_PRECO, filtrarCatalogo, FILTROS_VAZIOS, opcoesLocal, type FiltrosCatalogo, type StatusEmpreendimento } from "@/lib/catalogo";
import { useCatalogo, useLeadsDoRadar } from "@/lib/catalogo-dados";
import { clientesCompativeis } from "@/lib/match";
import { useSessao } from "@/lib/sessao";

export default function EmpreendimentosPage() {
  return <Casca migrada titulo="Empreendimentos"><Suspense fallback={<CarregandoTabela texto="Carregando catálogo…" />}><Catalogo /></Suspense></Casca>;
}

function Catalogo() {
  const { pode } = useSessao();const gerencia = pode("empreendimentos.gerenciar");
  const temLeads = pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos");
  const { catalogo, erro } = useCatalogo();const leads = useLeadsDoRadar(temLeads);
  const sp = useSearchParams();const router = useRouter();const consulta = sp.toString();
  const ler = () => ({ busca: sp.get("busca") ?? "", status: Object.hasOwn(FASES, sp.get("fase") ?? "") ? sp.get("fase") as StatusEmpreendimento : "" as const, local: sp.get("local") ?? "", dormitorios: sp.get("dormitorios") ?? "", faixa: sp.get("faixa") ?? "", inativos: gerencia && sp.get("inativos") === "sim" });
  const [f, setF] = useState<FiltrosCatalogo>(ler);
  // URL e Voltar restauram os mesmos filtros; os cálculos continuam em filtrarCatalogo.
  useEffect(() => setF(ler()), [consulta, gerencia]); // eslint-disable-line react-hooks/exhaustive-deps
  function mudar(x: Partial<FiltrosCatalogo>) {
    const novo = { ...f, ...x };setF(novo);const q = new URLSearchParams(consulta);
    for (const [chave, valor] of Object.entries({ busca: novo.busca, fase: novo.status, local: novo.local, dormitorios: novo.dormitorios, faixa: novo.faixa, inativos: novo.inativos ? "sim" : "" })) { if (valor) q.set(chave, valor);else q.delete(chave); }
    router.replace("/empreendimentos/?" + q.toString(), { scroll: false });
  }
  const agora = useMemo(() => new Date(), []);
  const lista = useMemo(() => filtrarCatalogo(catalogo ?? [], f), [catalogo, f]);
  const locais = useMemo(() => opcoesLocal(catalogo ?? []), [catalogo]);
  const aguardando = useMemo(() => {
    const m = new Map<string, number>();if (!leads?.length) return m;
    for (const e of catalogo ?? []) { if (!e.ativo || !ehLancamento(e)) continue;const n = clientesCompativeis(e, leads, agora).filter((c) => c.destaque).length;if (n) m.set(e.id, n); }
    return m;
  }, [catalogo, leads, agora]);
  const filtros: FiltroDaBarra[] = [
    { rotulo: "Fase", valor: f.status, onChange: (status) => mudar({ status: status as StatusEmpreendimento | "" }), opcoes: [{ valor: "", rotulo: "Todas as fases" }, ...Object.entries(FASES).map(([valor, fase]) => ({ valor, rotulo: fase.nome }))] },
    { rotulo: "Cidade e bairro", valor: f.local, onChange: (local) => mudar({ local }), opcoes: [{ valor: "", rotulo: "Todos os locais" }, ...locais.flatMap((l) => [{ valor: l.cidade, rotulo: `Toda ${l.cidade}` }, ...l.bairros.map((b) => ({ valor: `${l.cidade}|${b}`, rotulo: `${b} · ${l.cidade}` }))])] },
    { rotulo: "Dormitórios", valor: f.dormitorios, onChange: (dormitorios) => mudar({ dormitorios }), opcoes: [{ valor: "", rotulo: "Todos os dormitórios" }, { valor: "1", rotulo: "1 ou studio" }, { valor: "2", rotulo: "2" }, { valor: "3", rotulo: "3" }, { valor: "4", rotulo: "4 ou mais" }] },
    { rotulo: "Faixa de preço", valor: f.faixa, onChange: (faixa) => mudar({ faixa }), opcoes: [{ valor: "", rotulo: "Todas as faixas de preço" }, ...FAIXAS_PRECO.map((x) => ({ valor: x.slug, rotulo: x.nome }))] },
  ];
  const filtrando = JSON.stringify(f) !== JSON.stringify(FILTROS_VAZIOS);
  return <div className="catalogo-pilha">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><h1 className="titulo-tela">Empreendimentos</h1></div>{gerencia && <div className="mb-grupo-botoes"><Link className="mb-botao mb-botao--secundario" href="/empreendimentos/importar/">Importar tabela de preços</Link><Link className="mb-botao mb-botao--primario" href="/empreendimentos/editar/">+ Novo empreendimento</Link></div>}</header>
    <BarraDeFiltros busca={{ valor: f.busca, onChange: (busca) => mudar({ busca }), placeholder: "Nome, bairro, cidade ou endereço" }} filtros={filtros} contagem={catalogo ? `${lista.length} empreendimentos` : undefined} tituloDoPainel="Filtrar empreendimentos" />
    {gerencia && <Recolhivel titulo="Mais filtros" contagem={f.inativos ? "1 ativo" : undefined}><label className="mb-marcador"><input type="checkbox" checked={f.inativos} onChange={(ev) => mudar({ inativos: ev.target.checked })} />Mostrar os fora de venda</label></Recolhivel>}
    {f.inativos && <div className="mb-grupo-botoes"><button className="mb-opcao mb-opcao--p" type="button" onClick={() => mudar({ inativos: false })}>Mostrar os fora de venda ✕</button></div>}
    {erro && <ErroPainel erro={erro} />}
    {!catalogo && !erro && <CarregandoTabela texto="Carregando catálogo…" />}
    {catalogo && !erro && !lista.length && <EstadoVazio titulo={filtrando ? "Nenhum empreendimento com esses filtros" : "O catálogo está vazio"} texto={filtrando ? "Mude a busca ou limpe os filtros para ver os empreendimentos." : gerencia ? "Cadastre o primeiro empreendimento para começar." : "Os empreendimentos aparecem depois que o catálogo for cadastrado."} acao={filtrando ? <button className="mb-botao mb-botao--secundario mb-botao--p" type="button" onClick={() => mudar(FILTROS_VAZIOS)}>Limpar filtros</button> : undefined} />}
    {!erro && lista.length > 0 && <ul className="mb-empreendimentos" aria-label="Empreendimentos encontrados">{lista.map((e) => <CardDoCatalogo key={e.id} e={e} aguardando={aguardando.get(e.id)} />)}</ul>}
  </div>;
}
