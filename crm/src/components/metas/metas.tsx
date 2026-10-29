"use client";

import clsx from "clsx";
import { useCallback, useMemo, useState } from "react";
import { AvisoDesfazer } from "@/components/leads/partes";
import {
  formatarPct,
  intervaloDaMeta,
  MESES_MAX,
  metaAnualDe,
  metaRepetida,
  metrica,
  nomeDaMeta,
  METRICAS,
  numeroDaMetrica,
  PERIODOS_META,
  progressoAnual,
  progressoMeta,
  textoMetaRepetida,
  textoRitmo,
  type Meta,
  type MetaVgv,
  type Metrica,
  type PeriodoMeta,
  type ProgressoAnual,
  type ProgressoMeta,
} from "@/lib/metas";
import { formatarReais, lerReais, type Venda } from "@/lib/vendas";
import { excluirMeta, salvarMeta, useDadosMetas, useMetas, useMetasVgv, useVendasDoAno, type CamposMeta } from "@/lib/vendas-dados";

/** Barra de progresso, como a ProgressBar da Bruna: o número ao lado diz o quanto (nunca só a cor). */
export function Barra({ razao, batida, rotulo }: { razao: number; batida?: boolean; rotulo?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, Number.isFinite(razao) ? razao : 0)) * 100);
  return (
    <div
      className="h-[6px] w-full overflow-hidden rounded-sm bg-line"
      {...(rotulo ? { role: "progressbar", "aria-label": rotulo, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct } : { "aria-hidden": true })}
    >
      <div className={clsx("h-full", batida ? "bg-ok" : "bg-ink")} style={{ width: `${Math.min(100, Math.max(0, razao * 100))}%` }} />
    </div>
  );
}

const ORIGEM_META = {
  corretor: "Meta definida para você pelo gerente geral",
  geral: "Meta geral do ano, definida pelo gerente geral",
  padrao: "Meta padrão do ano",
};

/**
 * Acompanhamento da meta anual de VGV de um corretor: acumulado pago, assinado,
 * quanto falta, % atingido, ritmo por mês até dezembro e projeção.
 */
export function CartaoMetaAnual({
  corretor,
  ano,
  linhas,
  vendas,
  proprio,
  destaque = true,
}: {
  corretor: string;
  ano: number;
  linhas: MetaVgv[];
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[];
  proprio: boolean;
  /** A barra vermelha: uma por área de tela (no painel, o cabeçalho já tem). */
  destaque?: boolean;
}) {
  const meta = metaAnualDe(corretor, ano, linhas);
  const p = progressoAnual(
    meta.valor,
    vendas.filter((v) => v.corretor_id === corretor),
    ano,
    new Date(),
  );
  return (
    <section className={clsx("card", destaque && "bar-brand")} aria-labelledby={`meta-anual-${corretor}`}>
      <h2 id={`meta-anual-${corretor}`} className="eyebrow">
        Meta anual de VGV · <span className="num">{ano}</span>
      </h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="num font-display text-[30px] font-extrabold leading-none">{formatarReais(Math.floor(p.acumulado))}</span>
        <span className="num text-ink-soft">de {formatarReais(p.meta)}</span>
      </p>
      <div className="mt-3">
        <Barra razao={p.razao} batida={p.batida} rotulo={`Meta anual de VGV: ${formatarPct(p.razao)}`} />
      </div>
      <p className={clsx("num mt-2 text-[15px] font-semibold", p.batida && "text-ok")}>
        {p.batida ? "✓ Meta batida · " : ""}
        {formatarPct(p.razao)} atingido
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] md:grid-cols-4">
        <Dado rotulo="Assinado e pago" valor={formatarReais(Math.floor(p.acumulado))} />
        <Dado rotulo="Assinado, com pendentes" valor={formatarReais(Math.floor(p.assinado))} />
        <Dado rotulo="Falta" valor={p.batida ? "–" : formatarReais(Math.ceil(p.falta))} />
        <Dado
          rotulo="Ritmo necessário"
          valor={p.ritmoMensal !== null ? formatarReais(Math.ceil(p.ritmoMensal)) : "–"}
          nota={p.ritmoMensal !== null ? textoMeses(p) : undefined}
        />
        <Dado
          rotulo="Projeção no ritmo atual"
          valor={p.projecao !== null ? formatarReais(Math.round(p.projecao)) : "–"}
          nota={p.projecao === null ? (p.acumulado > 0 ? "Aparece a partir de abril" : "Depois da primeira venda paga") : p.encerrado ? "Ano encerrado" : `Fecha ${ano} com isso`}
        />
      </dl>
      <p className="mt-3 text-[12px] text-concrete">
        {proprio ? ORIGEM_META[meta.origem] : ORIGEM_META[meta.origem].replace(" para você", "")}. Conta o VGV das vendas
        assinadas e pagas, no mês da assinatura.
      </p>
    </section>
  );
}

const textoMeses = (p: ProgressoAnual) =>
  p.mesesRestantes === 1 ? "Por mês: só dezembro pela frente" : `Por mês, nos ${p.mesesRestantes} meses até dezembro, com este`;

function Dado({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-concrete">{rotulo}</dt>
      <dd className="num mt-1 font-display text-[16px] font-bold">{valor}</dd>
      {nota && <dd className="text-[12px] text-ink-soft">{nota}</dd>}
    </div>
  );
}

/** Meta anual de cada corretor da equipe, com a linha Equipe. */
export function TabelaMetaAnual({
  corretores,
  nomes,
  ano,
  linhas,
  vendas,
  abrir,
}: {
  corretores: string[];
  nomes: Map<string, string>;
  ano: number;
  linhas: MetaVgv[];
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[];
  abrir?: (id: string) => void;
}) {
  const agora = new Date();
  const ps = corretores.map((c) => ({
    c,
    p: progressoAnual(metaAnualDe(c, ano, linhas).valor, vendas.filter((v) => v.corretor_id === c), ano, agora),
  }));
  const somaMeta = ps.reduce((s, x) => s + x.p.meta, 0);
  const total = progressoAnual(somaMeta, vendas.filter((v) => corretores.includes(v.corretor_id)), ano, agora);
  const th = "px-2 py-2 text-right font-semibold align-bottom";
  const linha = (p: ProgressoAnual) => (
    <>
      <td className="num px-2 py-2 text-right">{formatarReais(p.meta)}</td>
      <td className="num px-2 py-2 text-right">{formatarReais(Math.floor(p.acumulado))}</td>
      <td className={clsx("num px-2 py-2 text-right", p.batida && "font-semibold text-ok")}>
        {p.batida ? "✓ " : ""}
        {formatarPct(p.razao)}
      </td>
      <td className="num px-2 py-2 text-right">{p.batida ? "–" : formatarReais(Math.ceil(p.falta))}</td>
      <td className="num px-2 py-2 text-right">{p.ritmoMensal !== null ? formatarReais(Math.ceil(p.ritmoMensal)) : "–"}</td>
      <td className="num px-2 py-2 text-right">{p.projecao !== null ? formatarReais(Math.round(p.projecao)) : "–"}</td>
      <td className="num px-2 py-2 pr-4 text-right text-ink-soft">{formatarReais(Math.floor(p.assinado))}</td>
    </>
  );
  return (
    <section aria-labelledby="t-meta-anual" className="min-w-0">
      <h2 id="t-meta-anual" className="eyebrow mb-2">
        Meta anual de VGV · <span className="num">{ano}</span> · assinado e pago, no mês da assinatura
      </h2>
      <div className="card tabela-painel overflow-x-auto p-0">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-line text-concrete">
              <th className="px-4 py-2 align-bottom font-semibold">Corretor</th>
              <th className={th}>Meta</th>
              <th className={th}>Assinado e pago</th>
              <th className={th}>Atingido</th>
              <th className={th}>Falta</th>
              <th className={th}>Por mês até dezembro</th>
              <th className={th}>Projeção</th>
              <th className={clsx(th, "pr-4")}>Assinado, com pendentes</th>
            </tr>
          </thead>
          <tbody>
            {ps.map(({ c, p }) => (
              <tr key={c} className="border-b border-line">
                <td className="px-4 py-2">
                  {abrir ? (
                    <button type="button" className="link-acao focus-ring text-left" onClick={() => abrir(c)}>
                      {nomes.get(c) ?? "Corretor"}
                    </button>
                  ) : (
                    (nomes.get(c) ?? "Corretor")
                  )}
                </td>
                {linha(p)}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="px-4 py-2">Equipe</td>
              {linha(total)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Metas próprias ----------
// Como em ref/CRM Bruna/src/components/performance (goals-section, cards e
// goal-dialog): card com "Métrica · período", atual / alvo, barra, frase de
// ritmo e "Mostrar no painel" que vale na hora; excluir com Desfazer.

/**
 * As metas próprias do corretor, com o progresso calculado pelos dados. Com
 * `editavel`, o corretor cria, muda e exclui. `soPainel` mostra só as marcadas
 * para o painel (sem nada marcado, não ocupa espaço).
 */
export function MetasDoCorretor({
  corretor,
  editavel,
  soPainel,
  titulo,
}: {
  corretor: string;
  editavel?: boolean;
  soPainel?: boolean;
  titulo?: string;
}) {
  const { metas, erro, recarregar } = useMetas(corretor);
  const dados = useDadosMetas(corretor, metas);
  const [form, setForm] = useState<{ meta: Meta | null; metrica?: Metrica } | null>(null);
  const [desfazer, setDesfazer] = useState<{ meta: Meta; texto: string } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const agora = useMemo(() => new Date(), [dados]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiveis = (metas ?? []).filter((m) => !soPainel || m.no_painel);
  if (soPainel && !visiveis.length) return null;

  async function excluir(m: Meta) {
    setErroAcao(null);
    const e = await excluirMeta(m.id);
    if (e) return setErroAcao(e);
    recarregar();
    setDesfazer({ meta: m, texto: `Meta excluída: ${nomeDaMeta(m, new Date())}` });
  }

  async function noPainel(m: Meta, ligado: boolean) {
    setErroAcao(null);
    const { id, dono_id, created_at, ...campos } = m;
    void dono_id;
    void created_at;
    const e = await salvarMeta({ ...campos, no_painel: ligado }, id);
    if (e) setErroAcao(e);
    recarregar();
  }

  return (
    <section className="grid gap-3" aria-labelledby={`metas-${corretor}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`metas-${corretor}`} className="eyebrow">
            {titulo ?? (editavel ? "Metas próprias" : "Metas do corretor")}
          </h2>
          {editavel && <p className="mt-1 text-[13px] text-ink-soft">Você define os alvos; o progresso vem do que já está registrado.</p>}
        </div>
        {editavel && !form && !!metas?.length && (
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => setForm({ meta: null })}>
            + Nova meta
          </button>
        )}
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {erroAcao && <p className="aviso-erro">! {erroAcao}</p>}
      {form && (
        <FormMeta
          key={form.meta?.id ?? `nova-${form.metrica ?? ""}`}
          meta={form.meta}
          metricaInicial={form.metrica}
          metas={metas ?? []}
          onCancelar={() => setForm(null)}
          onSalva={() => {
            setForm(null);
            recarregar();
          }}
        />
      )}
      {!metas && !erro && <p className="text-concrete">Carregando metas…</p>}
      {metas && !visiveis.length && !form && (
        <div className="card">
          {editavel ? (
            <>
              <p className="titulo-card">Nenhuma meta por enquanto.</p>
              <p className="mt-2 text-ink-soft">
                Que tal começar pelo VGV, com o período que você costuma usar? Você pode mudar os números quando quiser.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-red focus-ring" onClick={() => setForm({ meta: null, metrica: "vgv" })}>
                  + Meta de VGV
                </button>
                <button type="button" className="btn btn-ghost focus-ring" onClick={() => setForm({ meta: null })}>
                  + Outra meta
                </button>
              </div>
            </>
          ) : (
            <p className="text-ink-soft">O corretor ainda não criou metas próprias.</p>
          )}
        </div>
      )}
      {metas && !dados && visiveis.length > 0 && <p className="text-concrete">Carregando…</p>}
      {dados && visiveis.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((m) => (
            <CardMeta
              key={m.id}
              p={progressoMeta(m, corretor, dados, agora)}
              editavel={editavel}
              onEditar={() => setForm({ meta: m })}
              onExcluir={() => excluir(m)}
              onNoPainel={(ligado) => noPainel(m, ligado)}
            />
          ))}
        </ul>
      )}
      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
          onFim={fecharDesfazer}
          onDesfazer={async () => {
            const m = desfazer.meta;
            setDesfazer(null);
            const e = await salvarMeta({
              metrica: m.metrica,
              periodo: m.periodo,
              inicio: m.inicio,
              meses: m.meses,
              valor: m.valor,
              no_painel: m.no_painel,
            });
            if (e) setErroAcao(e);
            recarregar();
          }}
        />
      )}
    </section>
  );
}

/** Meta: "Vendas · Outubro de 2026", atual / alvo, barra e a frase de ritmo, como o GoalCard da Bruna. */
function CardMeta({
  p,
  editavel,
  onEditar,
  onExcluir,
  onNoPainel,
}: {
  p: ProgressoMeta;
  editavel?: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onNoPainel: (ligado: boolean) => void;
}) {
  const m = p.meta;
  const def = metrica(m.metrica);
  const t = textoRitmo(p);
  const nome = `${def.nome} · ${p.intervalo.rotulo}`;
  return (
    <li className="card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow min-w-0">{nome}</p>
        {p.batida && (
          <span className="selo shrink-0 border-current text-ok">
            <span aria-hidden>✓</span> Meta batida
          </span>
        )}
      </div>
      {/* O atual nunca arredonda para cima (não "bate" a meta antes da hora); o alvo, exato. */}
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="num font-display text-[30px] font-extrabold leading-none">{numeroDaMetrica(m.metrica, p.valor)}</span>
        <span className="num text-[17px] text-ink-soft">
          <span aria-hidden>/ </span>
          <span className="sr-only">de </span>
          {numeroDaMetrica(m.metrica, Number(m.valor))}
        </span>
      </p>
      <div className="mt-3">
        <Barra razao={p.razao} batida={p.batida} rotulo={`${def.nome}: ${Math.round(Math.min(1, p.razao) * 100)}% da meta`} />
      </div>
      <p className="mt-3 text-[14px]">
        {t.principal}
        {t.detalhe && <span className="text-ink-soft"> {t.detalhe}</span>}
      </p>
      {p.assinado !== undefined && p.assinado > p.valor && (
        <p className="num mt-1 text-[12px] text-concrete">Assinado, com pendentes: {numeroDaMetrica(m.metrica, p.assinado)}</p>
      )}
      {editavel && (
        <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-2 text-[13px]">
          <label className="flex min-h-[36px] cursor-pointer items-center gap-2 font-semibold">
            <input type="checkbox" className="checkbox" checked={m.no_painel} onChange={(e) => onNoPainel(e.target.checked)} />
            Mostrar no painel<span className="sr-only">: {nome}</span>
          </label>
          <span className="flex gap-4">
            <button type="button" className="link-acao focus-ring" aria-label={`Editar meta: ${nome}`} onClick={onEditar}>
              Editar
            </button>
            <button type="button" className="link-acao focus-ring" aria-label={`Excluir meta: ${nome}`} onClick={onExcluir}>
              Excluir
            </button>
          </span>
        </div>
        </div>
      )}
    </li>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

/** Meses para o início do personalizado: de 12 meses atrás a 12 à frente (como na Bruna). */
function opcoesDeInicio(atual: string | null) {
  const hoje = new Date();
  const lista = Array.from({ length: 25 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 12 + i, 1);
    return { valor: `${d.getFullYear()}-${dd(d.getMonth() + 1)}-01`, nome: `${MESES[d.getMonth()]} de ${d.getFullYear()}` };
  });
  if (atual && !lista.some((o) => o.valor === atual)) {
    const [a, m] = atual.split("-").map(Number);
    lista.unshift({ valor: atual, nome: `${MESES[m - 1]} de ${a}` });
  }
  return lista;
}

/** Exemplo de alvo mensal para o placeholder (o corretor define os próprios números). */
const EXEMPLO: Record<Metrica, string> = { leads: "Ex.: 20", contatos: "Ex.: 15", visitas: "Ex.: 8", vendas: "Ex.: 2", vgv: "Ex.: 1.000.000" };

/** Criar ou editar uma meta, como o GoalDialog da Bruna. */
function FormMeta({
  meta,
  metricaInicial,
  metas,
  onCancelar,
  onSalva,
}: {
  meta: Meta | null;
  metricaInicial?: Metrica;
  metas: Meta[];
  onCancelar: () => void;
  onSalva: () => void;
}) {
  const hoje = new Date();
  const [metricaSel, setMetrica] = useState<Metrica>(meta?.metrica ?? metricaInicial ?? "vendas");
  const [periodo, setPeriodo] = useState<PeriodoMeta>(meta?.periodo ?? "mes");
  // personalizado: por padrão, 6 meses a partir deste mês
  const [inicio, setInicio] = useState(meta?.inicio ?? `${hoje.getFullYear()}-${dd(hoje.getMonth() + 1)}-01`);
  const [meses, setMeses] = useState(meta?.meses ?? 6);
  const [valor, setValor] = useState(meta ? (metrica(meta.metrica).dinheiro ? Number(meta.valor).toLocaleString("pt-BR") : String(meta.valor)) : "");
  const [noPainel, setNoPainel] = useState(meta?.no_painel ?? true);
  const [tentou, setTentou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const def = metrica(metricaSel);
  const personalizado = periodo === "personalizado";
  const por = PERIODOS_META.find((p) => p.slug === periodo)!.por;
  const alvo = def.dinheiro ? lerReais(valor) : /^\d+$/.test(valor.trim()) && Number(valor) > 0 ? Number(valor) : null;
  const erroAlvo = alvo ? null : "Informe o alvo.";
  const repetida = metaRepetida(metas, {
    id: meta?.id,
    metrica: metricaSel,
    periodo,
    inicio: personalizado ? inicio : null,
    meses: personalizado ? meses : null,
  });
  const erroRepetida = repetida ? textoMetaRepetida(metricaSel, periodo) : null;
  const rotuloPeriodo = personalizado ? intervaloDaMeta({ periodo, inicio, meses }, hoje).rotulo : null;

  /** Outra unidade (VGV ↔ vendas): o número antigo não faz sentido. */
  function trocarMetrica(m: Metrica) {
    if (!!metrica(m).dinheiro !== !!def.dinheiro) setValor("");
    setMetrica(m);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (erroRepetida || erroAlvo || !alvo) return;
    setErro(null);
    setSalvando(true);
    const r = await salvarMeta(
      { metrica: metricaSel, periodo, inicio: personalizado ? inicio : null, meses: personalizado ? meses : null, valor: alvo, no_painel: noPainel },
      meta?.id,
    );
    setSalvando(false);
    if (r) return setErro(r);
    onSalva();
  }

  return (
    <form onSubmit={salvar} className="card grid gap-4" noValidate>
      <div>
        <span className="eyebrow">{meta ? "Editar meta" : "Nova meta"}</span>
        <p className="mt-1 text-[13px] text-ink-soft">Você escolhe o alvo; o progresso é calculado com o que já está registrado no CRM.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="meta-metrica">
          Métrica
        </label>
        <select id="meta-metrica" className="input" value={metricaSel} onChange={(e) => trocarMetrica(e.target.value as Metrica)}>
          {METRICAS.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.nome}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[13px] text-ink-soft">{def.dica}.</p>
      </div>
      <fieldset>
        <legend className="field-label">Período</legend>
        <div className="grid grid-cols-3 gap-2">
          {PERIODOS_META.map((p) => {
            const marcado = p.slug === periodo;
            return (
              <button
                key={p.slug}
                type="button"
                aria-pressed={marcado}
                onClick={() => setPeriodo(p.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-1 py-[11px] text-[13px] font-semibold",
                  marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {p.nome}
              </button>
            );
          })}
        </div>
        {tentou && erroRepetida && <p className="aviso-erro mt-2">! {erroRepetida}</p>}
      </fieldset>
      {personalizado && (
        <div className="grid gap-3">
          {/* no celular um embaixo do outro: "Setembro de 2026" não cabe pela metade da tela */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="meta-inicio">
                Começa em
              </label>
              <select id="meta-inicio" className="input" value={inicio} onChange={(e) => setInicio(e.target.value)}>
                {opcoesDeInicio(meta?.inicio ?? null).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="meta-meses">
                Duração
              </label>
              <select id="meta-meses" className="input" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
                {Array.from({ length: MESES_MAX }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "mês" : "meses"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {rotuloPeriodo && (
            <p className="num text-[13px] text-ink-soft" aria-live="polite">
              Conta de {rotuloPeriodo}.
            </p>
          )}
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="meta-valor">
          {def.dinheiro ? "Alvo (R$)" : "Alvo"}
        </label>
        <div className="relative">
          {def.dinheiro && (
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              R$
            </span>
          )}
          <input
            id="meta-valor"
            className={clsx("input num", def.dinheiro ? "pl-10" : "pr-[140px]")}
            inputMode={def.dinheiro ? "decimal" : "numeric"}
            placeholder={def.dinheiro ? EXEMPLO[metricaSel].replace("Ex.: ", "") : EXEMPLO[metricaSel]}
            value={valor}
            onChange={(e) => setValor(def.dinheiro ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 5))}
            aria-describedby="meta-valor-nota"
          />
          {!def.dinheiro && (
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {Number(valor) === 1 ? def.um : def.varios}
            </span>
          )}
        </div>
        <p id="meta-valor-nota" className={clsx("mt-1 text-[13px]", tentou && erroAlvo ? "aviso-erro" : "text-ink-soft")}>
          {tentou && erroAlvo ? `! ${erroAlvo}` : `Quanto você quer alcançar ${por}.`}
        </p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-line px-3 py-3">
        <input type="checkbox" className="checkbox mt-[2px]" checked={noPainel} onChange={(e) => setNoPainel(e.target.checked)} />
        <span>
          <span className="block font-semibold">Mostrar no painel</span>
          <span className="block text-[13px] text-ink-soft">A meta aparece na lista do dia e no seu painel, com o progresso do período.</span>
        </span>
      </label>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-red btn-lg focus-ring flex-1 md:flex-none" disabled={salvando}>
          {salvando ? "Salvando…" : meta ? "Salvar meta" : "Criar meta"}
        </button>
        <button type="button" className="btn btn-ghost btn-lg focus-ring flex-1 md:flex-none" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Metas na tela inicial do corretor (a lista do dia), como no Painel do Dia da
 * Bruna: a meta anual de VGV e as metas marcadas para o painel. Lê tudo sozinha.
 */
export function MetasNoInicio({ corretor }: { corretor: string }) {
  const ano = new Date().getFullYear();
  const { linhas } = useMetasVgv(ano);
  const { vendas } = useVendasDoAno(ano, corretor);
  return (
    <div className="grid gap-4 border-t border-line pt-5">
      {linhas && vendas && <CartaoMetaAnual corretor={corretor} ano={ano} linhas={linhas} vendas={vendas} proprio destaque={false} />}
      <MetasDoCorretor corretor={corretor} soPainel titulo="Suas metas" />
    </div>
  );
}
