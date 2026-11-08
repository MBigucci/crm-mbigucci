"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Meta } from "@/components/alicerce/meta";
import { Cartao } from "@/components/alicerce/cartao";
import { Aviso } from "@/components/alicerce/aviso";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Prazo } from "@/components/alicerce/prazo";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { calcularPremioGerente, limitesDoMes, mesDeLiberacao, type SemanaGerente } from "@/lib/programa";
import { usePontosGerente, type FechamentoGerente } from "@/lib/programa-dados";
import { usePerfil } from "@/lib/sessao";
import { db } from "@/lib/supabase";
import { diaIso } from "@/lib/vendas";
import { moedaPrograma as formatarReais } from "@/components/programa/pecas";
import { MESES, mesAtual, type Mes } from "./partes";
import { ErroPrograma, MesPrograma, ValorMeta } from "./pecas";

function EstadoSemana({ s, perdido }: { s: SemanaGerente; perdido: boolean }) {
  if (s.estado === "feito") return <span>✓ Feito</span>;
  if (s.estado === "perdido") return <span>✕ Perdido</span>;
  if (perdido) return <span>– Prêmio de check-ins perdido</span>;
  return <Prazo nivel={s.estado === "falta" ? "atencao" : "normal"}>{s.estado === "falta" ? "! Falta" : "→ A cumprir"} · até {s.fim.slice(8)}/{s.fim.slice(5,7)}</Prazo>;
}
export function SemanasGerente({ resultado }: { resultado: ReturnType<typeof calcularPremioGerente> }) {
  return <>
    {resultado.perdido && <Aviso tom="alerta" titulo="Os 100 pontos de check-ins do mês já foram perdidos" texto="Uma semana terminou sem o check-in em um dos stands. Os pontos dos parceiros continuam valendo." />}
    <p>A semana pertence ao mês da segunda-feira, inclusive quando termina no mês seguinte.</p>
    {[...new Set(resultado.semanas.map(s => s.stand_id))].map(id => <Cartao id={`stand-${id}`} key={id} titulo={resultado.semanas.find(s => s.stand_id === id)!.nome}>
      <div className="grid gap-3">{resultado.semanas.filter(s => s.stand_id === id).map(s => <div key={s.semana} className="flex flex-wrap justify-between gap-2"><span>{s.semana.slice(8)}/{s.semana.slice(5,7)} a {s.fim.slice(8)}/{s.fim.slice(5,7)}</span><EstadoSemana s={s} perdido={resultado.perdido} /></div>)}</div>
    </Cartao>)}
    {!resultado.semanas.length && <p>Sem obrigação de check-in neste mês. A pontuação de check-ins é zero.</p>}
    <p className="mb-campo__ajuda">Inclusão e retirada de stand valem a partir da segunda-feira seguinte. A semana atual e o histórico são preservados.</p>
  </>;
}

export function PontosGerente() {
  const eu = usePerfil();
  const [mes, setMes] = useState<Mes>(mesAtual());
  const [aberto, setAberto] = useState(false); const origem = useRef<HTMLButtonElement>(null);
  const [fechado, setFechado] = useState<FechamentoGerente | null>(null);
  const [erroFechado, setErroFechado] = useState(false);
  const { ini } = limitesDoMes(mes.ano, mes.mes); const r = usePontosGerente(ini);
  const lib = mesDeLiberacao(mes.ano, mes.mes);
  const anterior = new Date(mes.ano, mes.mes - 1, 1); const mesAnterior = limitesDoMes(anterior.getFullYear(), anterior.getMonth()).ini;
  useEffect(() => {
    let vivo = true; setFechado(null); setErroFechado(false);
    db().from("fechamentos_premio_gerente").select("*").eq("mes", mesAnterior).eq("gerente_id", eu.id).maybeSingle().then(({ data, error }) => {
      if (vivo) { setErroFechado(!!error); setFechado(data as FechamentoGerente | null); }
    });
    return () => { vivo = false; };
  }, [mesAnterior, eu.id]);
  if (r.erro) return <ErroPrograma tentar={r.recarregar} />;
  if (!r.dados) return <CarregandoLeads texto="Carregando seus pontos…" quantidade={2} />;
  const calc = calcularPremioGerente(r.dados.parceiros, r.dados.stands, r.dados.checkins, mes.ano, mes.mes, diaIso(new Date()));
  const faltas = calc.semanas.filter(s => s.estado === "falta");
  return <div className="pagina-alicerce">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><p className="mb-sobrelinha">Programa · gerente</p><h1 className="titulo-tela">Meus pontos</h1></div></header>
    <MesPrograma valor={mes} onMudar={setMes} />
    {!r.dados.parcerias_instaladas && <Aviso tom="alerta" titulo="Cadastros de parceiros indisponíveis" texto="Peça ao gerente geral para concluir a configuração. Os pontos dos parceiros ainda não podem ser conferidos." />}
    <Meta rotulo="Prêmio previsto" valor={<ValorMeta valor={calc.premio} />} feitoPct={calc.pontos / 2} descricaoAria={`${calc.pontos} de 200 pontos garantidos`} legenda={[`${calc.pontos} de 200 pontos garantidos`, "Máximo R$ 2.000,00"]} />
    <p>Dinheiro de uso livre · liberação em {MESES[lib.mes].toLowerCase()} de {lib.ano}, após o fechamento.</p>
    {!calc.perdido && !calc.completo && calc.semanas.length > 0 && <p>Mais R$ 1.000,00 se completar todos os check-ins. Com eles: {formatarReais(calc.premioPossivel)}.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Cartao id="p-parceiros" titulo="Parceiros novos" descricao="Contam automaticamente, sem aprovação"><div className="grid gap-3"><p className="mb-meta__valor">{calc.pontosParceiros} pontos</p><p>{calc.parceiros} de 20 parceiros</p><p className="mb-campo__ajuda">5 pontos cada · só os cadastrados por você neste mês. Reativados ou recebidos pela roleta não contam.</p></div></Cartao>
      <Cartao id="p-checkins" titulo="Check-ins nos plantões" descricao="1 por semana em cada stand definido para você"><div className="grid gap-3"><p className="mb-meta__valor">{calc.pontosCheckins} pontos{!calc.perdido && !calc.completo && calc.semanas.length > 0 ? " · 100 condicionados" : ""}</p>
        {calc.perdido ? <p>✕ Os 100 pontos do mês foram perdidos. Os parceiros continuam valendo.</p> : !calc.semanas.length ? <p>Sem stand neste mês: zero pontos de check-in.</p> : calc.completo ? <p>✓ Todos os check-ins do mês foram feitos.</p> : <p>Os 100 pontos só entram quando todas as semanas estiverem completas.</p>}
        {faltas.map(s => <p key={s.stand_id}><strong>{s.nome}</strong> · <EstadoSemana s={s} perdido={calc.perdido} /></p>)}
        <div className="flex flex-wrap gap-2">{r.dados.stands.length > 0 && <Link className="mb-botao mb-botao--primario" href="/checkin-gerente/">Fazer check-in</Link>}<button ref={origem} className="mb-botao mb-botao--secundario" onClick={() => setAberto(true)}>Ver semanas</button></div></div></Cartao>
    </div>
    <p className="mb-campo__ajuda">1 ponto = R$ 10,00 · sem mínimo. Os stands são definidos pelo gerente geral.</p>
    {erroFechado && <Aviso tom="alerta" titulo="Não foi possível conferir o prêmio liberado" texto="Atualize a página para tentar de novo." />}
    {fechado && <Cartao id="p-liberado" titulo={`Prêmio de ${MESES[anterior.getMonth()].toLowerCase()}, liberado neste mês`}><p className="mb-meta__valor">{formatarReais(Number(fechado.premio))}</p></Cartao>}
    <PainelLateral aberto={aberto} onFechar={() => setAberto(false)} foco={() => origem.current} titulo="Conferir check-ins" descricao={`${MESES[mes.mes]} de ${mes.ano}`}><div className="mb-lateral__corpo"><SemanasGerente resultado={calc} /></div></PainelLateral>
  </div>;
}
