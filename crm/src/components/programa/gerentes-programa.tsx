"use client";
import { useEffect, useRef, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { CampoSelecao } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { useToast } from "@/components/alicerce/toast";
import { useGerentesPrograma, definirStandGerente } from "@/lib/programa-dados";
import { calcularPremioGerente, limitesDoMes } from "@/lib/programa";
import { db } from "@/lib/supabase";
import { diaIso } from "@/lib/vendas";
import { moedaPrograma as formatarReais } from "@/components/programa/pecas";
import { ErroPrograma } from "./pecas";
import { SemanasGerente } from "./pontos-gerente";
import type { Mes } from "./partes";

export function GerentesPrograma({ mes }: { mes: Mes }) {
  const { ini } = limitesDoMes(mes.ano, mes.mes); const r = useGerentesPrograma(ini); const toast = useToast();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [stands, setStands] = useState<{ id: string; nome: string }[]>([]);
  const [stand, setStand] = useState(""); const [erro, setErro] = useState<string | null>(null); const [ocupado, setOcupado] = useState(false);
  const origem = useRef<HTMLElement | null>(null);
  useEffect(() => { let vivo = true; db().from("plantoes").select("id,nome").eq("ativo", true).order("nome").then(({ data, error }) => {
    if (vivo) { setStands(data || []); if (error) setErro("Não foi possível carregar os stands. Confira a configuração do plantão."); }
  }); return () => { vivo = false; }; }, []);
  if (r.erro) return <ErroPrograma tentar={r.recarregar} />;
  if (!r.dados) return <CarregandoLeads quantidade={2} texto="Carregando os gerentes…" />;
  const g = r.dados.find(g => g.id === selecionado);
  const calc = g ? calcularPremioGerente(g.dados.parceiros, g.dados.stands, g.dados.checkins, mes.ano, mes.mes, diaIso(new Date())) : null;
  async function definir(id: string, ativo: boolean) {
    if (!g || ocupado) return;
    setOcupado(true); setErro(null);
    const e = await definirStandGerente(g.id, id, ativo); setOcupado(false);
    if (e) setErro(e); else { r.recarregar(); toast.mostrar("Stand atualizado. A mudança vale na segunda-feira seguinte.", { tipo: "sucesso" }); }
  }
  return <section className="grid gap-4" aria-labelledby="gerentes-programa"><h2 id="gerentes-programa" className="titulo-secao">Prêmio dos gerentes</h2>
    <p>Dinheiro de uso livre · até R$ 2.000,00 · liberação no mês seguinte, após o fechamento.</p>
    <div className="grid gap-4 lg:grid-cols-2">{r.dados.map(g => {
      const c = calcularPremioGerente(g.dados.parceiros, g.dados.stands, g.dados.checkins, mes.ano, mes.mes, diaIso(new Date()));
      const feitos = c.semanas.filter(s => s.estado === "feito").length;
      return <Cartao key={g.id} id={`gerente-${g.id}`} titulo={g.nome}><div className="grid gap-3"><p className="mb-meta__valor">{formatarReais(c.premio)}</p><p>{c.pontos} pontos · {c.parceiros} de 20 parceiros</p><p>{c.perdido ? "✕ Os 100 pontos de check-ins foram perdidos." : c.completo ? "✓ Todos os check-ins feitos." : `${c.semanas.length} check-ins previstos no mês · ${feitos} ${feitos === 1 ? "feito" : "feitos"}`}</p><button className="mb-botao mb-botao--secundario justify-self-start" onClick={e => { origem.current = e.currentTarget; setSelecionado(g.id); setStand(""); }}>Conferir gerente</button></div></Cartao>;
    })}</div>
    {!r.dados.length && <EstadoVazio titulo="Nenhum participante no programa dos gerentes" texto="Confira a permissão de participação nos perfis de acesso." />}
    <PainelLateral aberto={!!g} onFechar={() => !ocupado && setSelecionado(null)} foco={() => origem.current} titulo="Conferir gerente" descricao={g?.nome}><div className="mb-lateral__corpo">
      {g && calc && <>
        <p>{formatarReais(calc.premio)} previstos · {calc.pontos} pontos</p>
        {!g.dados.parcerias_instaladas && <Aviso tom="alerta" titulo="Cadastros de parceiros indisponíveis" texto="Conclua a configuração de Parcerias antes de fechar o mês." />}
        {erro && <Aviso tom="erro" titulo={erro} />}
        <CampoSelecao rotulo="Adicionar stand"><select className="mb-campo__entrada" value={stand} disabled={ocupado} onChange={e => setStand(e.target.value)}><option value="">Escolha um stand</option>{stands.filter(s => !g.dados.stands.some(v => v.stand_id === s.id && !v.fim_semana)).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></CampoSelecao>
        <button className="mb-botao mb-botao--secundario justify-self-start" disabled={!stand || ocupado} onClick={() => void definir(stand, true)}>Definir stand</button>
        <p className="mb-campo__ajuda">Inclusão e retirada valem a partir da próxima segunda. A semana atual e as anteriores são preservadas.</p>
        {g.dados.stands.filter(s => !s.fim_semana).map(s => <div className="flex flex-wrap justify-between gap-3" key={s.id}><span>{s.nome}</span><button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={() => void definir(s.stand_id, false)}>Retirar stand</button></div>)}
        <SemanasGerente resultado={calc} />
      </>}
    </div></PainelLateral>
  </section>;
}
