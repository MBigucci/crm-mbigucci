"use client";

// Leitura e escrita de vendas e metas no Supabase. As regras (quem pode,
// correção com motivo, etapa do lead e histórico) ficam no banco: aqui só se
// grava e se traduz o erro. Regras em docs/vendas-metas.md.

import { useCallback, useEffect, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import { COLUNAS_VENDA, diaIso, type Venda } from "./vendas";
import { COLUNAS_META, COLUNAS_META_VGV, inicioDosDados, type DadosMetas, type Meta, type MetaVgv } from "./metas";

export type VendaComLead = Venda & { lead: { id: string; nome: string } | null };
export const COLUNAS_VENDA_COM_LEAD = `${COLUNAS_VENDA}, lead:leads(id, nome)`;

type Resultado = Promise<string | null>;
const erro = (e: { message?: string } | null) => (e ? mensagemErro(e) : null);
/** O Supabase devolve no máximo 1.000 linhas por vez: busca em páginas. */
const PAGINA = 1000;

/**
 * Vendas assinadas em [ini, fim) ("2026-10-01"), com o nome do lead. O RLS
 * limita ao que a pessoa vê. `corretor` filtra um só. Se a leitura falhar (o
 * SQL das vendas ainda não rodou), devolve o erro e as telas seguem sem elas.
 */
export function useVendas(ini: string, fim: string, corretor?: string | null) {
  const [vendas, setVendas] = useState<VendaComLead[] | null>(null);
  const [erroLeitura, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista: VendaComLead[] = [];
      for (let de = 0; ; de += PAGINA) {
        let q = db().from("vendas").select(COLUNAS_VENDA_COM_LEAD).gte("assinada_em", ini).lt("assinada_em", fim);
        if (corretor) q = q.eq("corretor_id", corretor);
        const { data, error } = await q.order("assinada_em", { ascending: false }).order("id").range(de, de + PAGINA - 1);
        if (error) return vivo && setErro(mensagemErro(error));
        lista.push(...((data ?? []) as unknown as VendaComLead[]));
        if (!data || data.length < PAGINA) break;
      }
      if (vivo) {
        setErro(null);
        setVendas(lista);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ini, fim, corretor, versao]);
  return { vendas, erro: erroLeitura, recarregar };
}

export const useVendasDoAno = (ano: number, corretor?: string | null) => useVendas(`${ano}-01-01`, `${ano + 1}-01-01`, corretor);

export async function registrarVenda(d: {
  lead_id: string;
  empreendimento: string;
  unidade: string | null;
  vgv: number;
  assinada_em: string;
  pagamento: Venda["pagamento"];
  pago_em: string | null;
  observacao: string | null;
}): Resultado {
  const { error } = await db().from("vendas").insert(d);
  return erro(error);
}

/** Pendente → pago: o andamento normal, sem motivo. */
export async function marcarPaga(id: string, pago_em: string): Resultado {
  const { data, error } = await db().from("vendas").update({ pagamento: "pago", pago_em }).eq("id", id).select("id");
  if (error) return erro(error);
  // O RLS não dá erro quando a linha não pode ser alterada: só não altera nada.
  return data?.length ? null : "Você não tem permissão para isso.";
}

/** Corrigir, cancelar ou reativar, com o motivo, que vai para o histórico. */
export async function corrigirVenda(
  id: string,
  campos: Partial<Pick<Venda, "empreendimento" | "unidade" | "vgv" | "assinada_em" | "pagamento" | "pago_em" | "observacao" | "status">>,
  motivo: string,
): Resultado {
  const { error } = await db().rpc("corrigir_venda", { p_venda: id, p_campos: campos, p_motivo: motivo });
  return erro(error);
}

// ---------- Metas ----------

/** Linhas de metas_vgv do ano (a geral e as dos corretores que a pessoa vê). */
export function useMetasVgv(ano: number) {
  const [linhas, setLinhas] = useState<MetaVgv[] | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    db()
      .from("metas_vgv")
      .select(COLUNAS_META_VGV)
      .eq("ano", ano)
      .then(({ data, error }) => vivo && setLinhas(error ? [] : ((data ?? []) as MetaVgv[])));
    return () => {
      vivo = false;
    };
  }, [ano, versao]);
  return { linhas, recarregar };
}

/** Grava a meta do ano (geral, com corretor null, ou de um corretor): altera a linha se ela existe. */
export async function salvarMetaVgv(ano: number, corretor: string | null, valor: number, existente?: MetaVgv): Resultado {
  if (existente) {
    const { data, error } = await db().from("metas_vgv").update({ valor }).eq("id", existente.id).select("id");
    if (error) return erro(error);
    return data?.length ? null : "Você não tem permissão para isso.";
  }
  const { error } = await db().from("metas_vgv").insert({ ano, corretor_id: corretor, valor });
  return erro(error);
}

/** Tira a meta própria do corretor: volta a valer a geral. */
export async function excluirMetaVgv(id: string): Resultado {
  const { error } = await db().from("metas_vgv").delete().eq("id", id);
  return erro(error);
}

/** Metas próprias de um corretor (o RLS deixa o gerente ver as da equipe). */
export function useMetas(dono: string | null) {
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [erroLeitura, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  useEffect(() => {
    if (!dono) return;
    let vivo = true;
    db()
      .from("metas")
      .select(COLUNAS_META)
      .eq("dono_id", dono)
      .order("created_at")
      .then(({ data, error }) => {
        if (!vivo) return;
        setErro(error ? mensagemErro(error) : null);
        setMetas(error ? [] : ((data ?? []) as Meta[]));
      });
    return () => {
      vivo = false;
    };
  }, [dono, versao]);
  return { metas, erro: erroLeitura, recarregar };
}

export type CamposMeta = Pick<Meta, "metrica" | "periodo" | "inicio" | "meses" | "valor" | "no_painel">;

export async function salvarMeta(campos: CamposMeta, id?: string): Resultado {
  const r = id ? await db().from("metas").update(campos).eq("id", id) : await db().from("metas").insert(campos);
  if (r.error?.message.includes("metas_sem_duplicar")) return "Já existe uma meta com essa métrica e esse período. Edite a que está na lista.";
  return erro(r.error);
}

export async function excluirMeta(id: string): Resultado {
  const { error } = await db().from("metas").delete().eq("id", id);
  return erro(error);
}

/**
 * O que o progresso das metas do corretor precisa, desde o período mais antigo:
 * cadastros e mudanças de etapa feitos por ele, visitas e vendas dele.
 */
export function useDadosMetas(corretor: string | null, metas: Meta[] | null): DadosMetas | null {
  const [dados, setDados] = useState<DadosMetas | null>(null);
  const ini = metas ? inicioDosDados(metas, new Date()) : null;
  const chave = ini ? ini.toISOString() : "";
  useEffect(() => {
    if (!corretor || !chave) return;
    let vivo = true;
    (async () => {
      const desde = new Date(chave);
      const eventos: DadosMetas["eventos"] = [];
      for (let de = 0; ; de += PAGINA) {
        const { data, error } = await db()
          .from("lead_eventos")
          .select("lead_id, tipo, de, para, autor_id, criado_em")
          .eq("autor_id", corretor)
          .in("tipo", ["criado", "etapa"])
          .gte("criado_em", desde.toISOString())
          .order("criado_em")
          .order("id")
          .range(de, de + PAGINA - 1);
        if (error) break;
        eventos.push(...((data ?? []) as DadosMetas["eventos"]));
        if (!data || data.length < PAGINA) break;
      }
      const [v, s] = await Promise.all([
        db().from("visitas").select("corretor_id, status, inicio").eq("corretor_id", corretor).eq("status", "realizada").gte("inicio", desde.toISOString()),
        db().from("vendas").select("corretor_id, assinada_em, status, pagamento, vgv").eq("corretor_id", corretor).gte("assinada_em", diaIso(desde)),
      ]);
      if (!vivo) return;
      setDados({
        eventos,
        visitas: (v.data ?? []) as DadosMetas["visitas"],
        vendas: (s.data ?? []) as DadosMetas["vendas"],
      });
    })();
    return () => {
      vivo = false;
    };
  }, [corretor, chave]);
  return dados;
}

/** Nomes de pessoas (o RLS de profiles limita ao que a pessoa vê). */
export function useNomes(ids: string[]): Map<string, string> {
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const chave = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    if (!chave) return;
    db()
      .from("profiles")
      .select("id, nome")
      .in("id", chave.split(","))
      .then(({ data }) => setNomes(new Map((data ?? []).map((p) => [p.id as string, p.nome as string]))));
  }, [chave]);
  return nomes;
}
