"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { MESES, mesAtual, NavMes, type Mes } from "@/components/programa/partes";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { COLUNAS_FAIXA, faixasDoMes, type Faixa } from "@/lib/faixas";
import { formatarReais } from "@/lib/vendas";
import { useVendas } from "@/lib/vendas-dados";
import { chaveMes, ehPrimeiroMes, limitesDoMes, mesDeLiberacao, REGRAS, resumoDoMes, type Criterio } from "@/lib/programa";
import {
  fecharMes,
  salvarCriterio,
  salvarInicio,
  useCriterios,
  useEstadoPrograma,
  useFechamentos,
  useLancamentos,
} from "@/lib/programa-dados";

/**
 * Resumo do mês do programa, só do gerente geral (sempre, com a chave ligada
 * ou não): pontos, verba prevista, vendas e premiação por corretor, o
 * fechamento do mês, os critérios e o primeiro mês do programa.
 */
export default function ProgramaPage() {
  return (
    <Casca titulo="Pontos e verba" soGerenteGeral>
      <Programa />
    </Casca>
  );
}

type Corretor = { id: string; nome: string; ativo: boolean };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function Programa() {
  const eu = usePerfil();
  const estado = useEstadoPrograma(eu.id);
  const [mes, setMes] = useState<Mes>(mesAtual());
  const { ini, fim } = limitesDoMes(mes.ano, mes.mes);
  const { criterios, erro: erroCriterios, recarregar: recarregarCriterios } = useCriterios();
  const { lancamentos, erro: erroLanc } = useLancamentos(ini, fim);
  const { vendas, erro: erroVendas } = useVendas(ini, fim);
  const { fechamentos, recarregar: recarregarFech } = useFechamentos(ini);
  const [corretores, setCorretores] = useState<Corretor[] | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    db()
      .from("profiles")
      .select("id, nome, ativo")
      .eq("perfil", "corretor")
      .order("nome")
      .then(({ data }) => setCorretores((data ?? []) as Corretor[]));
    db()
      .from("faixas_vgv")
      .select(COLUNAS_FAIXA)
      .then(({ data }) => setFaixas((data ?? []) as Faixa[]));
  }, []);

  const primeiro = ehPrimeiroMes(estado.inicio, mes.ano, mes.mes);
  const lib = mesDeLiberacao(mes.ano, mes.mes);
  const linhas = useMemo(() => {
    if (!criterios || !lancamentos || !vendas || !corretores) return null;
    // Ativos, e os inativos que tiveram lançamento ou venda no mês.
    const ids = corretores
      .filter((c) => c.ativo || lancamentos.some((l) => l.corretor_id === c.id) || vendas.some((v) => v.corretor_id === c.id))
      .map((c) => c.id);
    const premios = faixasDoMes(vendas, faixas, mes.ano, mes.mes);
    return resumoDoMes(ids, lancamentos, vendas, criterios, mes.ano, mes.mes, primeiro)
      .map((r) => ({ ...r, premio: Number(premios.get(r.corretor)?.faixa?.valor ?? 0) }))
      .sort((a, b) => b.verba.verba - a.verba.verba || b.pontos - a.pontos);
  }, [criterios, lancamentos, vendas, corretores, faixas, mes.ano, mes.mes, primeiro]);
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
    if (!linhas) return;
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
        primeiro_mes: primeiro,
      })),
    );
    setMsg(e ? { ok: false, texto: e } : { ok: true, texto: `Mês fechado. A verba e o prêmio são liberados em ${MESES[lib.mes].toLowerCase()} de ${lib.ano}.` });
    recarregarFech();
  }

  const erro = erroCriterios ?? erroLanc ?? erroVendas;

  return (
    <div className="grid gap-5">
      <section className="card bar-brand grid gap-2">
        <p className="eyebrow">Programa de verba {estado.ativo ? "· ligado" : "· desligado"}</p>
        <p className="text-ink-soft">
          {estado.ativo
            ? "Os corretores veem os próprios pontos, a verba e o ranking. Gerentes e recepção veem o plantão e a roleta."
            : "Só você vê estas telas e estes dados. Ligue a chave em Configurações depois da reunião de novembro."}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          <Link href="/programa/aprovacao/" className="link-acao focus-ring">
            Aprovar lançamentos{pendentes ? ` (${pendentes} pendente${pendentes > 1 ? "s" : ""} no mês)` : ""}
          </Link>
          <Link href="/plantao/" className="link-acao focus-ring">
            Plantão e roleta
          </Link>
          <Link href="/ranking/" className="link-acao focus-ring">
            Ranking
          </Link>
          <Link href="/faixas/" className="link-acao focus-ring">
            Faixas de VGV
          </Link>
        </p>
      </section>

      <NavMes valor={mes} onMudar={setMes} />

      {erro && <p className="aviso-erro">! {erro}</p>}
      {!linhas && !erro && <p className="text-concrete">Carregando…</p>}
      {linhas && (
        <section aria-labelledby="t-resumo" className="grid min-w-0 gap-3">
          <h2 id="t-resumo" className="eyebrow">
            Por corretor · liberação em {MESES[lib.mes].toLowerCase()} de {lib.ano}
            {primeiro && " · primeiro mês: R$ 1.000 fixos"}
          </h2>
          {linhas.length ? (
            <ul className="card lista-painel grid p-0">
              {linhas.map((l) => (
                <li key={l.corretor} className="grid gap-1 border-b border-line px-4 py-3 md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{nome.get(l.corretor) ?? "Corretor"}</p>
                    <p className="num text-[13px] text-ink-soft">
                      {plural(l.contagens.periodo, "período", "períodos")} · {plural(l.contagens.video, "vídeo", "vídeos")} ·{" "}
                      {plural(l.contagens.visita, "visita", "visitas")}
                      {l.pendentes > 0 && ` · ${plural(l.pendentes, "pendente", "pendentes")}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:justify-end md:text-right">
                    <span className={clsx("num text-[14px]", l.pontos < REGRAS.minimo && !primeiro && "text-ink-soft")}>
                      <span className="font-display text-[18px] font-bold text-ink">{l.pontos}</span> pontos
                      {l.verba.pontosValidos > 0 && l.verba.pontosValidos < l.pontos && ` (vale ${l.verba.pontosValidos})`}
                    </span>
                    <span className="num text-[14px] text-ink-soft">{l.vendas ? plural(l.vendas, "venda paga", "vendas pagas") : "sem venda paga"}</span>
                    <span className="num whitespace-nowrap text-[14px]">
                      Verba <span className="font-display text-[18px] font-bold">{l.verba.verba ? formatarReais(l.verba.verba) : "–"}</span>
                      {l.verba.situacao === "abaixo_do_minimo" && <span className="text-ink-soft"> · faltam {l.verba.faltamParaMinimo}</span>}
                    </span>
                    {l.premio > 0 && <span className="num whitespace-nowrap text-[14px]">Prêmio {formatarReais(l.premio)}</span>}
                  </div>
                </li>
              ))}
              <li className="flex flex-wrap justify-between gap-2 px-4 py-3 font-semibold">
                <span>Total</span>
                <span className="num">
                  Verba {formatarReais(totalVerba)} · Prêmio {formatarReais(totalPremio)}
                </span>
              </li>
            </ul>
          ) : (
            <div className="card">
              <p className="text-ink-soft">Nenhum corretor ativo.</p>
            </div>
          )}
          <p className="text-[13px] text-ink-soft">
            Só contam os lançamentos aprovados, com o limite de cada critério, e as vendas assinadas e pagas no mês da assinatura. Mínimo de{" "}
            {REGRAS.minimo} pontos; teto de {REGRAS.tetoSemVenda} sem venda e {REGRAS.tetoComVenda} com venda; cada venda soma{" "}
            {formatarReais(REGRAS.porVenda)}.
          </p>

          <div className="card grid gap-3">
            <h3 className="titulo-card">Fechamento do mês</h3>
            {fechado ? (
              <p className={clsx("text-[14px]", mudouDesde ? "font-semibold text-brand" : "text-ink-soft")}>
                {mudouDesde ? "! " : "✓ "}Fechado em {new Date(fechado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
                {mudouDesde && " Os números mudaram depois disso. Feche de novo para atualizar."}
              </p>
            ) : (
              <p className="text-[14px] text-ink-soft">
                Feche depois de aprovar os lançamentos do mês. A foto do cálculo fica guardada e o corretor vê a verba liberada no mês seguinte.
                {pendentes > 0 && ` Ainda há ${pendentes} pendente${pendentes > 1 ? "s" : ""}.`}
              </p>
            )}
            <button type="button" className="btn btn-red btn-lg focus-ring justify-self-start" disabled={mesFuturo || !linhas.length} onClick={fechar}>
              {fechado ? "Fechar de novo" : `Fechar ${MESES[mes.mes].toLowerCase()}`}
            </button>
            {msg && <p className={msg.ok ? "aviso-ok" : "aviso-erro"}>{msg.ok ? "✓" : "!"} {msg.texto}</p>}
          </div>
        </section>
      )}

      <PrimeiroMes inicio={estado.inicio} onMudou={estado.recarregar} />
      {criterios && <EditarCriterios criterios={criterios} onMudou={recarregarCriterios} />}
    </div>
  );
}

function PrimeiroMes({ inicio, onMudou }: { inicio: string | null; onMudou: () => void }) {
  const [valor, setValor] = useState(inicio ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => setValor(inicio ?? ""), [inicio]);
  async function salvar() {
    const v = valor.trim();
    if (v && !/^\d{4}-\d{2}$/.test(v)) return setMsg({ ok: false, texto: "Escolha o mês." });
    const e = await salvarInicio(v || null);
    setMsg(e ? { ok: false, texto: e } : { ok: true, texto: "Salvo" });
    if (!e) onMudou();
  }
  const hoje = mesAtual();
  return (
    <section className="card grid gap-3" aria-labelledby="t-inicio">
      <h2 id="t-inicio" className="titulo-card">
        Primeiro mês do programa
      </h2>
      <p className="text-[14px] text-ink-soft">No primeiro mês, cada corretor recebe {formatarReais(REGRAS.primeiroMes)} fixos, sem pontuação.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label" htmlFor="inicio-mes">
            Mês
          </label>
          <input id="inicio-mes" type="month" className="input num" min={chaveMes(hoje.ano, hoje.mes)} value={valor} onChange={(e) => (setValor(e.target.value), setMsg(null))} />
        </div>
        <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={salvar}>
          Salvar
        </button>
      </div>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-erro"}>{msg.ok ? "✓" : "!"} {msg.texto}</p>}
    </section>
  );
}

function EditarCriterios({ criterios, onMudou }: { criterios: Criterio[]; onMudou: () => void }) {
  return (
    <section className="card grid gap-4" aria-labelledby="t-criterios">
      <h2 id="t-criterios" className="titulo-card">
        Critérios
      </h2>
      <ul className="grid gap-4">
        {criterios.map((c) => (
          <li key={c.slug} className="border-b border-line pb-4 last:border-0 last:pb-0">
            <LinhaCriterio criterio={c} onMudou={onMudou} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinhaCriterio({ criterio, onMudou }: { criterio: Criterio; onMudou: () => void }) {
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
    const e = await salvarCriterio(criterio.slug, { nome: nome.trim(), pontos: p, limite_mes: lim });
    setMsg(e ? { ok: false, texto: e } : { ok: true, texto: "Salvo" });
    if (!e) onMudou();
  }
  const id = criterio.slug;
  return (
    <div className="grid gap-3">
      <div>
        <label className="field-label" htmlFor={`nome-${id}`}>
          Critério
        </label>
        <input id={`nome-${id}`} className="input" value={nome} onChange={(e) => (setNome(e.target.value), setMsg(null))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label" htmlFor={`pontos-${id}`}>
            Pontos
          </label>
          <input id={`pontos-${id}`} className="input num" inputMode="numeric" value={pontos} onChange={(e) => (setPontos(e.target.value), setMsg(null))} />
        </div>
        <div>
          <label className="field-label" htmlFor={`limite-${id}`}>
            Limite no mês
          </label>
          <input id={`limite-${id}`} className="input num" inputMode="numeric" value={limite} onChange={(e) => (setLimite(e.target.value), setMsg(null))} />
        </div>
        <div>
          <p className="field-label">Máximo</p>
          <p className="num py-3 font-semibold">{Number.isFinite(p * lim) ? p * lim : "–"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost focus-ring" onClick={salvar}>
          Salvar
        </button>
        {msg && <span className={msg.ok ? "aviso-ok" : "aviso-erro"}>{msg.ok ? "✓" : "!"} {msg.texto}</span>}
      </div>
    </div>
  );
}
