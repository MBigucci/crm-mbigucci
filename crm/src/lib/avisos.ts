// Os tipos de aviso no celular, com o nome e a explicação de Minha conta. Puro,
// testado em avisos.test.ts contra a Edge Function. Regras em docs/notificacoes.md.

export type TipoAviso = "contato" | "visita" | "atribuido" | "prazo" | "resumo";

/** Os tipos que cada aparelho escolhe. Os slugs são os mesmos da função e do check do banco. */
export const TIPOS_AVISO: { slug: TipoAviso; nome: string; explica: string }[] = [
  { slug: "contato", nome: "Próximo contato", explica: "Na hora que você marcou para falar com o cliente." },
  { slug: "atribuido", nome: "Lead da empresa", explica: "Quando o gerente passa um lead para você." },
  { slug: "prazo", nome: "Prazo de 15 min", explica: "Quando faltam 5 min para o primeiro contato e quando o prazo estoura." },
  { slug: "visita", nome: "Visitas", explica: "Cerca de 1 hora antes e, no fim do dia, as que aguardam baixa." },
  {
    slug: "resumo",
    nome: "Resumo do dia",
    explica: "Na abertura do atendimento (9h): atrasados, contatos de hoje, visitas, quem aguarda o primeiro contato e os aniversários de clientes.",
  },
];
