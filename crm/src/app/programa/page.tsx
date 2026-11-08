"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cartao } from "@/components/alicerce/cartao";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { ErroPrograma, MesPrograma, moedaPrograma as formatarReais } from "@/components/programa/pecas";
import { Casca } from "@/components/casca";
import { GerentesPrograma } from "@/components/programa/gerentes-programa";
import { ConfirmarFechamento } from "@/components/programa/confirmar-fechamento";
import { MESES, mesAtual, type Mes } from "@/components/programa/partes";
import { db } from "@/lib/supabase";
import { COLUNAS_FAIXA, faixasDoMes, type Faixa } from "@/lib/faixas";
import { useVendas } from "@/lib/vendas-dados";
import { limitesDoMes, mesDeLiberacao, REGRAS, resumoDoMes, type Criterio } from "@/lib/programa";
import {
  fecharMes,
  salvarCriterio,
  useCriterios,
  useFechamentos,
  useLancamentos,
} from "@/lib/programa-dados";

/**
 * Resumo do mês do programa, só do gerente geral: pontos, verba prevista, vendas e premiação por corretor, o
 * fechamento do mês e os critérios.
 */
export default function ProgramaPage() {
  return (
    <Casca titulo="Pontos e verba" soGerenteGeral migrada>
      <Programa />
    </Casca>
  );
}

type Corretor = { id: string; nome: string; ativo: boolean };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function Programa() {
  const [mes, setMes] = useState<Mes>(mesAtual());
  const { ini, fim } = limitesDoMes(mes.ano, mes.mes);
  const { criterios, erro: erroCriterios, recarregar: recarregarCriterios } = useCriterios();
  const { lancamentos, erro: erroLanc } = useLancamentos(ini, fim);
  const { vendas, erro: erroVendas } = useVendas(ini, fim);
  const { fechamentos, erro: erroFechamentos, recarregar: recarregarFech } = useFechamentos(ini);
  const [corretores, setCorretores] = useState<Corretor[] | null>(null);
  const [erroAuxiliar, setErroAuxiliar] = useState<string | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    db()
      .from("profiles")
      .select("id, nome, ativo")
      .eq("perfil", "corretor")
      .order("nome")
      .then(({ data, error }) => error ? setErroAuxiliar("Não foi possível carregar os corretores. Tente de novo.") : setCorretores((data ?? []) as Corretor[]));
    db()
      .from("faixas_vgv")
      .select(COLUNAS_FAIXA)
      .then(({ data, error }) => error ? setErroAuxiliar("Não foi possível carregar as faixas. Tente de novo.") : setFaixas((data ?? []) as Faixa[]));
  }, []);

  const lib = mesDeLiberacao(mes.ano, mes.mes);
  const linhas = useMemo(() => {
    if (!criterios || !lancamentos || !vendas || !corretores) return null;
    // Ativos, e os inativos que tiveram lançamento ou venda no mês.
    const ids = corretores
      .filter((c) => c.ativo || lancamentos.some((l) => l.corretor_id === c.id) || vendas.some((v) => v.corretor_id === c.id))
      .map((c) => c.id);
    const premios = faixasDoMes(vendas, faixas, mes.ano, mes.mes);
    return resumoDoMes(ids, lancamentos, vendas, criterios, mes.ano, mes.mes)
      .map((r) => ({ ...r, premio: Number(premios.get(r.corretor)?.faixa?.valor ?? 0) }))
      .sort((a, b) => b.verba.verba - a.verba.verba || b.pontos - a.pontos);
  }, [criterios, lancamentos, vendas, corretores, faixas, mes.ano, mes.mes]);
  const nome = new Map((corretores ?? []).map((c) => [c.id, c.nome]));
  const pendentes = (lancamentos ?? []).filter((l) => l.status === "pendente").length;
  const totalVerba = (linhas ?? []).reduce((s, l) => s + l.verba.verba, 0);
  const totalPremio = (linhas ?? []).reduce((s, l) => s + l.premio, 0);
  const fechado = fechamentos?.length ? fechamentos.reduce((a, f) => (f.fechado_em > a ? f.fechado_em : a), "") : null;
  const mudouDesde =
    !!fechamentos?.length &&
    !!linhas &&
    linhas.some((l) => {
      const f = fechamentos.find((x) => x.corretor_id === l.corretor);
      return !f || f.pontos !== l.pontos || Number(f.verba) !== l.verba.verba || Number(f.premio) !== l.premio;
    });
  const hojeMes = mesAtual();
  const mesFuturo = mes.ano * 12 + mes.mes > hojeMes.ano * 12 + hojeMes.mes;

  async function fechar() {
    if (!linhas) return "Aguarde os dados do mês.";
    setMsg(null);
    const e = await fecharMes(
      linhas.map((l) => ({
        mes: ini,
        corretor_id: l.corretor,
        pontos: l.pontos,
        pontos_validos: l.verba.pontosValidos,
        vendas: l.vendas,
        vgv: l.vgv,
        verba: l.verba.verba,
        premio: l.premio,
      })), ini,
    );
    setMsg(e ? { ok: false, texto: e } : { ok: true, texto: `Mês fechado. A verba e o prêmio são liberados em ${MESES[lib.mes].toLowerCase()} de ${lib.ano}.` });
    recarregarFech();
    return e;
  }

  const erro = erroCriterios ?? erroLanc ?? erroVendas ?? erroFechamentos ?? erroAuxiliar;

  return <div className="pagina-alicerce programa-pilha">
    <header className="mb-cabecalho">
      <div className="mb-cabecalho__texto">
        <p className="mb-sobrelinha">Programa de pontos</p>
        <h1 className="titulo-tela">Pontos e verba</h1>
      </div>
      <Link className="mb-botao mb-botao--secundario" href="/programa/aprovacao/">Aprovar lançamentos{pendentes ? ` (${pendentes})` : ""}</Link>
    </header>
    <p>Os corretores veem os próprios pontos, a verba e o ranking. Gerentes e recepção veem o plantão e a roleta.</p>
    <nav aria-label="Telas do programa" className="flex flex-wrap gap-3">
      <Link className="mb-botao mb-botao--discreto" href="/plantao/">Plantão e roleta</Link>
      <Link className="mb-botao mb-botao--discreto" href="/ranking/">Ranking</Link>
      <Link className="mb-botao mb-botao--discreto" href="/faixas/">Faixas de VGV</Link>
    </nav>
    <MesPrograma valor={mes} onMudar={setMes} permitirFuturo />
    <GerentesPrograma mes={mes} />
    {erro ? <ErroPrograma tentar={() => { recarregarCriterios(); location.reload(); }} /> : !linhas ? <CarregandoLeads texto="Carregando os pontos…" /> : <>
      <Cartao id="t-resumo" titulo="Pontos dos corretores" descricao={`Liberação em ${MESES[lib.mes]} de ${lib.ano}`}>
        {linhas.length ? <div className="mb-tabela-envoltorio" tabIndex={0} role="region" aria-label="Pontos, verba e prêmio por corretor. Role para ver as colunas.">
          <table className="mb-tabela mb-tabela--numeros mb-tabela--primeira-fixa">
            <thead>
              <tr>
                <th scope="col">Corretor</th>
                <th scope="col">Pontos</th>
                <th scope="col">Vendas pagas</th>
                <th scope="col">Verba</th>
                <th scope="col">Prêmio</th>
              </tr>
            </thead>
            <tbody>{linhas.map(l => <tr key={l.corretor}>
              <td>{nome.get(l.corretor) ?? "Corretor"}<small className="mb-tabela__secundario">{plural(l.contagens.periodo, "período", "períodos")} · {plural(l.contagens.video, "ação", "ações")} · {plural(l.contagens.visita, "visita", "visitas")}{l.pendentes > 0 && ` · ${plural(l.pendentes, "pendente", "pendentes")}`}</small>
              </td>
              <td className="mb-tabela__num">{l.pontos}{l.verba.pontosValidos > 0 && l.verba.pontosValidos < l.pontos && <small className="mb-tabela__secundario">Vale {l.verba.pontosValidos}</small>}</td>
              <td className="mb-tabela__num">{l.vendas}</td>
              <td className="mb-tabela__num">{formatarReais(l.verba.verba)}{l.verba.situacao === "abaixo_do_minimo" && <small className="mb-tabela__secundario">Faltam {l.verba.faltamParaMinimo} pontos</small>}</td>
              <td className="mb-tabela__num">{formatarReais(l.premio)}</td>
            </tr>)}</tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td />
                <td />
                <td className="mb-tabela__num">{formatarReais(totalVerba)}</td>
                <td className="mb-tabela__num">{formatarReais(totalPremio)}</td>
              </tr>
            </tfoot>
          </table>
        </div> : <EstadoVazio titulo="Nenhum corretor ativo" texto="Os corretores com lançamentos ou vendas no mês também aparecem aqui." />}
        <p className="mb-campo__ajuda">Só contam os lançamentos aprovados, com o limite de cada critério, e as vendas assinadas e pagas no mês da assinatura. Mínimo de {REGRAS.minimo} pontos; sem trava em 200, até a soma dos máximos dos critérios; cada venda soma {formatarReais(REGRAS.porVenda)}.</p>
      </Cartao>
      <Cartao id="fechamento-programa" titulo="Fechamento do mês">
        <div className="grid gap-3">
          {fechado ? <Aviso tom={mudouDesde ? "alerta" : "sucesso"} titulo={`Fechado em ${new Date(fechado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`} texto={mudouDesde ? "Os números mudaram depois disso. Feche de novo para atualizar." : "A foto do cálculo está guardada para liberação no mês seguinte."} /> : <p>Feche depois de aprovar os lançamentos do mês. A foto do cálculo fica guardada e o corretor vê a verba liberada no mês seguinte.{pendentes > 0 && ` Ainda há ${plural(pendentes, "pendente", "pendentes")}.`}</p>}
          {mesFuturo && <Aviso tom="info" titulo="Este mês ainda não começou" texto="O fechamento fica disponível no mês de referência." />}
          <div>
            <ConfirmarFechamento rotulo={fechado ? "Fechar de novo" : `Fechar ${MESES[mes.mes]}`} disabled={mesFuturo} confirmar={fechar} />
          </div>
          {msg && <Aviso tom={msg.ok ? "sucesso" : "erro"} titulo={msg.texto} />}
        </div>
      </Cartao>
    </>}
    {criterios && <EditarCriterios criterios={criterios} onMudou={recarregarCriterios} />}
  </div>;
}

function EditarCriterios({ criterios, onMudou }: { criterios: Criterio[]; onMudou: () => void }) {
  return <Cartao id="t-criterios" titulo="Critérios">
    <div className="grid gap-4">{criterios.map(c => <LinhaCriterio key={c.slug} criterio={c} onMudou={onMudou} />)}</div>
  </Cartao>;
}

function LinhaCriterio({ criterio, onMudou }: { criterio: Criterio; onMudou: () => void }) {
  const [aberto, setAberto] = useState(false);
  const origem = useRef<HTMLButtonElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nome, setNome] = useState(criterio.nome);
  const [pontos, setPontos] = useState(String(criterio.pontos));
  const [limite, setLimite] = useState(String(criterio.limite_mes));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const p = Number(pontos);
  const lim = Number(limite);
  async function salvar() {
    if (!nome.trim()) return setMsg({ ok: false, texto: "Preencha o nome." });
    if (!Number.isInteger(p) || p < 0 || p > 1000 || !Number.isInteger(lim) || lim < 0 || lim > 1000)
      return setMsg({ ok: false, texto: "Pontos e limite: números inteiros de 0 a 1.000." });
    setOcupado(true);
    const e = await salvarCriterio(criterio.slug, { nome: nome.trim(), pontos: p, limite_mes: lim });
    setOcupado(false);
    setMsg(e ? { ok: false, texto: e } : { ok: true, texto: "Salvo" });
    if (!e) { onMudou(); setAberto(false); }
  }
  const id = criterio.slug;
  return <div className="programa-criterio flex flex-wrap items-center justify-between gap-3">
    <div>
      <strong>{criterio.nome}</strong>
      <p className="mb-campo__ajuda">{criterio.pontos} pontos cada · limite de {criterio.limite_mes} no mês · máximo de {criterio.pontos * criterio.limite_mes} pontos</p>
    </div>
    <button ref={origem} className="mb-botao mb-botao--secundario" onClick={() => { setNome(criterio.nome); setPontos(String(criterio.pontos)); setLimite(String(criterio.limite_mes)); setMsg(null); setAberto(true); }}>Editar critério</button>
    <PainelLateral aberto={aberto} onFechar={() => !ocupado && setAberto(false)} titulo="Editar critério" descricao={criterio.nome} foco={() => origem.current} rodape={<div className="mb-lateral__rodape">
      <button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={() => setAberto(false)}>Cancelar</button>
      <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void salvar()}>{ocupado ? "Salvando…" : "Salvar critério"}</button>
    </div>}>
      <div className="mb-lateral__corpo">
        <Campo rotulo="Critério" obrigatorio>
          <input id={`nome-${id}`} className="mb-campo__entrada" value={nome} onChange={e => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Pontos">
          <input className="mb-campo__entrada" inputMode="numeric" value={pontos} onChange={e => setPontos(e.target.value)} />
        </Campo>
        <Campo rotulo="Limite no mês">
          <input className="mb-campo__entrada" inputMode="numeric" value={limite} onChange={e => setLimite(e.target.value)} />
        </Campo>
        <div className="mb-campo mb-campo--calculado">
          <label className="mb-campo__rotulo" htmlFor={`maximo-${id}`}>Máximo de pontos · calculado</label>
          <input id={`maximo-${id}`} className="mb-campo__entrada" readOnly value={Number.isFinite(p * lim) ? p * lim : "–"} />
        </div>
        {msg && <Aviso tom={msg.ok ? "sucesso" : "erro"} titulo={msg.texto} />}
      </div>
    </PainelLateral>
  </div>;
}
