// Os tipos de aviso no celular, com o nome e a explicação de Minha conta. Puro,
// testado em avisos.test.ts contra a Edge Function. Regras em docs/notificacoes.md.

export type TipoAviso = "contato" | "visita" | "atribuido" | "prazo" | "resumo" | "equipe";

type TipoNaTela = {
  slug: TipoAviso;
  nome: string;
  explica: string;
  /** Só aparece para quem tem esta permissão (role_permissions). */
  exige?: string;
};

/** Os tipos que cada aparelho escolhe. Os slugs são os mesmos da função e do check do banco. */
export const TIPOS_AVISO: TipoNaTela[] = [
  { slug: "contato", nome: "Próximo contato", explica: "Na hora que você marcou para falar com o cliente." },
  { slug: "atribuido", nome: "Lead da empresa", explica: "Quando o gerente passa um lead para você." },
  { slug: "prazo", nome: "Prazo de 15 min", explica: "Quando faltam 5 min para o primeiro contato e quando o prazo estoura." },
  { slug: "visita", nome: "Visitas", explica: "Cerca de 1 hora antes e, no fim do dia, as que aguardam baixa." },
  {
    slug: "resumo",
    nome: "Resumo do dia",
    explica: "Na abertura do atendimento (9h): atrasados, contatos de hoje, visitas, quem aguarda o primeiro contato e os aniversários de clientes.",
  },
  {
    slug: "equipe",
    nome: "Equipe",
    explica: "Quando um lead da empresa estoura o prazo de 15 min e, no fim do dia, as visitas da equipe que aguardam baixa.",
    exige: "dados.ver_equipe",
  },
];

/** Os tipos que esta pessoa vê em Minha conta, pelas permissões do perfil. */
export const tiposDoAparelho = (pode: (permissao: string) => boolean) =>
  TIPOS_AVISO.filter((t) => !t.exige || pode(t.exige));
