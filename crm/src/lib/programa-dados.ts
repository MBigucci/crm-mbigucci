"use client";

// Leitura e escrita do programa de pontuação no Supabase. Quem pode o quê (as
// permissões, a aprovação só pelo gerente geral, o período sem duplicar) fica no
// banco: aqui só se grava e se traduz o erro. Regras em docs/pontuacao-verba.md.

import { useCallback, useEffect, useRef, useState } from "react";
import { db, novoId } from "./supabase";
import { mensagemErro } from "./erros";
import { COLUNAS_CRITERIO, COLUNAS_LANCAMENTO, type Criterio, type Lancamento, type SlugCriterio, type StatusLancamento, type Turno, type StandGerente, type CheckinGerente } from "./programa";

type Resultado = Promise<string | null>;
const PAGINA = 1000;

function erroPrograma(e: { message?: string; code?: string } | null): string | null {
  if (!e) return null;
  const m = e.message ?? "";
  if (e.code === "P0001" || /^(Adicione|Envie|Escolha|Você |Este stand|Localização|Stand sem|Só o gerente|A data|Lançamentos|O comprovante)/.test(m)) return m;
  if (m.includes("lancamentos_periodo_unico")) return "Esse período já está marcado para o corretor.";
  if (m.includes("lancamentos_saida_com_foto")) return "Cole o link da foto da saída para visita.";
  if (m.includes("lancamentos_pontos_comprovante_check")) return "O comprovante precisa ser um link que começa com https://.";
  if (m.includes("lancamentos_recusa_tem_motivo")) return "Escreva o motivo da recusa.";
  const traduzido = mensagemErro(e);
  return traduzido === m ? "Não foi possível concluir esta ação. Tente de novo." : traduzido;
}

export function useCriterios() {
  const [criterios, setCriterios] = useState<Criterio[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    db()
      .from("criterios_pontos")
      .select(COLUNAS_CRITERIO)
      .order("ordem")
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setCriterios((data ?? []) as Criterio[])));
  }, [versao]);
  return { criterios, erro, recarregar: useCallback(() => setVersao((v) => v + 1), []) };
}

export async function salvarCriterio(slug: SlugCriterio, campos: Pick<Criterio, "nome" | "pontos" | "limite_mes">): Resultado {
  const { error } = await db().from("criterios_pontos").update(campos).eq("slug", slug);
  return erroPrograma(error);
}

/**
 * Lançamentos com data em [ini, fim). O RLS limita ao que a pessoa vê (o
 * corretor, só os próprios aprovados). `criterio` filtra um só.
 */
export function useLancamentos(ini: string, fim: string, filtro?: { criterio?: SlugCriterio; corretor?: string | null; status?: StatusLancamento }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { criterio, corretor, status } = filtro ?? {};
  const leitura = useRef("");
  useEffect(() => {
    let vivo = true;
    const chave = JSON.stringify([ini, fim, criterio, corretor, status]);
    if (leitura.current !== chave) { setLancamentos(null); leitura.current = chave; }
    setErro(null);
    (async () => {
      const lista: Lancamento[] = [];
      for (let de = 0; ; de += PAGINA) {
        let q = db().from("lancamentos_pontos").select(COLUNAS_LANCAMENTO).gte("data", ini).lt("data", fim);
        if (criterio) q = q.eq("criterio", criterio);
        if (corretor) q = q.eq("corretor_id", corretor);
        if (status) q = q.eq("status", status);
        const { data, error } = await q.order("data").order("lancado_em").order("id").range(de, de + PAGINA - 1);
        if (error) return vivo && setErro(erroPrograma(error));
        lista.push(...((data ?? []) as Lancamento[]));
        if (!data || data.length < PAGINA) break;
      }
      if (vivo) {
        setErro(null);
        setLancamentos(lista);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ini, fim, criterio, corretor, status, versao]);
  return { lancamentos, erro, recarregar };
}

export type NovoLancamento = {
  id?: string;
  corretor_id: string;
  criterio: Exclude<SlugCriterio, "visita">;
  data: string;
  periodo?: Turno | null;
  quantidade?: number;
  comprovante?: string | null;
  tipo_acao?: "video" | "blitz" | null;
  comprovante_arquivo?: string | null;
  saida_visita?: boolean;
  observacao?: string | null;
};

/** Lança (sempre pendente). Devolve o id, para o Desfazer. */
export async function lancar(d: NovoLancamento): Promise<{ id: string | null; erro: string | null }> {
  const campos = d.criterio === "video" ? { ...d, tipo_acao: d.tipo_acao ?? "video" } : d;
  const { data, error } = await db().from("lancamentos_pontos").insert(campos).select("id").maybeSingle();
  return { id: (data?.id as string) ?? null, erro: erroPrograma(error) };
}

/**
 * Muda o status de um ou vários lançamentos: aprovar, recusar e voltar para
 * pendente (só o gerente geral), cancelar e desfazer o cancelamento (quem lançou).
 */
export async function mudarStatus(ids: string[], status: StatusLancamento, motivo?: string): Resultado {
  if (!ids.length) return null;
  const { data, error } = await db()
    .from("lancamentos_pontos")
    .update({ status, motivo_recusa: status === "recusado" ? (motivo ?? null) : null })
    .in("id", ids)
    .select("id");
  if (error) return erroPrograma(error);
  // O RLS não dá erro quando a linha não pode ser alterada: só não altera nada.
  return data?.length === ids.length ? null : "Alguns lançamentos não puderam ser alterados. Atualize a página.";
}

export type CorretorPlantao = { id: string; nome: string; equipe: string | null };

/** Corretores da tela do plantão (todos para a recepção; a equipe para o gerente). */
export function useCorretoresPlantao() {
  const [corretores, setCorretores] = useState<CorretorPlantao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    db()
      .rpc("plantao_corretores")
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setCorretores((data ?? []) as CorretorPlantao[])));
  }, []);
  return { corretores, erro };
}

export type LinhaRanking = { corretor_id: string; nome: string; pontos: number };

/** Ranking de pontos aprovados no mês (`mes` = "2026-11-01"). */
export function useRanking(mes: string) {
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    setLinhas(null);
    db()
      .rpc("ranking_pontos", { p_mes: mes })
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setLinhas((data ?? []) as LinhaRanking[])));
  }, [mes]);
  return { linhas, erro };
}

export type Fechamento = {
  mes: string;
  corretor_id: string;
  pontos: number;
  pontos_validos: number;
  vendas: number;
  vgv: number;
  verba: number;
  premio: number;
  fechado_por: string | null;
  fechado_em: string;
};
const COLUNAS_FECHAMENTO = "mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio, fechado_por, fechado_em";

/** Fechamentos do mês (`mes` = "2026-11-01"); o corretor só recebe o dele. */
export function useFechamentos(mes: string) {
  const [fechamentos, setFechamentos] = useState<Fechamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    db()
      .from("fechamentos_verba")
      .select(COLUNAS_FECHAMENTO)
      .eq("mes", mes)
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setFechamentos((data ?? []) as Fechamento[])));
  }, [mes, versao]);
  return { fechamentos, erro, recarregar: useCallback(() => setVersao((v) => v + 1), []) };
}

/** Fecha (ou fecha de novo) o mês: grava a foto do cálculo por corretor. */
export async function fecharMes(linhas: Omit<Fechamento, "fechado_por" | "fechado_em">[], mes = linhas[0]?.mes): Resultado {
  const { error } = await db().rpc("fechar_programa_mes", { p_mes: mes, p_corretores: linhas });
  return erroPrograma(error);
}

export type DadosGerente = { parceiros: number; stands: StandGerente[]; checkins: CheckinGerente[]; parcerias_instaladas: boolean };
export type GerentePrograma = { id: string; nome: string; dados: DadosGerente };
export type FechamentoGerente = { mes: string; gerente_id: string; parceiros: number; pontos_parceiros: number; pontos_checkins: number; premio: number; fechado_em: string };

function useRpcPrograma<T>(nome: string, args: Record<string, unknown>, ativo = true) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const chave = JSON.stringify(args);
  const leitura = useRef("");
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    // Atualizar o mesmo mês preserva painel, rascunho e foco durante a leitura.
    if (leitura.current !== nome + chave) { setDados(null); leitura.current = nome + chave; }
    setErro(null);
    db().rpc(nome, JSON.parse(chave)).then(({ data, error }) => {
      if (!vivo) return;
      if (error) setErro(erroPrograma(error)); else setDados(data as T);
    });
    return () => { vivo = false; };
  }, [nome, chave, versao, ativo]);
  return { dados, erro, recarregar: useCallback(() => setVersao(v => v + 1), []) };
}
export const usePontosGerente = (mes: string) => useRpcPrograma<DadosGerente>("pontos_gerente", { p_mes: mes });
export const useGerentesPrograma = (mes: string) => useRpcPrograma<GerentePrograma[]>("programa_gerentes", { p_mes: mes });

export async function definirStandGerente(gerente: string, stand: string, ativo: boolean): Resultado {
  const { error } = await db().rpc("definir_stand_gerente", { p_gerente: gerente, p_stand: stand, p_ativo: ativo });
  return erroPrograma(error);
}
export async function registrarCheckinGerente(stand: string, p: { lat: number; lng: number; precisao: number }) {
  const { data, error } = await db().rpc("checkin_gerente", { p_stand: stand, p_lat: p.lat, p_lng: p.lng, p_precisao: p.precisao });
  return { dados: data as { repetido: boolean; distancia_m: number } | null, erro: erroPrograma(error) };
}
export async function verComprovante(caminho: string): Promise<{ url?: string; erro?: string }> {
  const { data, error } = await db().storage.from("comprovantes").createSignedUrl(caminho, 120);
  return error || !data ? { erro: "Não foi possível abrir o comprovante. Tente de novo." } : { url: data.signedUrl };
}
export async function cancelarAcao(id: string, desfazer = false): Resultado {
  const { error } = await db().rpc("cancelar_acao", { p_id: id, p_desfazer: desfazer });
  return erroPrograma(error);
}

/** Caminho do arquivo e id do lançamento estáveis contra reenvio após perda da resposta. */
export async function enviarAcao(d: NovoLancamento, arquivo: Blob | null, dono: string): Promise<{ erro: string | null; id: string }> {
  const id = d.id ?? novoId();
  const caminho = arquivo ? `${dono}/${id}.jpg` : null;
  if (arquivo && caminho) {
    const { error } = await db().storage.from("comprovantes").upload(caminho, arquivo, { contentType: "image/jpeg", upsert: false });
    // O mesmo nome só é usado ao repetir este envio: nunca sobrescreve o objeto.
    if (error && !["409", "Duplicate"].includes(String((error as { statusCode?: string }).statusCode)) && !/already exists|Duplicate/i.test(error.message))
      return { id, erro: "Não foi possível enviar a imagem. O arquivo continua aqui. Tente de novo." };
  }
  const r = await lancar({ ...d, id, comprovante_arquivo: caminho });
  if (r.erro) {
    // Se a resposta do primeiro insert se perdeu, uma repetição não cria outra ação.
    const { data } = await db().from("lancamentos_pontos").select("id").eq("id", id).eq("lancado_por", dono).maybeSingle();
    if (data?.id === id) return { id, erro: null };
  }
  return { id, erro: r.erro };
}

