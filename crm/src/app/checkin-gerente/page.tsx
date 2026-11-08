"use client";
import { useState } from "react";
import Link from "next/link";
import { Casca } from "@/components/casca";
import { Cartao } from "@/components/alicerce/cartao";
import { CampoEmGrupo, CampoSelecao } from "@/components/alicerce/campo";
import { Seletor } from "@/components/alicerce/seletor";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { useToast } from "@/components/alicerce/toast";
import { ErroPrograma } from "@/components/programa/pecas";
import { calcularPremioGerente, limitesDoMes, segundaDaSemana } from "@/lib/programa";
import { usePontosGerente, registrarCheckinGerente } from "@/lib/programa-dados";
import { lerPosicao } from "@/lib/distribuicao-dados";
import { diaIso } from "@/lib/vendas";

export default function CheckinPage() { return <Casca titulo="Check-in nos plantões" exige="pontos_gerente.participar" migrada><Checkin /></Casca>; }
function Checkin() {
  const agora = new Date(); const hoje = diaIso(agora); const semana = segundaDaSemana(hoje);
  // O dia 01/12 pode pertencer à última semana de novembro.
  const ref = new Date(`${semana}T12:00:00Z`);
  const { ini } = limitesDoMes(ref.getUTCFullYear(), ref.getUTCMonth());
  const r = usePontosGerente(ini); const toast = useToast();
  const [stand, setStand] = useState("");
  const [posicao, setPosicao] = useState<{ lat: number; lng: number; precisao: number } | null>(null);
  const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  if (r.erro) return <ErroPrograma tentar={r.recarregar} />;
  if (!r.dados) return <CarregandoLeads texto="Carregando os stands…" />;
  const calc = calcularPremioGerente(r.dados.parceiros, r.dados.stands, r.dados.checkins, ref.getUTCFullYear(), ref.getUTCMonth(), hoje);
  const destaSemana = calc.semanas.filter(s => s.semana === semana);
  const escolhido = stand || destaSemana[0]?.stand_id || "";
  const jaFeito = destaSemana.find(s => s.stand_id === escolhido)?.estado === "feito";
  async function localizar() {
    setOcupado(true); setErro(null); setFeito(false); setPosicao(null);
    const p = await lerPosicao(); setOcupado(false);
    if ("erro" in p) return setErro(p.erro === 1 ? "Localização bloqueada. Permita o acesso nas configurações do navegador e tente de novo." : "Localização imprecisa. Tente num lugar aberto.");
    if (p.precisao > 100) return setErro("Localização imprecisa. Tente num lugar aberto.");
    setPosicao(p);
  }
  async function confirmar() {
    if (!posicao || ocupado) return;
    setOcupado(true); setErro(null);
    const c = await registrarCheckinGerente(escolhido, posicao); setOcupado(false);
    if (c.erro) { setErro(c.erro); setPosicao(null); return; }
    setFeito(true); setPosicao(null); r.recarregar(); toast.mostrar("Check-in registrado.", { tipo: "sucesso" });
  }
  return <div className="pagina-alicerce">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><p className="mb-sobrelinha">Programa · gerente</p><h1 className="titulo-tela">Check-in nos plantões</h1></div></header>
    <Link className="mb-botao mb-botao--discreto justify-self-start" href="/meus-pontos/">← Voltar aos meus pontos</Link>
    <Cartao id="registrar-presenca" titulo="Registrar presença" descricao={`Semana de ${semana.split("-").reverse().join("/")}`}><div className="grid gap-4">
      {!destaSemana.length ? <p>Nenhum stand definido para você nesta semana. Inclusões começam a valer na segunda-feira seguinte.</p> : <>
        {destaSemana.length <= 6 ? <fieldset disabled={ocupado} className="min-w-0"><CampoEmGrupo id="stand-checkin" rotulo="Stand do check-in"><Seletor idRotulo="stand-checkin" grade="linha" valor={escolhido} onChange={v => { setStand(v); setPosicao(null); setErro(null); setFeito(false); }} opcoes={destaSemana.map(s => ({ valor: s.stand_id, rotulo: `${s.nome}${s.estado === "feito" ? " · já feito" : ""}` }))} /></CampoEmGrupo></fieldset> : <CampoSelecao rotulo="Stand do check-in"><select className="mb-campo__entrada" value={escolhido} disabled={ocupado} onChange={e => { setStand(e.target.value); setPosicao(null); setErro(null); setFeito(false); }}>{destaSemana.map(s => <option key={s.stand_id} value={s.stand_id}>{s.nome}{s.estado === "feito" ? " · já feito" : ""}</option>)}</select></CampoSelecao>}
        <p>Use sua localização no celular, dentro do stand. O raio é o mesmo do check-in dos corretores.</p>
        {feito || jaFeito ? <Aviso tom="sucesso" titulo="Check-in desta semana já feito" texto="A presença neste stand foi registrada. Confira os outros stands em Meus pontos." /> : <>
          {posicao && <Aviso titulo="Localização obtida" texto="Confirme o check-in. A presença só é registrada se a localização estiver dentro do raio do stand." />}
          <button className="mb-botao mb-botao--primario justify-self-start" disabled={ocupado} aria-busy={ocupado} onClick={() => void (posicao ? confirmar() : localizar())}>{ocupado ? "Conferindo…" : posicao ? "Confirmar check-in" : "Usar minha localização"}</button>
        </>}
      </>}
      {erro && <Aviso tom="erro" titulo={erro} />}
    </div></Cartao>
    {calc.perdido ? <Aviso tom="alerta" titulo="Os 100 pontos do mês já foram perdidos" texto="Uma semana terminou sem check-in em um dos stands. Os pontos dos parceiros continuam valendo." /> : <Aviso titulo="100 pontos ao completar o mês" texto="Faça um check-in por semana em cada stand definido para você. Uma falta em qualquer semana e stand perde os 100 pontos." />}
  </div>;
}
