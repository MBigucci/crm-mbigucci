"use client";

import clsx from "clsx";
import { MetaDetalhada } from "./meta-detalhada";
import { Tabela } from "@/components/alicerce/tabela";
import { Campo, CampoSelecao, CampoEmGrupo } from "@/components/alicerce/campo";
import { Seletor } from "@/components/alicerce/seletor";
import { Interruptor } from "@/components/alicerce/interruptor";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { ErroPainel } from "@/components/painel/partes";
import { useCallback, useMemo, useRef, useState } from "react";
import { AvisoDesfazer } from "@/components/leads/partes";
import { Meta as MetaAlicerce, Unidade } from "@/components/alicerce/meta";
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

}: {
  corretor: string;
  ano: number;
  linhas: MetaVgv[];
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[];
  proprio: boolean;
  /** Compatibilidade com os consumidores; a Meta do Alicerce não usa fio de marca. */
  destaque?: boolean;
}) {
  const meta = metaAnualDe(corretor, ano, linhas);
  const p = progressoAnual(
    meta.valor,
    vendas.filter((v) => v.corretor_id === corretor),
    ano,
    new Date(),
  );
  return <MetaDetalhada rotulo={"Meta anual de VGV · " + ano} valor={<><ComUnidade texto={formatarReais(Math.floor(p.acumulado))} /> de <ComUnidade texto={formatarReais(p.meta)} /></>} feitoPct={p.razao * 100} projecaoPct={p.projecao !== null && p.meta > 0 ? p.projecao / p.meta * 100 : undefined} descricaoAria={formatarPct(p.razao) + " da meta anual de VGV" + (p.projecao !== null ? "; projeção: " + formatarReais(Math.round(p.projecao)) : "")} legenda={[p.batida ? "✓ Meta batida · " + formatarPct(p.razao) : formatarPct(p.razao) + " atingido", p.projecao !== null ? "Projeção: " + formatarReais(Math.round(p.projecao)) : "Projeção indisponível"]}>
    <dl className="mb-pares">
      <Dado rotulo="Assinado e pago" valor={formatarReais(Math.floor(p.acumulado))} />
      <Dado rotulo="Assinado, com pendentes" valor={formatarReais(Math.floor(p.assinado))} />
      <Dado rotulo="Falta" valor={p.batida ? "–" : formatarReais(Math.ceil(p.falta))} />
      <Dado rotulo="Ritmo necessário" valor={p.ritmoMensal !== null ? formatarReais(Math.ceil(p.ritmoMensal)) : "–"} nota={p.ritmoMensal !== null ? textoMeses(p) : undefined} />
      <Dado rotulo="Projeção no ritmo atual" valor={p.projecao !== null ? formatarReais(Math.round(p.projecao)) : "–"} nota={p.projecao === null ? (p.acumulado > 0 ? "Aparece a partir de abril" : "Depois da primeira venda paga") : p.encerrado ? "Ano encerrado" : "Fecha " + ano + " com isso"} />
    </dl>
    <p className="mb-grafico__nota">{proprio ? ORIGEM_META[meta.origem] : ORIGEM_META[meta.origem].replace(" para você", "")}. Conta o VGV das vendas assinadas e pagas, no mês da assinatura.</p>
  </MetaDetalhada>;
}

const textoMeses = (p: ProgressoAnual) =>
  p.mesesRestantes === 1 ? "Por mês: só dezembro pela frente" : `Por mês, nos ${p.mesesRestantes} meses até dezembro, com este`;

function Dado({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return <><dt>{rotulo}</dt><dd className="mb-pares__num">{valor}{nota && <small className="pmr-nota pmr-bloco">{nota}</small>}</dd></>;
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
  const th = "mb-tabela__num";
  const linha = (p: ProgressoAnual) => (
    <>
      <td className="mb-tabela__num">{formatarReais(p.meta)}</td>
      <td className="mb-tabela__num">{formatarReais(Math.floor(p.acumulado))}<small className="pmr-nota pmr-bloco">{p.batida ? "✓ " : ""}{formatarPct(p.razao)} atingido</small></td>
      <td className="mb-tabela__num">{p.batida ? "–" : formatarReais(Math.ceil(p.falta))}</td>
      <td className="mb-tabela__num">{p.ritmoMensal !== null ? formatarReais(Math.ceil(p.ritmoMensal)) : "–"}</td>
      <td className="mb-tabela__num">{p.projecao !== null ? formatarReais(Math.round(p.projecao)) : "–"}</td>
      <td className="mb-tabela__num">{formatarReais(Math.floor(p.assinado))}</td>
    </>
  );
  return (
    <section aria-labelledby="t-meta-anual" className="min-w-0">
      <h2 id="t-meta-anual" className="mb-grafico__titulo mb-3">
        Meta anual de VGV · <span className="">{ano}</span> · assinado e pago, no mês da assinatura
      </h2>
      <Tabela tipo="numeros" rotulo="Metas anuais por corretor">
          <thead>
            <tr className="pmr-nota">
              <th scope="col" >Corretor</th>
              <th scope="col" className={th}>Meta</th>
              <th scope="col" className={th}>Assinado e pago · atingido</th>
              <th scope="col" className={th}>Falta</th>
              <th scope="col" className={th}>Por mês até dezembro</th>
              <th scope="col" className={th}>Projeção</th>
              <th scope="col" className={clsx(th, "pr-4")}>Assinado, com pendentes</th>
            </tr>
          </thead>
          <tbody>
            {ps.map(({ c, p }) => (
              <tr key={c} >
                <td >
                  {abrir ? (
                    <button type="button" className="mb-link pmr-corretor" onClick={() => abrir(c)}>
                      {nomes.get(c) ?? "Corretor"}
                    </button>
                  ) : (
                    (nomes.get(c) ?? "Corretor")
                  )}
                </td>
                {linha(p)}
              </tr>
            ))}
          </tbody><tfoot><tr>
              <td>Equipe</td>
              {linha(total)}
            </tr></tfoot>
        </Tabela>
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
  const origemForm = useRef<HTMLElement | null>(null);
  const fecharForm = () => { setForm(null); requestAnimationFrame(() => { const alvo = origemForm.current?.isConnected ? origemForm.current : document.getElementById(`metas-${corretor}`)?.closest("section")?.querySelector<HTMLElement>("button"); alvo?.focus(); }); };
  const [form, setForm] = useState<{ meta: Meta | null; metrica?: Metrica } | null>(null);
  const [desfazer, setDesfazer] = useState<{ meta: Meta; texto: string } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);
  const toast = useToast();
  const avisarErro = (erro: string | null) => {
    if (erro) toast.mostrar("Não foi possível alterar a meta. Confira a conexão e tente novamente.", { tipo: "erro" });
  };
  const agora = useMemo(() => new Date(), [dados]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirForm(valor: { meta: Meta | null; metrica?: Metrica }) { origemForm.current = document.activeElement as HTMLElement; setForm(valor); }
  const visiveis = (metas ?? []).filter((m) => !soPainel || m.no_painel);
  if (soPainel && !visiveis.length && !erro) return null;

  async function excluir(m: Meta) {
    avisarErro(null);
    const e = await excluirMeta(m.id);
    if (e) return avisarErro(e);
    recarregar();
    setDesfazer({ meta: m, texto: `Meta excluída: ${nomeDaMeta(m, new Date())}` });
  }

  async function noPainel(m: Meta, ligado: boolean) {
    avisarErro(null);
    const { id, dono_id, created_at, ...campos } = m;
    void dono_id;
    void created_at;
    const e = await salvarMeta({ ...campos, no_painel: ligado }, id);
    if (e) avisarErro(e);
    recarregar();
  }

  return (
    <section className="grid gap-3" aria-labelledby={`metas-${corretor}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`metas-${corretor}`} className="mb-grafico__titulo">
            {titulo ?? (editavel ? "Metas próprias" : "Metas do corretor")}
          </h2>
          {editavel && <p className="pmr-nota">Você define os alvos; o progresso vem do que já está registrado.</p>}
        </div>
        {editavel && !!metas?.length && (
          <button type="button" className="mb-botao mb-botao--secundario" onClick={() => abrirForm({ meta: null })}>
            + Nova meta
          </button>
        )}
      </div>
      {erro && <ErroPainel erro={erro} />}
      {form && (
        <PainelLateral aberto onFechar={fecharForm} titulo={form.meta ? "Editar meta" : "Criar meta"} descricao="Escolha o alvo; o progresso vem dos registros do Base360 Vendas." foco={() => origemForm.current}>
        <FormMeta
          key={form.meta?.id ?? `nova-${form.metrica ?? ""}`}
          meta={form.meta}
          metricaInicial={form.metrica}
          metas={metas ?? []}
          onCancelar={fecharForm}
          onSalva={() => {
            toast.mostrar(form.meta ? "Meta salva." : "Meta criada.", { tipo: "sucesso" });
            fecharForm();
            recarregar();
          }}
        />
        </PainelLateral>
      )}
      {!metas && !erro && <CarregandoTabela texto="Carregando metas…" />}
      {metas && !erro && !visiveis.length && !form && <EstadoVazio titulo="Nenhuma meta própria" texto={editavel ? "Defina o alvo e o período. O progresso vem dos registros do Base360 Vendas." : "O corretor ainda não criou metas próprias."} acao={editavel ? <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => abrirForm({ meta: null, metrica: "vgv" })}>Criar meta</button> : undefined} />}
      {metas && !dados && !erro && visiveis.length > 0 && <CarregandoTabela texto="Carregando metas…" />}
      {dados && visiveis.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((m) => (
            <CardMeta
              key={m.id}
              p={progressoMeta(m, corretor, dados, agora)}
              editavel={editavel}
              onEditar={() => abrirForm({ meta: m })}
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
            if (e) avisarErro(e);
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
  return <li>
    <MetaDetalhada rotulo={nome} valor={<><ComUnidade texto={numeroDaMetrica(m.metrica, p.valor)} /> de <ComUnidade texto={numeroDaMetrica(m.metrica, Number(m.valor))} /></>} feitoPct={p.razao * 100} projecaoPct={p.projecao !== null ? p.projecao / Number(m.valor) * 100 : undefined} descricaoAria={def.nome + ": " + Math.round(Math.min(1, p.razao) * 100) + "% da meta" + (p.projecao !== null ? "; projeção: " + numeroDaMetrica(m.metrica, p.projecao) : "")} legenda={[p.batida ? "✓ Meta batida" : t.principal, t.detalhe]}>
      {p.assinado !== undefined && p.assinado > p.valor && <p className="mb-grafico__nota">Assinado, com pendentes: {numeroDaMetrica(m.metrica, p.assinado)}</p>}
      {editavel && <div className="pmr-pilha">
        <div className="pmr-linha"><span>Mostrar no painel</span><Interruptor ligado={m.no_painel} rotulo={"Mostrar no painel: " + nome} onAlternar={onNoPainel} /></div>
        <div className="mb-grupo-botoes"><button type="button" className="mb-botao mb-botao--secundario mb-botao--p" aria-label={"Editar meta: " + nome} onClick={onEditar}>Editar</button><button type="button" className="mb-botao mb-botao--discreto mb-botao--p" aria-label={"Excluir meta: " + nome} onClick={onExcluir}>Excluir</button></div>
      </div>}
    </MetaDetalhada>
  </li>;
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
    if (erroRepetida || erroAlvo || !alvo) { const form = e.currentTarget as HTMLFormElement; requestAnimationFrame(() => (form.querySelector<HTMLElement>("[aria-invalid=true]") ?? form.querySelector<HTMLElement>("[aria-pressed=true]"))?.focus()); return; }
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

  return <form onSubmit={salvar} className="pmr-form" noValidate>
    <div className="mb-lateral__corpo pmr-pilha">
      <CampoSelecao rotulo="Métrica" ajuda={def.dica + "."}><select id="meta-metrica" className="mb-campo__entrada" value={metricaSel} onChange={(e) => trocarMetrica(e.target.value as Metrica)}>{METRICAS.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}</select></CampoSelecao>
      <CampoEmGrupo id="meta-periodo" rotulo="Período" erro={tentou ? erroRepetida : null} idErro="meta-repetida"><Seletor idRotulo="meta-periodo" grade={3} valor={periodo} onChange={(v) => setPeriodo(v as PeriodoMeta)} opcoes={PERIODOS_META.map((p) => ({ valor: p.slug, rotulo: p.nome }))} /></CampoEmGrupo>
      {personalizado && <>
        <CampoSelecao rotulo="Começa em"><select id="meta-inicio" className="mb-campo__entrada" value={inicio} onChange={(e) => setInicio(e.target.value)}>{opcoesDeInicio(meta?.inicio ?? null).map((o) => <option key={o.valor} value={o.valor}>{o.nome}</option>)}</select></CampoSelecao>
        <CampoSelecao rotulo="Duração"><select id="meta-meses" className="mb-campo__entrada" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>{Array.from({ length: MESES_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "mês" : "meses"}</option>)}</select></CampoSelecao>
        {rotuloPeriodo && <p className="mb-grafico__nota" aria-live="polite">Conta de {rotuloPeriodo}.</p>}
      </>}
      <Campo rotulo={def.dinheiro ? "Alvo (R$)" : "Alvo"} obrigatorio erro={tentou ? erroAlvo : null} idErro="meta-valor-erro" ajuda={"Quanto você quer alcançar " + por + "."}>
        <span className="mb-campo__grupo">{def.dinheiro && <span className="mb-campo__afixo">R$</span>}
          <input id="meta-valor" className="mb-campo__entrada mb-campo__entrada--num" inputMode={def.dinheiro ? "decimal" : "numeric"} required placeholder={def.dinheiro ? EXEMPLO[metricaSel].replace("Ex.: ", "") : EXEMPLO[metricaSel]} value={valor} onChange={(e) => setValor(def.dinheiro ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 5))} aria-invalid={tentou && !!erroAlvo} aria-describedby={tentou && erroAlvo ? "meta-valor-erro" : undefined} />
          {!def.dinheiro && <span className="mb-campo__afixo">{Number(valor) === 1 ? def.um : def.varios}</span>}
        </span>
      </Campo>
      <label className="mb-marcador"><input type="checkbox" checked={noPainel} onChange={(e) => setNoPainel(e.target.checked)} /><span>Mostrar no painel<span className="pmr-nota pmr-bloco">A meta aparece na lista do dia e no seu painel.</span></span></label>
      {erro && <Aviso tom="erro" titulo="Não foi possível salvar a meta" texto="Confira a conexão e tente novamente. O que você preencheu foi mantido." />}
    </div>
    <div className="mb-lateral__rodape"><button type="button" className="mb-botao mb-botao--discreto" onClick={onCancelar}>Cancelar</button><button type="submit" className="mb-botao mb-botao--primario" disabled={salvando} aria-busy={salvando}>{salvando ? "Salvando…" : meta ? "Salvar meta" : "Criar meta"}</button></div>
  </form>;
}

/** O "R$" menor e mais leve que o número (.mb-unidade); texto sem R$ fica como está. */
function ComUnidade({ texto }: { texto: string }) {
  const m = /^R\$\s?(.*)$/.exec(texto);
  return m ? (
    <>
      <Unidade>R$</Unidade> {m[1]}
    </>
  ) : (
    <>{texto}</>
  );
}

/**
 * Metas na tela inicial do corretor (a lista do dia), no Alicerce (Meta): a meta anual de VGV e as metas
 * marcadas para o painel, cada uma com o valor, a barra e a marca de projeção. Lê tudo sozinha, com os mesmos
 * dados e cálculos de antes (progressoAnual, progressoMeta e textoRitmo). O que a Meta não mostra (falta,
 * ritmo necessário e assinado com pendentes da meta anual) continua nas telas Painel e Metas.
 */
export function MetasNoInicio({ corretor }: { corretor: string }) {
  const ano = new Date().getFullYear();
  const { linhas } = useMetasVgv(ano);
  const { vendas } = useVendasDoAno(ano, corretor);
  const { metas } = useMetas(corretor);
  const dados = useDadosMetas(corretor, metas);
  const agora = useMemo(() => new Date(), [dados]); // eslint-disable-line react-hooks/exhaustive-deps

  const anual =
    linhas && vendas
      ? (() => {
          const p = progressoAnual(
            metaAnualDe(corretor, ano, linhas).valor,
            vendas.filter((v) => v.corretor_id === corretor),
            ano,
            new Date(),
          );
          const feito = Math.floor(p.razao * 100);
          const proj = p.projecao !== null && p.meta > 0 ? Math.round((p.projecao / p.meta) * 100) : null;
          return (
            <MetaAlicerce
              key="anual"
              rotulo={`Meta anual de VGV · ${ano}`}
              valor={
                <>
                  <ComUnidade texto={formatarReais(Math.floor(p.acumulado))} /> de <ComUnidade texto={formatarReais(p.meta)} />
                </>
              }
              feitoPct={p.razao * 100}
              projecaoPct={proj}
              descricaoAria={`${feito}% da meta${proj !== null ? `; projeção de ${proj}% em dezembro` : ""}`}
              legenda={[p.batida ? "✓ Meta batida" : `${feito}% feito`, proj !== null ? `Projeção para dezembro: ${proj}%` : undefined]}
            />
          );
        })()
      : null;

  const proprias =
    metas && dados
      ? metas
          .filter((m) => m.no_painel)
          .map((m) => {
            const p = progressoMeta(m, corretor, dados, agora);
            const t = textoRitmo(p);
            const alvo = Number(m.valor);
            const proj = p.projecao !== null && alvo > 0 ? Math.round((p.projecao / alvo) * 100) : null;
            const feito = Math.floor(Math.min(1, p.razao) * 100);
            return (
              <MetaAlicerce
                key={m.id}
                rotulo={`${metrica(m.metrica).nome} · ${p.intervalo.rotulo}`}
                valor={
                  <>
                    <ComUnidade texto={numeroDaMetrica(m.metrica, p.valor)} /> de <ComUnidade texto={numeroDaMetrica(m.metrica, alvo)} />
                  </>
                }
                feitoPct={p.razao * 100}
                projecaoPct={proj}
                descricaoAria={`${metrica(m.metrica).nome}: ${feito}% da meta${proj !== null ? `; projeção de ${proj}%` : ""}`}
                legenda={[t.principal, t.detalhe]}
              />
            );
          })
      : [];

  if (!anual && !proprias.length) return null;
  return (
    <div className="lista-do-dia__metas">
      {anual}
      {proprias}
    </div>
  );
}
