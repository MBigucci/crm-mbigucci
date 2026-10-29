"use client";

import { useCallback, useEffect, useState } from "react";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { PERFIS, type Configuracao, type Permissao } from "@/lib/tipos";

export default function ConfiguracoesPage() {
  return (
    <Casca titulo="Configurações" soGerenteGeral>
      <div className="grid gap-8">
        <Chaves />
        <Permissoes />
      </div>
    </Casca>
  );
}

/**
 * Chaves do sistema. Rótulo e descrição vêm do banco (app_settings), que só o
 * gerente geral lê: o código do site é público e não deve citar as chaves.
 */
function Chaves() {
  const [chaves, setChaves] = useState<Configuracao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await db()
      .from("app_settings")
      .select("chave, valor, rotulo, descricao, updated_at")
      .order("chave");
    if (error) return setErro(mensagemErro(error));
    setChaves(data as Configuracao[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternar(c: Configuracao) {
    setEnviando(true);
    const { data, error } = await db()
      .from("app_settings")
      .update({ valor: c.valor !== true })
      .eq("chave", c.chave)
      .select("chave");
    setEnviando(false);
    setConfirmando(null);
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Você não tem permissão para alterar esta chave.");
    await carregar();
  }

  return (
    <section className="grid gap-3">
      <span className="eyebrow">Chaves</span>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!chaves && !erro && <p className="text-concrete">Carregando…</p>}
      {chaves?.map((c) => {
        const ligada = c.valor === true;
        return (
          <div key={c.chave} className={`card max-w-[720px] ${ligada ? "bar-brand" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="titulo-card">{c.rotulo}</p>
                <p className="mt-1 text-ink-soft">{c.descricao}</p>
                <p className={`mt-2 text-[13px] font-semibold ${ligada ? "text-brand" : "text-concrete"}`}>
                  {ligada ? "✓ Ligada" : "– Desligada"}
                  <span className="font-normal text-concrete">
                    {" "}
                    · alterada em {new Date(c.updated_at).toLocaleString("pt-BR")}
                  </span>
                </p>
              </div>
              {confirmando === c.chave ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-red focus-ring"
                    disabled={enviando}
                    onClick={() => alternar(c)}
                  >
                    {ligada ? "Confirmar: desligar" : "Confirmar: ligar"}
                  </button>
                  <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmando(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmando(c.chave)}>
                  {ligada ? "Desligar" : "Ligar"}
                </button>
              )}
            </div>
          </div>
        );
      })}
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
      <span className="eyebrow">Permissões por perfil</span>
      <p className="max-w-[640px] text-ink-soft">
        O gerente geral tem todas as permissões. Qualquer usuário ativo sempre vê os próprios dados. As
        mudanças valem no próximo acesso de cada pessoa.
      </p>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!concedidas && !erro && <p className="text-concrete">Carregando…</p>}
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
