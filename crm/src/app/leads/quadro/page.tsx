"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { useLeadsVisiveis } from "@/components/leads/filtros";
import { BarraDeFiltros, type FiltroDaBarra } from "@/components/alicerce/barra-de-filtros";
import { Abas, idDaAba, idDoPainel } from "@/components/alicerce/abas";
import { Prazo } from "@/components/alicerce/prazo";
import { Chip } from "@/components/alicerce/chip";
import { Selo } from "@/components/alicerce/selo";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { useToast } from "@/components/alicerce/toast";
import { chipDaTemperatura, tomDaEtapa, nivelDoPrazo, nivelDoSemContato } from "@/components/alicerce/mapas";
import { ErroPainel } from "@/components/painel/partes";
import { alterarLead, useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { prazoDoLead, seloPrazo } from "@/lib/prazo";
import { diasSemContato, seloSemContato } from "@/lib/followup";
import { formatarQuando, type Lead } from "@/lib/leads";
import { criarBusca, ordenarLeads, SEM_EMPREENDIMENTO } from "@/lib/busca";
import { usePerfil, useSessao } from "@/lib/sessao";

type Pego = { id: string; destino: string; posicao: number };
export default function QuadroPage() {
  return <Casca migrada titulo="Quadro por etapas"><Suspense fallback={<CarregandoTabela texto="Carregando quadro…" />}><Quadro /></Suspense></Casca>;
}
function Quadro() {
  const { catalogos, erro: erroCatalogo } = useCatalogos();const f = useLeadsVisiveis();const horario = useHorarioAtendimento();
  const eu = usePerfil();const { pode } = useSessao();const toast = useToast();const sp = useSearchParams();const router = useRouter();const consulta = sp.toString();
  const [agora] = useState(() => new Date());const [desktop, setDesktop] = useState(false);
  const [pego, setPego] = useState<Pego | null>(null);const [arrastando, setArrastando] = useState<string | null>(null);const [alvo, setAlvo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);const [anuncio, setAnuncio] = useState("");const [locais, setLocais] = useState<Record<string, string>>({});
  const origem = sp.get("origem") ?? "";const empreendimento = sp.get("empreendimento") ?? "";const corretor = sp.get("corretor") ?? "";const busca = sp.get("busca") ?? "";
  useEffect(() => { f.setOrigem(origem);f.setEmpreendimento(empreendimento);f.setCorretor(corretor); }, [origem, empreendimento, corretor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const m = matchMedia("(min-width: 768px)");const atualizar = () => { setDesktop(m.matches);setPego(null); };atualizar();m.addEventListener("change", atualizar);return () => m.removeEventListener("change", atualizar); }, []);
  useEffect(() => setLocais({}), [f.leads]);
  useEffect(() => { setPego(null);setArrastando(null);setAlvo(null); }, [consulta]);
  const etapas = catalogos?.etapas.filter((e) => !["venda", "perdido", "descartado"].includes(e.slug) && (e.ativo || f.leads?.some((l) => l.etapa === e.slug))) ?? [];
  const etapaAtiva = etapas.some((e) => e.slug === sp.get("etapa")) ? sp.get("etapa")! : etapas[0]?.slug ?? "";
  const predicado = useMemo(() => criarBusca(busca), [busca]);
  const leads = (f.leads ?? []).filter(predicado).map((l) => locais[l.id] ? { ...l, etapa: locais[l.id] } : l);
  const noQuadro = leads.filter((l) => etapas.some((e) => e.slug === l.etapa));
  const sincronizado = f.origem === origem && f.empreendimento === empreendimento && f.corretor === corretor;
  const podeMover = (l: Lead) => l.dono_id === eu.id && pode("leads.cadastrar") && l.status === "ativo" && l.etapa !== "venda";
  const nomeEtapa = (slug: string) => etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const ordenados = (slug: string) => ordenarLeads(noQuadro.filter((l) => l.etapa === slug), "sem_contato");
  function ir(x: Record<string, string>) { const q = new URLSearchParams(consulta);for (const [k,v] of Object.entries(x)) { if (v) q.set(k,v);else q.delete(k); }router.replace("/leads/quadro/?" + q.toString(), { scroll: false }); }
  useEffect(() => {
    if (f.leads && empreendimento && empreendimento !== SEM_EMPREENDIMENTO && !f.empreendimentos.some((e) => e.chave === empreendimento)) ir({ empreendimento: "" });
  }, [f.leads, f.empreendimentos, empreendimento]); // eslint-disable-line react-hooks/exhaustive-deps
  const focar = (id: string) => requestAnimationFrame(() => document.getElementById(`quadro-card-${id}`)?.querySelector<HTMLElement>("a")?.focus());
  async function mover(l: Lead, destino: string) {
    setPego(null);setArrastando(null);setAlvo(null);
    if (ocupado || !desktop || !podeMover(l) || l.etapa === destino || !etapas.some((e) => e.slug === destino)) { focar(l.id);return; }
    const anterior = l.etapa;setOcupado(true);
    try {
      const erro = await alterarLead(l.id, { etapa: destino }, { etapa: anterior, dono_id: eu.id, status: "ativo" });
      if (erro) { toast.mostrar("Não foi possível mudar a etapa. Abra a ficha, confira o andamento e tente novamente.", { tipo: "erro" });return; }
      setLocais((a) => ({ ...a, [l.id]: destino }));f.recarregar();
      setAnuncio(`${l.nome}: ${nomeEtapa(destino)}. A ordem continua pelo tempo sem contato.`);
      toast.mostrar(`${l.nome}: ${nomeEtapa(destino)}`, { tipo: "sucesso", aoDesfazer: async () => {
        const erroDesfazer = await alterarLead(l.id, { etapa: anterior }, { etapa: destino, dono_id: eu.id, status: "ativo" });
        if (erroDesfazer) return void toast.mostrar("Não foi possível desfazer: o lead mudou depois. Confira a ficha.", { tipo: "erro" });
        setLocais((a) => ({ ...a, [l.id]: anterior }));f.recarregar();toast.mostrar("Etapa restaurada.", { tipo: "sucesso" });focar(l.id);
      } });
    } catch { toast.mostrar("Não foi possível mudar a etapa. Confira a conexão e tente novamente.", { tipo: "erro" }); }
    finally { setOcupado(false);focar(l.id); }
  }
  function tecla(ev: React.KeyboardEvent, l: Lead) {
    if (!desktop || ocupado || !podeMover(l)) return;
    if (ev.key === " " || ev.key === "Spacebar") {
      ev.preventDefault();if (pego?.id === l.id) void mover(l, pego.destino);else { const posicao = ordenados(l.etapa).findIndex((a) => a.id === l.id);setPego({ id: l.id, destino: l.etapa, posicao });setAnuncio(`${l.nome} selecionado. Use as setas e Espaço para soltar; Esc cancela.`); }return;
    }
    if (pego?.id !== l.id) return;
    if (ev.key === "Escape") { ev.preventDefault();setPego(null);setAnuncio("Movimento cancelado. A etapa foi mantida.");focar(l.id);return; }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
    ev.preventDefault();let destino = pego.destino;let posicao = pego.posicao;
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const i = etapas.findIndex((e) => e.slug === destino);destino = etapas[Math.max(0, Math.min(etapas.length - 1, i + (ev.key === "ArrowRight" ? 1 : -1)))].slug;posicao = ordenados(destino).filter((a) => a.id !== l.id).length; }
    const total = ordenados(destino).filter((a) => a.id !== l.id).length + 1;
    if (ev.key === "ArrowUp") posicao = Math.max(0, posicao - 1);if (ev.key === "ArrowDown") posicao = Math.min(total - 1, posicao + 1);
    setPego({ ...pego, destino, posicao });setAnuncio(`${nomeEtapa(destino)}, posição ${posicao + 1} de ${total}. Ao salvar, a ordem é por tempo sem contato.`);focar(l.id);
  }
  function daColuna(slug: string) {
    const lista = ordenados(slug).filter((l) => l.id !== pego?.id);
    if (pego?.destino === slug) { const l = noQuadro.find((a) => a.id === pego.id);if (l) lista.splice(pego.posicao, 0, l); }return lista;
  }
  const filtros: FiltroDaBarra[] = [
    ...(f.veOutros ? [{ rotulo: "Corretor", valor: corretor, onChange: (v: string) => ir({ corretor: v }), opcoes: [{ valor: "", rotulo: "Todos os corretores" }, ...f.corretores.map((c) => ({ valor: c.id, rotulo: c.nome }))] }] : []),
    { rotulo: "Origem", valor: origem, onChange: (v) => ir({ origem: v }), opcoes: [{ valor: "", rotulo: "Todas as origens" }, ...(catalogos?.origens ?? []).map((o) => ({ valor: o.slug, rotulo: o.nome }))] },
    { rotulo: "Empreendimento", valor: empreendimento, onChange: (v) => ir({ empreendimento: v }), opcoes: [{ valor: "", rotulo: "Todos os empreendimentos" }, { valor: SEM_EMPREENDIMENTO, rotulo: "Sem empreendimento" }, ...f.empreendimentos.map((e) => ({ valor: e.chave, rotulo: `${e.nome} · ${e.total}` }))] },
  ];
  const temFiltro = !!(busca || origem || empreendimento || corretor);
  return <div className="quadro-pilha">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><h1 className="titulo-tela">Quadro por etapas</h1><p className="mb-cabecalho__subtitulo">O mais esquecido primeiro em cada etapa. Vendas e descartados ficam em Leads.</p></div><Link className="mb-botao mb-botao--secundario" href="/leads/">Ver lista de leads</Link></header>
    {!pode("leads.cadastrar") && !f.veOutros ? <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." /> : <>
      <BarraDeFiltros escopo={pode("dados.ver_todos") ? "Empresa toda" : f.veOutros ? "Sua equipe" : "Só os seus"} busca={{ valor: busca, onChange: (v) => ir({ busca: v }), placeholder: "Nome, telefone ou empreendimento" }} filtros={filtros} contagem={f.leads && sincronizado ? `${noQuadro.length} leads no quadro` : undefined} tituloDoPainel="Filtrar quadro" />
      {(f.erro || erroCatalogo) && <ErroPainel erro={f.erro ?? erroCatalogo!} />}
      {(!f.leads || !catalogos || !sincronizado) && !f.erro && !erroCatalogo && <CarregandoTabela texto="Carregando quadro…" />}
      {f.leads && catalogos && sincronizado && !f.erro && !erroCatalogo && <>
        {!noQuadro.length ? <EstadoVazio titulo={temFiltro ? "Nenhum lead com esses filtros" : "Nenhum lead nas etapas do quadro"} texto={temFiltro ? "Mude a busca ou limpe os filtros para ver seus leads." : "Os leads ativos aparecem aqui; consulte as vendas e os descartados em Leads."} acao={temFiltro ? <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => ir({ busca: "", origem: "", empreendimento: "", corretor: "" })}>Limpar filtros</button> : undefined} /> : <>
          <p className="quadro-ajuda">{desktop ? "Abra o card para ver o lead. Nos seus leads, arraste ou use Espaço e as setas para mudar de etapa." : "Escolha a etapa nas abas. Para mudar o andamento, abra o lead."}</p>
          <div className="mb-quadro__abas"><Abas base="quadro" rotulo="Etapas do quadro" ativa={etapaAtiva} onChange={(id) => ir({ etapa: id })} abas={etapas.map((e) => ({ id: e.slug, rotulo: e.nome, contagem: ordenados(e.slug).length }))} /></div>
          <div className="mb-quadro" aria-busy={ocupado || undefined}>
            {etapas.map((e) => { const lista = daColuna(e.slug);return <section key={e.slug} id={idDoPainel("quadro", e.slug)} role={desktop ? "region" : "tabpanel"} aria-labelledby={desktop ? `etapa-${e.slug}` : idDaAba("quadro", e.slug)} data-etapa={e.slug} className={`mb-quadro__coluna${e.slug === etapaAtiva ? " mb-quadro__coluna--ativa" : ""}${alvo === e.slug ? " mb-quadro__coluna--alvo" : ""}`}
              onDragOver={(ev) => { const l = noQuadro.find((a) => a.id === arrastando);if (l && podeMover(l) && !ocupado) { ev.preventDefault();setAlvo(e.slug); } }} onDragLeave={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setAlvo(null); }} onDrop={(ev) => { ev.preventDefault();const l = noQuadro.find((a) => a.id === arrastando);if (l) void mover(l, e.slug); }}>
              <header className="mb-quadro__cabeca"><h2 id={`etapa-${e.slug}`} className="mb-quadro__nome"><Selo tom={tomDaEtapa(e.slug)}>{e.nome}</Selo></h2><span className="mb-quadro__contagem">{lista.length}</span></header>
              <ul className="mb-quadro__cartoes">{lista.map((l) => { const p = prazoDoLead(l, agora, horario);const prazo = p ? seloPrazo(p, agora) : null;const sem = seloSemContato(l, agora, false);const chip = chipDaTemperatura(l.temperatura);return <li key={l.id} id={`quadro-card-${l.id}`} className={`mb-item mb-item--sem-faixa${arrastando === l.id ? " mb-quadro__pegando" : ""}`} data-id={l.id} data-mb-pego={pego?.id === l.id ? "" : undefined} draggable={desktop && podeMover(l) && !ocupado} onKeyDown={(ev) => tecla(ev, l)}
                onDragStart={(ev) => { if (!desktop || !podeMover(l) || ocupado) return ev.preventDefault();ev.dataTransfer.setData("text/plain", l.id);ev.dataTransfer.effectAllowed = "move";setArrastando(l.id); }} onDragEnd={() => { setArrastando(null);setAlvo(null); }}>
                <div className="mb-item__cabeca"><div className="mb-item__id"><Link className="mb-item__titulo mb-item__alvo" href={`/leads/ficha/?id=${l.id}`}>{l.nome}</Link>
                  <p className="mb-item__linha">{prazo ? <Prazo nivel={nivelDoPrazo(prazo.nivel)}>{prazo.sinal} {prazo.texto}</Prazo> : l.proximo_contato ? <Prazo nivel={new Date(l.proximo_contato) < agora ? "estourado" : "normal"}>{new Date(l.proximo_contato) < agora ? "! Atrasado · " : "→ "}{formatarQuando(l.proximo_contato, agora)}</Prazo> : "Sem próximo contato"}</p>
                  <p className="mb-item__linha">{sem ? <Prazo nivel={nivelDoSemContato(sem.nivel)} >! {sem.texto}</Prazo> : diasSemContato(l, agora) === 0 ? "Contato hoje" : diasSemContato(l, agora) === 1 ? "Sem contato há 1 dia" : `Sem contato há ${diasSemContato(l, agora)} dias`}</p>
                  <p className="mb-item__linha">{[l.empreendimento, f.veOutros ? l.dono_id ? f.nomeDono.get(l.dono_id) : "A distribuir" : null].filter(Boolean).join(" · ")}</p>
                </div></div><div className="mb-item__rodape"><Chip nivel={chip.nivel} sinal={chip.sinal}>{chip.texto}</Chip></div>
              </li>; })}</ul>
              {!lista.length && <p className="mb-quadro__vazio">{desktop && pode("leads.cadastrar") ? "Arraste um lead para cá." : "Nenhum lead nesta etapa."}</p>}
            </section>; })}
          </div>
        </>}
      </>}
    </>}
    <p className="mb-visualmente-oculto" role="status" aria-live="polite" aria-atomic="true">{anuncio}</p>
  </div>;
}
