"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Casca } from "@/components/casca";
import { useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { ConfigMensagens } from "@/components/config-mensagens";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { PERFIS, type Permissao } from "@/lib/tipos";
import { esquecerHorarioAtendimento } from "@/lib/leads-dados";
import { HORARIO_PADRAO, type HorarioAtendimento } from "@/lib/prazo";

export default function ConfiguracoesPage() {
  return (
    <Casca titulo="Configurações" soGerenteGeral>
      <div className="grid gap-8">
        <AtalhoDistribuicao />
        <Horario />
        <ConfigMensagens />
        <Permissoes />
      </div>
    </Casca>
  );
}

/** A distribuição automática tem página própria; aqui fica só o atalho. */
function AtalhoDistribuicao() {
  const { config } = useDistribuicaoStore();
  if (!config) return null;
  return (
    <Link href="/distribuicao/" className="card focus-ring block max-w-[560px] transition-colors hover:border-ink">
      <span className="eyebrow">Leads da empresa</span>
      <span className="titulo-card mt-1 block">Distribuição automática</span>
      <span className="mt-1 block text-ink-soft">{config.ligada ? "✓ Ligada" : "– Desligada"} · modo {config.modo === "equipe" ? "equipe e depois corretor" : config.modo === "direto" ? "direto ao corretor" : "só gerentes"}</span>
      <span className="link-acao mt-2 inline-block text-[13px]">Abrir</span>
    </Link>
  );
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Horário de atendimento (tabela horario_atendimento): o prazo de 15 min para o
 * primeiro contato só conta dentro dele. Todo usuário ativo lê; só o gerente geral salva.
 */
function Horario() {
  const [dias, setDias] = useState<number[] | null>(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [alterado, setAlterado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await db()
      .from("horario_atendimento")
      .select("dias, inicio, fim, updated_at")
      .maybeSingle<HorarioAtendimento & { updated_at: string }>();
    if (error) return setErro(mensagemErro(error));
    const h = data ?? { ...HORARIO_PADRAO, updated_at: null };
    setDias([...h.dias].sort((a, b) => a - b));
    setInicio(h.inicio.slice(0, 5));
    setFim(h.fim.slice(0, 5));
    setAlterado(data?.updated_at ?? null);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternarDia = (d: number) => {
    setSalvo(false);
    setDias((atual) => (atual?.includes(d) ? atual.filter((x) => x !== d) : [...(atual ?? []), d].sort((a, b) => a - b)));
  };

  async function salvar() {
    setErro(null);
    setSalvo(false);
    if (!dias?.length) return setErro("Escolha pelo menos um dia.");
    if (!inicio || !fim || inicio >= fim) return setErro("O fim precisa ser depois do início.");
    setEnviando(true);
    const { data, error } = await db()
      .from("horario_atendimento")
      .update({ dias, inicio, fim })
      .eq("id", true)
      .select("id");
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Rode o schema.sql atualizado no Supabase antes de salvar o horário.");
    esquecerHorarioAtendimento();
    setSalvo(true);
    await carregar();
  }

  return (
    <section className="grid gap-3">
      <h2 className="titulo-secao-antigo">Horário de atendimento</h2>
      <div className="card max-w-[720px]">
        <p className="text-ink-soft">
          Todo lead da empresa tem 15 min para o primeiro contato, contados só neste horário. Fora dele, o prazo começa
          na abertura seguinte.
        </p>
        {!dias && !erro && <p className="mt-3 text-ink-soft">Carregando…</p>}
        {dias && (
          <div className="mt-4 grid gap-4">
            <fieldset>
              <legend className="field-label">Dias</legend>
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((nome, d) => {
                  const marcado = dias.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => alternarDia(d)}
                      className={`focus-ring rounded-sm border px-0 py-2 text-[13px] font-semibold transition-colors ${
                        marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink"
                      }`}
                    >
                      {nome}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid max-w-[320px] grid-cols-2 gap-2">
              <div>
                <label className="field-label" htmlFor="horario-inicio">
                  Abre às
                </label>
                <input
                  id="horario-inicio"
                  type="time"
                  className="input num"
                  value={inicio}
                  onChange={(e) => {
                    setSalvo(false);
                    setInicio(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="horario-fim">
                  Fecha às
                </label>
                <input
                  id="horario-fim"
                  type="time"
                  className="input num"
                  value={fim}
                  onChange={(e) => {
                    setSalvo(false);
                    setFim(e.target.value);
                  }}
                />
              </div>
            </div>
            {erro && <p className="aviso-erro">! {erro}</p>}
            {salvo && (
              <p className="aviso-ok" role="status">
                ✓ Horário salvo. Vale no próximo acesso de cada corretor.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-red focus-ring" disabled={enviando} onClick={salvar}>
                Salvar horário
              </button>
              {alterado && (
                <span className="text-[13px] text-ink-soft">
                  Alterado em {new Date(alterado).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        )}
        {!dias && erro && <p className="aviso-erro mt-3">! {erro}</p>}
      </div>
    </section>
  );
}

/** O que cada perfil pode fazer (role_permissions). O gerente geral tem tudo, sempre. */
function Permissoes() {
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [concedidas, setConcedidas] = useState<Set<string> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [p, rp] = await Promise.all([
      db().from("permissions").select("slug, descricao, ordem").order("ordem"),
      db().from("role_permissions").select("perfil, permissao"),
    ]);
    if (p.error || rp.error) return setErro(mensagemErro(p.error ?? rp.error));
    setPermissoes(p.data as Permissao[]);
    setConcedidas(new Set((rp.data ?? []).map((r) => `${r.perfil}|${r.permissao}`)));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternar(perfil: string, permissao: string, conceder: boolean) {
    const k = `${perfil}|${permissao}`;
    setSalvando(k);
    setErro(null);
    const { error } = conceder
      ? await db().from("role_permissions").insert({ perfil, permissao })
      : await db().from("role_permissions").delete().eq("perfil", perfil).eq("permissao", permissao);
    setSalvando(null);
    if (error) return setErro(mensagemErro(error));
    await carregar();
  }

  return (
    <section className="grid gap-3">
      <h2 className="titulo-secao-antigo">Permissões por perfil</h2>
      <p className="max-w-[640px] text-ink-soft">
        O gerente geral tem todas as permissões. Qualquer usuário ativo sempre vê os próprios dados. As
        mudanças valem no próximo acesso de cada pessoa.
      </p>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!concedidas && !erro && <p className="text-ink-soft">Carregando…</p>}
      {concedidas && (
        <div className="grid gap-3 md:grid-cols-2">
          {PERFIS.filter((p) => p.slug !== "gerente_geral").map((perfil) => (
            <fieldset key={perfil.slug} className="card">
              <legend className="sr-only">{perfil.nome}</legend>
              <p className="titulo-card" aria-hidden>
                {perfil.nome}
              </p>
              <div className="mt-3 grid gap-3">
                {permissoes.map((pm) => {
                  const k = `${perfil.slug}|${pm.slug}`;
                  const marcada = concedidas.has(k);
                  return (
                    <label key={pm.slug} className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox focus-ring mt-[1px]"
                        checked={marcada}
                        disabled={salvando !== null}
                        onChange={() => alternar(perfil.slug, pm.slug, !marcada)}
                      />
                      <span>{pm.descricao}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </section>
  );
}
