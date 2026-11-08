"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { Interruptor } from "@/components/alicerce/interruptor";
import { Seletor } from "@/components/alicerce/seletor";
import { useToast } from "@/components/alicerce/toast";
import { ConfirmacaoAdmin, ErroAdmin, erroAdmin } from "./partes";
import { db } from "@/lib/supabase";
import { PERFIS, type Permissao } from "@/lib/tipos";

const GRUPOS: Record<string, string> = { leads: "Leads", dados: "Acesso aos dados", usuarios: "Usuários", equipes: "Equipes", empreendimentos: "Empreendimentos", painel: "Painel", metas: "Metas", plantao: "Plantão", plantoes: "Stands", lancamentos: "Lançamentos", acoes: "Ações", pontos_gerente: "Programa dos gerentes", parceiros: "Parcerias", distribuicao: "Distribuição", vendas: "Vendas" };
export function PermissoesAdmin() {
  const [celular, setCelular] = useState(false);
  useEffect(() => { const m = matchMedia("(max-width: 767px)"); const ler = () => setCelular(m.matches); ler(); m.addEventListener("change", ler); return () => m.removeEventListener("change", ler); }, []);
  const toast = useToast(); const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [base, setBase] = useState<Set<string> | null>(null); const [rascunho, setRascunho] = useState<Set<string>>(new Set());
  const [pessoas, setPessoas] = useState<{ id: string; perfil: string; ativo: boolean }[]>([]);
  const [perfil, setPerfil] = useState("corretor"); const [erro, setErro] = useState(false); const [confirmando, setConfirmando] = useState(false);
  const carregar = useCallback(async () => {
    setErro(false);
    const [p, r, u] = await Promise.all([db().from("permissions").select("slug, descricao, ordem").order("ordem"), db().from("role_permissions").select("perfil, permissao"), db().from("profiles").select("id, perfil, ativo")]);
    if (p.error || r.error || u.error) return setErro(true);
    const l = new Set<string>((r.data ?? []).map(v => `${v.perfil}|${v.permissao}`));
    setPermissoes(p.data as Permissao[]); setBase(l); setRascunho(new Set(l)); setPessoas(u.data ?? []);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  const mudancas = useMemo(() => base ? [...new Set([...base, ...rascunho])].filter(k => base.has(k) !== rascunho.has(k)) : [], [base, rascunho]);
  const grupos = [...new Set(permissoes.map(p => p.slug.split(".")[0]))];
  const perfisAfetados = new Set(mudancas.map(k => k.split("|")[0]));
  const pessoasAfetadas = pessoas.filter(p => p.ativo && perfisAfetados.has(p.perfil)).length;
  function alternar(k: string) { setRascunho(atual => { const n = new Set(atual); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }
  async function salvar() {
    const atualizado = new Set(base ?? []);
    for (const k of mudancas) {
      const [p, pm] = k.split("|");
      const r = rascunho.has(k) ? await db().from("role_permissions").insert({ perfil: p, permissao: pm }) : await db().from("role_permissions").delete().eq("perfil", p).eq("permissao", pm);
      if (r.error) { const feitos = mudancas.filter(c => atualizado.has(c) === rascunho.has(c)).length; setBase(new Set(atualizado)); return feitos > 0 ? `${feitos} ${feitos === 1 ? "alteração foi salva" : "alterações foram salvas"}. ${mudancas.length - feitos} ${mudancas.length - feitos === 1 ? "continua" : "continuam"} sem salvar. Confira a conexão e tente de novo.` : erroAdmin(r.error); }
      if (rascunho.has(k)) atualizado.add(k); else atualizado.delete(k);
    }
    setBase(atualizado); toast.mostrar("Permissões salvas. Valem no próximo acesso de cada pessoa.", { tipo: "sucesso" }); return null;
  }
  return <Cartao id="t-permissoes" secao="permissoes" titulo="Permissões por perfil" descricao="O gerente geral tem todas, sempre. As mudanças só valem depois de salvar, no próximo acesso de cada pessoa.">
    {erro ? <ErroAdmin tentar={() => void carregar()} /> : !base ? <CarregandoTabela texto="Carregando permissões…" /> : <div className="admin-pilha admin-matriz">
      <div className="mb-so-celular">
        <span className="mb-campo__rotulo" id="admin-perfil">Perfil</span>
        <Seletor idRotulo="admin-perfil" valor={perfil} onChange={setPerfil} pequeno grade="linha" opcoes={PERFIS.map(p => ({ valor: p.slug, rotulo: p.nome }))} />
      </div>
      <div className="mb-tabela-envoltorio" tabIndex={0} role="region" aria-label="Permissões por perfil. No computador, role para ver os perfis.">
        <table className="mb-tabela mb-matriz mb-tabela--primeira-fixa">
          <thead>
            <tr>
              <th scope="col">Ação</th>{PERFIS.map(p => <th key={p.slug} scope="col" data-perfil={p.slug} data-perfil-ativo={perfil === p.slug}>
                <span className="mb-matriz__perfil">{p.nome}<span>{pessoas.filter(u => u.ativo && u.perfil === p.slug).length} {pessoas.filter(u => u.ativo && u.perfil === p.slug).length === 1 ? "pessoa ativa" : "pessoas ativas"}</span>
                </span>
              </th>)}</tr>
          </thead>
          <tbody>{grupos.map(grupo => <Grupo key={grupo} colunas={celular ? 2 : PERFIS.length + 1} nome={GRUPOS[grupo] ?? "Outras ações"}>{permissoes.filter(pm => pm.slug.split(".")[0] === grupo).map(pm => <tr key={pm.slug}>
            <td>
              <div className="mb-matriz__acao">
                <strong>{pm.descricao}</strong>
              </div>
            </td>{PERFIS.map(p => {
              const k = `${p.slug}|${pm.slug}`; return <td key={p.slug} data-perfil={p.slug} data-perfil-ativo={perfil === p.slug} className={base.has(k) !== rascunho.has(k) ? "mb-matriz__mudou" : undefined}>{p.slug === "gerente_geral" ? <span className="mb-matriz__fixo">Sempre</span> : <>
                <label className="mb-marcador mb-so-computador">
                  <input type="checkbox" checked={rascunho.has(k)} aria-label={`${p.nome}: ${pm.descricao}`} onChange={() => alternar(k)} />
                </label>
                <div className="mb-so-celular">
                  <Interruptor ligado={rascunho.has(k)} rotulo={`${p.nome}: ${pm.descricao}. Alteração pendente até salvar.`} onAlternar={() => alternar(k)} />
                </div>
              </>}</td>;
            })}</tr>)}</Grupo>)}</tbody>
        </table>
      </div>
      {!!mudancas.length && <div className="mb-lote">
        <span className="mb-lote__contagem">{mudancas.length} {mudancas.length === 1 ? "alteração não salva" : "alterações não salvas"}</span>
        <button className="mb-botao mb-botao--discreto" onClick={() => setRascunho(new Set(base))}>Descartar alterações</button>
        <button className="mb-botao mb-botao--primario" onClick={() => setConfirmando(true)}>Salvar permissões…</button>
      </div>}
    </div>}
    <ConfirmacaoAdmin aberto={confirmando} titulo="Salvar as alterações de permissões?" verbo="Salvar permissões" onFechar={() => setConfirmando(false)} confirmar={salvar}>
      <p>{mudancas.length} {mudancas.length === 1 ? "alteração afeta" : "alterações afetam"} {pessoasAfetadas} {pessoasAfetadas === 1 ? "pessoa ativa" : "pessoas ativas"}. Valem a partir do próximo acesso de cada pessoa.</p>
      <ul>{mudancas.slice(0, 6).map(k => { const [p, pm] = k.split("|"); return <li key={k}>{PERFIS.find(x => x.slug === p)?.nome}: {rascunho.has(k) ? "permitir" : "retirar"} {permissoes.find(x => x.slug === pm)?.descricao.toLocaleLowerCase("pt-BR")}</li>; })}</ul>{mudancas.length > 6 && <p>Mais {mudancas.length - 6} alterações marcadas na matriz.</p>}</ConfirmacaoAdmin>
  </Cartao>;
}
function Grupo({ nome, children, colunas }: { nome: string; children: React.ReactNode; colunas: number }) {
  return <>
    <tr className="mb-matriz__grupo">
      <th colSpan={colunas} scope="colgroup">{nome}</th>
    </tr>{children}</>;
}
