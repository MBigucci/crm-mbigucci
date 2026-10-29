export type Perfil = "gerente_geral" | "operacional" | "gerente" | "corretor" | "recepcao" | "especialista";

export const PERFIS: { slug: Perfil; nome: string }[] = [
  { slug: "gerente_geral", nome: "Gerente geral" },
  { slug: "operacional", nome: "Operacional" },
  { slug: "gerente", nome: "Gerente" },
  { slug: "corretor", nome: "Corretor" },
  { slug: "recepcao", nome: "Recepção" },
  { slug: "especialista", nome: "Especialista" },
];

export const nomePerfil = (slug: string) => PERFIS.find((p) => p.slug === slug)?.nome ?? slug;

/** Gerente e gerente geral não são membros de equipe (o gerente é ligado por teams.gerente_id). */
export const perfilTemEquipe = (perfil: Perfil) => perfil !== "gerente" && perfil !== "gerente_geral";

export type Profile = {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
  equipe_id: string | null;
  ativo: boolean;
};
export const COLUNAS_PROFILE = "id, email, nome, perfil, equipe_id, ativo";

export type Team = { id: string; nome: string; gerente_id: string };

export type Permissao = { slug: string; descricao: string; ordem: number };

export type Configuracao = {
  chave: string;
  valor: unknown;
  rotulo: string;
  descricao: string;
  updated_at: string;
};
