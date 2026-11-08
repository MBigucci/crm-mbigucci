"use client";
import { useState } from "react";
import { Casca } from "@/components/casca";
import { Cartao } from "@/components/alicerce/cartao";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Selo } from "@/components/alicerce/selo";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { MesPrograma, ErroPrograma, ValorMeta } from "@/components/programa/pecas";
import { PontosGerente } from "@/components/programa/pontos-gerente";
import { LancarAcao } from "@/components/programa/lancar-acao";
import { Comprovante } from "@/components/programa/comprovante";
import { MESES, mesAtual, type Mes } from "@/components/programa/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import { moedaPrograma as formatarReais } from "@/components/programa/pecas";
import { useVendas } from "@/lib/vendas-dados";
import { limitesDoMes, mesDeLiberacao, pontosDoMes, REGRAS, resumoDoMes } from "@/lib/programa";
import { useCriterios, useFechamentos, useLancamentos, cancelarAcao } from "@/lib/programa-dados";

export default function MeusPontosPage() { return <Casca titulo="Meus pontos" migrada><Conteudo /></Casca>; }
function Conteudo() {
  const { pode } = useSessao();
  if (pode("pontos_gerente.participar")) return <PontosGerente />;
  if (pode("leads.cadastrar") || pode("acoes.registrar")) return <PontosCorretor />;
  return <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." />;
}
function PontosCorretor() {
  const eu = usePerfil(); const { pode } = useSessao(); const toast = useToast();
  const [mes, setMes] = useState<Mes>(mesAtual());
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { ini, fim } = limitesDoMes(mes.ano, mes.mes);
  const anterior = new Date(mes.ano, mes.mes - 1, 1);
  const criterios = useCriterios(); const lancs = useLancamentos(ini, fim, { corretor: eu.id });
  const vendas = useVendas(ini, fim, eu.id);
  const fechados = useFechamentos(limitesDoMes(anterior.getFullYear(), anterior.getMonth()).ini);
  const lib = mesDeLiberacao(mes.ano, mes.mes);
  async function cancelar(id: string, desfazer = false) {
    setOcupado(id); setErroAcao(null);
    const e = await cancelarAcao(id, desfazer); setOcupado(null);
    if (e) { setErroAcao(e); return; }
    lancs.recarregar();
    if (!desfazer) toast.mostrar("Lançamento cancelado.", { tipo: "sucesso", aoDesfazer: () => { void cancelar(id, true); } });
  }
  const erro = criterios.erro || lancs.erro || vendas.erro;
  if (erro) return <ErroPrograma tentar={() => { criterios.recarregar(); lancs.recarregar(); vendas.recarregar(); }} />;
  if (!criterios.criterios || !lancs.lancamentos || !vendas.vendas) return <CarregandoLeads texto="Carregando seus pontos…" />;
  const [r] = resumoDoMes([eu.id], lancs.lancamentos, vendas.vendas, criterios.criterios, mes.ano, mes.mes);
  const linhas = pontosDoMes(r.contagens, criterios.criterios).linhas;
  const maximo = criterios.criterios.reduce((s, c) => s + c.pontos * c.limite_mes, 0);
  const pendentes = lancs.lancamentos.filter(l => l.criterio === "video" && l.status === "pendente" && l.lancado_por === eu.id);
  const acoes = lancs.lancamentos.filter(l => l.criterio === "video" && (l.status === "aprovado" || l.status === "pendente"));
  const lancadas = acoes.reduce((n, l) => n + l.quantidade, 0);
  const limite = criterios.criterios.find(c => c.slug === "video")?.limite_mes ?? 12;
  const liberada = fechados.fechamentos?.find(f => f.corretor_id === eu.id);
  return <div className="pagina-alicerce">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><p className="mb-sobrelinha">Programa · corretor</p><h1 className="titulo-tela">Meus pontos</h1></div></header>
    <MesPrograma valor={mes} onMudar={setMes} />
    <section className="mb-meta" aria-label="Verba prevista"><span className="mb-meta__rotulo">Verba prevista</span><span className="mb-meta__valor"><ValorMeta valor={r.verba.verba} /></span><p className="mb-campo__ajuda">Para seus anúncios · liberação em {MESES[lib.mes].toLowerCase()} de {lib.ano}, após o fechamento</p>
      <div className="mb-meta__trilho" role="img" aria-label={`${r.pontos} de ${maximo} pontos; mínimo ${REGRAS.minimo}`}><div className="mb-meta__barra"><span style={{ width: `${maximo ? Math.min(100, r.pontos / maximo * 100) : 0}%` }} /></div>{maximo >= REGRAS.minimo && <span className="mb-meta__minimo" style={{ left: `${REGRAS.minimo / maximo * 100}%` }} />}</div>
      <div className="mb-meta__marcos">{maximo >= REGRAS.minimo && <span style={{ left: `${REGRAS.minimo / maximo * 100}%` }}>mín. {REGRAS.minimo}</span>}<span style={{ right: 0, transform: "none" }}>{maximo}</span></div>
      <div className="mb-meta__legenda"><span>{r.verba.faltamParaMinimo ? `! Faltam ${r.verba.faltamParaMinimo} pontos para o mínimo` : "✓ Passou do mínimo"}</span><span>{r.pontos} pontos aprovados</span></div><p className="mb-campo__ajuda">Só os pontos aprovados entram na previsão.</p>
    </section>
    <p>{r.pontos < REGRAS.minimo ? "Abaixo de 130 pontos, a verba é zero, mesmo com venda." : `${formatarReais(r.verba.daPontuacao)} pelos pontos + ${formatarReais(r.verba.dasVendas)} por ${r.vendas} venda${r.vendas === 1 ? "" : "s"} assinada${r.vendas === 1 ? "" : "s"} e paga${r.vendas === 1 ? "" : "s"}.`}</p>
    <p className="mb-campo__ajuda">1 ponto = R$ 10,00, até {maximo} pontos. Sem trava em 200. A partir de 130 pontos, cada venda assinada e paga soma R$ 1.000,00.</p>
    <div className="grid gap-4 lg:grid-cols-3">{linhas.map(l => <Cartao key={l.criterio.slug} id={`criterio-${l.criterio.slug}`} titulo={l.criterio.nome}><div className="grid gap-3"><p className="mb-meta__valor">{l.pontos} pontos</p><p>{l.considerada} de {l.criterio.limite_mes} no mês</p><p className="mb-campo__ajuda">{l.criterio.pontos} pontos cada · até {l.criterio.pontos * l.criterio.limite_mes} pontos{l.acimaDoLimite > 0 ? ` · ${l.acimaDoLimite} de reserva` : ""}</p>{l.criterio.slug === "video" && <><p className="mb-campo__ajuda">{lancadas} ações lançadas entre vídeos e blitz</p>{pode("acoes.registrar") && <div><LancarAcao key={ini} mes={ini} lancadas={lancadas} limite={limite} onSalvo={lancs.recarregar} /></div>}</>}</div></Cartao>)}</div>
    {lancadas >= limite && <Aviso tom="alerta" titulo="Limite de lançamentos atingido" texto={`Você pode enviar outras ações como reserva se alguma for recusada. Os pontos param em ${limite} aprovadas.`} />}
    {erroAcao && <Aviso tom="erro" titulo={erroAcao} />}
    {!!pendentes.length && <Cartao id="acoes-pendentes" titulo="Minhas ações aguardando aprovação" descricao="Ainda não somam pontos nem verba. O gerente geral confere os comprovantes."><div className="grid gap-4">{pendentes.map(l => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3"><div><strong>{l.tipo_acao === "blitz" ? "Blitz" : "Vídeo"} · {l.data.split("-").reverse().join("/")}</strong><p className="mb-campo__ajuda">{l.quantidade * (criterios.criterios!.find(c => c.slug === "video")?.pontos ?? 5)} pontos se aprovado</p>{l.comprovante_arquivo ? <Comprovante caminho={l.comprovante_arquivo} /> : l.comprovante && <a className="mb-botao mb-botao--discreto" href={l.comprovante} target="_blank" rel="noreferrer">Ver vídeo ↗</a>}</div><Selo tom="info">Em análise</Selo><button className="mb-botao mb-botao--secundario" disabled={ocupado === l.id} onClick={() => void cancelar(l.id)}>Desfazer</button></div>)}</div></Cartao>}
    {liberada && <Cartao id="verba-liberada" titulo={`Verba de ${MESES[anterior.getMonth()].toLowerCase()}, liberada neste mês`}><p className="mb-meta__valor">{formatarReais(Number(liberada.verba))}</p></Cartao>}
  </div>;
}
