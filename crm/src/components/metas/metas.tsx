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
  METRICAS,
  numeroDaMetrica,
  PERIODOS_META,
  progressoAnual,
  progressoMeta,
  textoRitmo,
  type Meta,
  type MetaVgv,
  type Metrica,
  type PeriodoMeta,
  type ProgressoAnual,
  type ProgressoMeta,
} from "@/lib/metas";
import { formatarReais, lerReais, type Venda } from "@/lib/vendas";
import { excluirMeta, salvarMeta, useDadosMetas, useMetas, type CamposMeta } from "@/lib/vendas-dados";

/** Barra de progresso: o número ao lado diz o quanto (nunca só a cor). */
export function Barra({ razao, batida }: { razao: number; batida?: boolean }) {
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-sm bg-line" aria-hidden>
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
        <Barra razao={p.razao} batida={p.batida} />
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

/**
 * As metas próprias do corretor, com o progresso calculado pelos dados. Com
 * `editavel`, o corretor cria, muda e exclui (com Desfazer). `soPainel` mostra só
 * as marcadas para o painel.
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
  const [form, setForm] = useState<Meta | "nova" | null>(null);
  const [desfazer, setDesfazer] = useState<Meta | null>(null);
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
    setDesfazer(m);
  }

  return (
    <section className="grid gap-3" aria-labelledby={`metas-${corretor}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`metas-${corretor}`} className="eyebrow">
          {titulo ?? (editavel ? "Metas próprias" : "Metas do corretor")}
        </h2>
        {editavel && !form && (
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => setForm("nova")}>
            + Nova meta
          </button>
        )}
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {erroAcao && <p className="aviso-erro">! {erroAcao}</p>}
      {form && (
        <FormMeta
          key={form === "nova" ? "nova" : form.id}
          meta={form === "nova" ? null : form}
          metas={metas ?? []}
          onCancelar={() => setForm(null)}
          onSalva={() => {
            setForm(null);
            recarregar();
          }}
        />
      )}
      {metas && !visiveis.length && !form && (
        <div className="card">
          <p className="text-ink-soft">
            {editavel
              ? "Nenhuma meta ainda. Crie uma meta de leads, primeiros contatos, visitas, vendas ou VGV, para o mês, o trimestre, o ano ou um período seu."
              : "O corretor ainda não criou metas próprias."}
          </p>
        </div>
      )}
      {!dados && visiveis.length > 0 && <p className="text-concrete">Carregando…</p>}
      {dados && visiveis.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {visiveis.map((m) => (
            <CardMeta
              key={m.id}
              p={progressoMeta(m, corretor, dados, agora)}
              editavel={editavel}
              onEditar={() => setForm(m)}
              onExcluir={() => excluir(m)}
            />
          ))}
        </ul>
      )}
      {desfazer && (
        <AvisoDesfazer
          texto="Meta excluída"
          onFim={fecharDesfazer}
          onDesfazer={async () => {
            const m = desfazer;
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

function CardMeta({ p, editavel, onEditar, onExcluir }: { p: ProgressoMeta; editavel?: boolean; onEditar: () => void; onExcluir: () => void }) {
  const m = p.meta;
  const def = metrica(m.metrica);
  const t = textoRitmo(p);
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="titulo-card">{def.nome}</p>
          <p className="num text-[13px] text-ink-soft">{p.intervalo.rotulo}</p>
        </div>
        {p.batida && (
          <span className="selo shrink-0 border-current text-ok">
            <span aria-hidden>✓</span> Batida
          </span>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="num font-display text-[26px] font-extrabold leading-none">{numeroDaMetrica(m.metrica, p.valor)}</span>
        <span className="num text-ink-soft">de {numeroDaMetrica(m.metrica, Number(m.valor))}</span>
      </p>
      <div className="mt-2">
        <Barra razao={p.razao} batida={p.batida} />
      </div>
      <p className="mt-2 text-[14px] font-semibold">{t.principal}</p>
      {t.detalhe && <p className="mt-1 text-[13px] text-ink-soft">{t.detalhe}</p>}
      {p.assinado !== undefined && p.assinado > p.valor && (
        <p className="num mt-1 text-[12px] text-concrete">Assinado, com pendentes: {numeroDaMetrica(m.metrica, p.assinado)}</p>
      )}
      {editavel && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <span className="text-concrete">{m.no_painel ? "✓ No painel" : "– Fora do painel"}</span>
          <button type="button" className="link-acao focus-ring" onClick={onEditar}>
            Editar
          </button>
          <button type="button" className="link-acao focus-ring" onClick={onExcluir}>
            Excluir
          </button>
        </div>
      )}
    </li>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

/** Meses para o início do personalizado: de 12 meses atrás a 12 à frente. */
function opcoesDeInicio(atual: string | null) {
  const hoje = new Date();
  const lista = Array.from({ length: 25 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 12 + i, 1);
    return { valor: `${d.getFullYear()}-${dd(d.getMonth() + 1)}-01`, nome: `${MESES[d.getMonth()]} de ${d.getFullYear()}` };
  });
  if (atual && !lista.some((o) => o.valor === atual)) lista.unshift({ valor: atual, nome: atual.slice(0, 7) });
  return lista;
}

const EXEMPLO: Record<Metrica, string> = { leads: "Ex.: 20", contatos: "Ex.: 15", visitas: "Ex.: 8", vendas: "Ex.: 2", vgv: "Ex.: 1.000.000" };

function FormMeta({ meta, metas, onCancelar, onSalva }: { meta: Meta | null; metas: Meta[]; onCancelar: () => void; onSalva: () => void }) {
  const hoje = new Date();
  const [metricaSel, setMetrica] = useState<Metrica>(meta?.metrica ?? "vendas");
  const [periodo, setPeriodo] = useState<PeriodoMeta>(meta?.periodo ?? "mes");
  const [inicio, setInicio] = useState(meta?.inicio ?? `${hoje.getFullYear()}-${dd(hoje.getMonth() + 1)}-01`);
  const [meses, setMeses] = useState(String(meta?.meses ?? 6));
  const [valor, setValor] = useState(meta ? (metrica(meta.metrica).dinheiro ? Number(meta.valor).toLocaleString("pt-BR") : String(meta.valor)) : "");
  const [noPainel, setNoPainel] = useState(meta?.no_painel ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const def = metrica(metricaSel);
  const personalizado = periodo === "personalizado";
  const nMeses = Number(meses);
  const campos: CamposMeta | null = (() => {
    const v = def.dinheiro ? lerReais(valor) : /^\d+$/.test(valor.trim()) ? Number(valor) : null;
    if (!v || v <= 0) return null;
    if (personalizado && !(Number.isInteger(nMeses) && nMeses >= 1 && nMeses <= MESES_MAX)) return null;
    return {
      metrica: metricaSel,
      periodo,
      inicio: personalizado ? inicio : null,
      meses: personalizado ? nMeses : null,
      valor: v,
      no_painel: noPainel,
    };
  })();
  const repetida = metaRepetida(metas, {
    id: meta?.id,
    metrica: metricaSel,
    periodo,
    inicio: personalizado ? inicio : null,
    meses: personalizado ? nMeses : null,
  });
  const rotuloPeriodo = personalizado && nMeses >= 1 ? intervaloDaMeta({ periodo, inicio, meses: nMeses }, hoje).rotulo : null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (repetida) return setErro("Já existe uma meta com essa métrica e esse período. Edite a que está na lista.");
    if (personalizado && !(Number.isInteger(nMeses) && nMeses >= 1 && nMeses <= MESES_MAX))
      return setErro(`A duração vai de 1 a ${MESES_MAX} meses.`);
    if (!campos) return setErro(def.dinheiro ? "Confira o valor: só números, como 1.000.000." : "Confira o valor: um número inteiro.");
    setErro(null);
    setSalvando(true);
    const r = await salvarMeta(campos, meta?.id);
    setSalvando(false);
    if (r) return setErro(r);
    onSalva();
  }

  return (
    <form onSubmit={salvar} className="card grid gap-4" noValidate>
      <span className="eyebrow">{meta ? "Editar meta" : "Nova meta"}</span>
      <div>
        <label className="field-label" htmlFor="meta-metrica">
          Métrica
        </label>
        <select id="meta-metrica" className="input" value={metricaSel} onChange={(e) => setMetrica(e.target.value as Metrica)}>
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PERIODOS_META.map((p) => {
            const marcado = p.slug === periodo;
            return (
              <button
                key={p.slug}
                type="button"
                aria-pressed={marcado}
                onClick={() => setPeriodo(p.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-2 py-[11px] text-[14px] font-semibold",
                  marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {p.nome}
              </button>
            );
          })}
        </div>
      </fieldset>
      {personalizado && (
        <div className="grid gap-4 md:grid-cols-2">
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
              Duração, em meses
            </label>
            <input
              id="meta-meses"
              className="input num"
              inputMode="numeric"
              value={meses}
              onChange={(e) => setMeses(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </div>
          {rotuloPeriodo && <p className="num text-[13px] text-ink-soft md:col-span-2">{rotuloPeriodo}</p>}
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="meta-valor">
          {def.dinheiro ? "Valor (R$)" : `Quantos ${def.varios}`}
        </label>
        <input
          id="meta-valor"
          className="input num"
          inputMode={def.dinheiro ? "decimal" : "numeric"}
          placeholder={EXEMPLO[metricaSel]}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" className="checkbox" checked={noPainel} onChange={(e) => setNoPainel(e.target.checked)} />
        Mostrar no painel
      </label>
      {repetida && <p className="aviso-erro">! Já existe uma meta com essa métrica e esse período. Edite a que está na lista.</p>}
      {erro && !repetida && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-red btn-lg focus-ring flex-1 md:flex-none" disabled={salvando || repetida}>
          {salvando ? "Salvando…" : meta ? "Salvar meta" : "Criar meta"}
        </button>
        <button type="button" className="btn btn-ghost btn-lg focus-ring flex-1 md:flex-none" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
