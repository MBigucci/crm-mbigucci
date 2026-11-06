// Leitura e gravação da tela Direcionador: só as funções cfg_* do banco
// (crm/supabase/direcionador.sql), cada uma conferindo is_gerente_geral().
// As tabelas ficam no esquema interno, fora da API. Os endereços vão para o
// Vault e voltam mascarados.

import { db } from "./supabase";
import { mensagemErro } from "./erros";
import type { ConfigTela, Endereco, ProdutoTela } from "./telas";

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(nome, args);
  if (error) throw new Error(mensagemErro(error));
  return data as T;
}

/** null: quem não é o gerente geral recebe zero linhas. */
export async function lerConfig(): Promise<ConfigTela | null> {
  const linhas = await rpc<ConfigTela[] | null>("cfg_ler");
  return linhas?.[0] ?? null;
}

/** Os produtos do catálogo (todo usuário ativo lê), para as regras e o simulador. */
export async function lerProdutos(): Promise<ProdutoTela[]> {
  const { data, error } = await db().from("empreendimentos").select("id, nome, ativo, ordem").order("ordem").order("nome");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as { id: string; nome: string; ativo: boolean }[]).filter((e) => e.ativo).map(({ id, nome }) => ({ id, nome }));
}

export const salvarChaveGeral = (ativo: boolean) => rpc<boolean>("cfg_salvar", { p_ativo: ativo });

export type DadosDestino = { id?: string; nome: string; modo: "email" | "porta"; registrar_envios: boolean; limite_dia: number | null; ativo: boolean };
export const salvarDestino = (p: DadosDestino) => rpc<string>("cfg_item_salvar", { p });
export const excluirDestino = (id: string) => rpc<void>("cfg_item_excluir", { p_id: id });
export const salvarEndereco = (id: string, valor: { email?: string; url?: string; chave?: string }) =>
  rpc<Endereco>("cfg_item_endereco_salvar", { p_id: id, p_valor: valor });

export type DadosRegra = {
  id?: string;
  nome: string;
  ativa: boolean;
  produtos: string[];
  fontes: string[];
  dias: number[];
  hora_inicio: string;
  hora_fim: string;
  partes: { destino_id: string; porcentagem: number }[];
};
export const salvarRegra = (p: DadosRegra) => rpc<string>("cfg_regra_salvar", { p });
export const ligarRegra = (id: string, ativa: boolean) => rpc<void>("cfg_regra_ligar", { p_id: id, p_ativa: ativa });
export const ordenarRegras = (ids: string[]) => rpc<void>("cfg_regra_ordem", { p_ids: ids });
export const excluirRegra = (id: string) => rpc<void>("cfg_regra_excluir", { p_id: id });
