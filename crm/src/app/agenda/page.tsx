"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { ListaVisitas } from "@/components/visitas/visitas";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { useCorretores } from "@/lib/leads-dados";
import { dataIso, deDataIso } from "@/lib/painel";
import { agendaDaSemana, DIAS_CURTOS, inicioDaSemana } from "@/lib/visitas";
import { COLUNAS_VISITA_COM_LEAD, type VisitaComLead } from "@/lib/visitas-dados";

export default function AgendaPage() {
  return (
    <Casca titulo="Agenda">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Agenda />
      </Suspense>
    </Casca>
  );
}

const dd = (n: number) => String(n).padStart(2, "0");
const diaMes = (d: Date) => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}`;
const mesmoDia = (a: Date, b: Date) => dataIso(a) === dataIso(b);
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * A semana de visitas (segunda a domingo). O corretor vê as dele; o gerente
 * vê as da equipe, com filtro por corretor. No topo, as que passaram sem
 * baixa, de qualquer semana. A semana, o dia e o corretor ficam no endereço.
 */
function Agenda() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const permitido = veOutros || pode("leads.cadastrar");
  const sp = useSearchParams();
  const router = useRouter();

  const [hoje, setHoje] = useState(() => new Date());
  const dia = deDataIso(sp.get("d")) ?? hoje;
  const segunda = useMemo(() => inicioDaSemana(dia), [dataIso(dia)]); // eslint-disable-line react-hooks/exhaustive-deps
  const corretor = veOutros ? (sp.get("c") ?? "") : eu.id;
  const corretores = useCorretores(veOutros);
  const nomes = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);

  const ir = (mudar: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/agenda/?${q.toString()}`, { scroll: false });
  };

  const [semana, setSemana] = useState<VisitaComLead[] | null>(null);
  const [semBaixa, setSemBaixa] = useState<VisitaComLead[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const agora = new Date();
    const fim = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 7);
    let q1 = db()
      .from("visitas")
      .select(COLUNAS_VISITA_COM_LEAD)
      .gte("inicio", segunda.toISOString())
      .lt("inicio", fim.toISOString())
      .order("inicio");
    let q2 = db()
      .from("visitas")
      .select(COLUNAS_VISITA_COM_LEAD)
      .in("status", ["agendada", "confirmada"])
      .lte("inicio", agora.toISOString())
      .order("inicio");
    if (corretor) {
      q1 = q1.eq("corretor_id", corretor);
      q2 = q2.eq("corretor_id", corretor);
    }
    const [a, b] = await Promise.all([q1, q2]);
    if (a.error || b.error) return setErro(mensagemErro(a.error ?? b.error));
    setErro(null);
    setSemana(a.data as unknown as VisitaComLead[]);
    setSemBaixa(b.data as unknown as VisitaComLead[]);
    setHoje(agora);
  }, [segunda, corretor]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atualiza o "agora" a cada minuto: a visita que passou do horário pede baixa.
  useEffect(() => {
    const t = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!permitido) return <div className="card max-w-[520px]">! Seu perfil não tem acesso a esta página.</div>;

  const dias = agendaDaSemana(semana ?? [], segunda);
  const escolhido = dias.find((d) => mesmoDia(d.dia, dia)) ?? dias[0];
  const domingo = dias[6].dia;
  const total = dias.reduce((s, d) => s + d.total, 0);
  const ehSemanaAtual = mesmoDia(segunda, inicioDaSemana(hoje));
  const nomeDe = veOutros && !corretor ? (id: string) => nomes.get(id) : undefined;
  const irSemana = (passos: number) =>
    ir({ d: dataIso(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 7 * passos)) });

  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-label="Semana">
        <div className="flex flex-wrap items-end gap-3">
          {veOutros && (
            <div className="min-w-[200px] flex-1 md:flex-none">
              <label className="field-label" htmlFor="corretor">
                Corretor
              </label>
              <select id="corretor" className="input" value={corretor} onChange={(e) => ir({ c: e.target.value || null })}>
                <option value="">Todos</option>
                {corretores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-[13px] text-ink-soft md:ml-auto">
            {veOutros ? "Para agendar, o corretor abre a ficha do lead." : "Para agendar, abra a ficha do lead."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Semana anterior" onClick={() => irSemana(-1)}>
            ← Anterior
          </button>
          <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
            {diaMes(segunda)} a {diaMes(domingo)}/{domingo.getFullYear()}
          </p>
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Semana seguinte" onClick={() => irSemana(1)}>
            Seguinte →
          </button>
          {!ehSemanaAtual && (
            <button type="button" className="link-acao focus-ring ml-2 hidden text-[13px] md:inline" onClick={() => ir({ d: null })}>
              Voltar para hoje
            </button>
          )}
        </div>
        {!ehSemanaAtual && (
          <button type="button" className="link-acao focus-ring justify-self-center text-[13px] md:hidden" onClick={() => ir({ d: null })}>
            Voltar para hoje
          </button>
        )}
      </section>

      {erro && <p className="aviso-erro">! {erro}</p>}

      {semBaixa.length > 0 && (
        <section aria-labelledby="sem-baixa">
          <h2 id="sem-baixa" className="eyebrow mb-2">
            Aguardando baixa · <span className="num">{semBaixa.length}</span>
          </h2>
          <ListaVisitas visitas={semBaixa} agora={hoje} nomeDe={nomeDe} comDia onMudou={carregar} />
        </section>
      )}

      <section aria-labelledby="dias" className="grid gap-3">
        <h2 id="dias" className="eyebrow">
          {semana ? (total ? `${total} ${total === 1 ? "visita" : "visitas"} na semana` : "Nenhuma visita na semana") : "Carregando…"}
        </h2>
        <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const ativo = d === escolhido;
            const ehHoje = mesmoDia(d.dia, hoje);
            return (
              <button
                key={dataIso(d.dia)}
                type="button"
                aria-pressed={ativo}
                aria-label={`${ehHoje ? "Hoje, " : ""}${DIAS_LONGOS[d.dia.getDay()]}, ${diaMes(d.dia)}: ${
                  d.total ? `${d.total} ${d.total === 1 ? "visita" : "visitas"}` : "sem visitas"
                }`}
                onClick={() => ir({ d: dataIso(d.dia) })}
                className={clsx(
                  "focus-ring flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-sm border px-0.5 py-2",
                  ativo ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                <span
                  className={clsx(
                    "text-[11px] font-semibold uppercase leading-none",
                    ehHoje ? (ativo ? "text-surface" : "text-brand") : ativo ? "text-surface" : "text-ink-soft",
                  )}
                >
                  {DIAS_CURTOS[d.dia.getDay()]}
                </span>
                <span className="num font-display text-[20px] font-bold leading-none">{d.dia.getDate()}</span>
                <span className="num h-3 text-[11px] font-semibold leading-none">{d.total > 0 ? d.total : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dia-escolhido" className="grid gap-3">
        <h2 id="dia-escolhido" className="titulo-card">
          {mesmoDia(escolhido.dia, hoje) ? "Hoje · " : ""}
          {DIAS_LONGOS[escolhido.dia.getDay()]}, <span className="num">{diaMes(escolhido.dia)}</span>
        </h2>
        {semana && !escolhido.visitas.length && <p className="text-ink-soft">Nenhuma visita neste dia.</p>}
        {escolhido.visitas.length > 0 && (
          <ListaVisitas visitas={escolhido.visitas} agora={hoje} nomeDe={nomeDe} onMudou={carregar} />
        )}
      </section>
    </div>
  );
}
