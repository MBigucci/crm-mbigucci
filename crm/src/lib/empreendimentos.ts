// Empreendimentos e bairros que o Cadastro Mágico reconhece quando o catálogo
// (tabela empreendimentos) está vazio ou não carregou. Com o catálogo, a lista
// sai dele (listaDoMagico, em catalogo.ts). Atualizada pela coleta de out/2026
// (docs/empreendimentos.md, seção 5).

export type EmpreendimentoConhecido = {
  nome: string;
  /** Outras formas de escrever, além do nome (sem acento, minúsculas). */
  chaves?: string[];
  /**
   * Nome que também é palavra comum ("Life", "Alameda"): só vale com contexto,
   * como "Residencial Life" ou "Empreendimento: Life".
   */
  pedeContexto?: boolean;
};

export const EMPREENDIMENTOS: EmpreendimentoConhecido[] = [
  { nome: "Marco Zero One" },
  { nome: "Marco Zero Prime" },
  { nome: "Marco Zero Premier" },
  { nome: "Marco Zero Home" },
  { nome: "Marco Zero Tower" },
  { nome: "Marco Zero Mix", chaves: ["marco zero mix residence", "marco zero mix work"] },
  { nome: "Wynn Tower" },
  { nome: "Unique", pedeContexto: true },
  { nome: "Stylo" },
  { nome: "Exuberance", chaves: ["exuberance bellatrix"] },
  { nome: "Maximus" },
  { nome: "Domani" },
  { nome: "Essenza" },
  { nome: "Life", pedeContexto: true },
  { nome: "Mundi", chaves: ["mundi thiago", "mundi lucca", "mundi vitor"] },
  { nome: "América", chaves: ["america california", "america florida"], pedeContexto: true },
  { nome: "Sonata", chaves: ["sonata beethoven", "sonata mozart"] },
  { nome: "Alameda", pedeContexto: true },
  { nome: "Impactus" },
  { nome: "Infinite", pedeContexto: true },
  { nome: "Olimpic", chaves: ["olimpic athenas", "olimpic rio de janeiro", "olimpic londres"] },
  { nome: "Wish", pedeContexto: true },
  { nome: "Royal Palace" },
  { nome: "Imperium" },
  { nome: "New Park" },
  { nome: "Vert", pedeContexto: true },
  { nome: "First Class", chaves: ["first class premium", "first class vip"] },
  { nome: "Piemonte" },
  { nome: "Station", pedeContexto: true },
  { nome: "Alvorada", pedeContexto: true },
  { nome: "Terra Nostra", chaves: ["terra nostra parma", "terra nostra modena", "modena"] },
  { nome: "Palatium" },
  { nome: "Terrazzo" },
  { nome: "MBigucci Joy" },
  { nome: "Easy São Vicente" },
  { nome: "Easy Jaçanã" },
  { nome: "Elleva" },
  { nome: "Dom", pedeContexto: true },
];

/**
 * Bairros e cidades do ABC (e de São Paulo, onde há empreendimentos) que viram
 * sugestão de região. Ficam de fora os nomes que são palavra comum ("Centro",
 * "Jardim", "Planalto").
 */
export const BAIRROS: string[] = [
  // São Bernardo do Campo
  "Rudge Ramos",
  "Nova Petrópolis",
  "Jardim do Mar",
  "Baeta Neves",
  "Vila Gonçalves",
  "Paulicéia",
  "Jardim das Américas",
  "Cooperativa",
  "Assunção",
  "Taboão",
  "Demarchi",
  "Ferrazópolis",
  // Santo André
  "Campestre",
  "Vila Assunção",
  "Vila Bastos",
  "Santa Teresinha",
  "Parque Jaçatuba",
  "Vila Gilda",
  "Casa Branca",
  // São Caetano do Sul
  "Santa Paula",
  "Barcelona",
  "Cerâmica",
  "Santo Antônio",
  "Olímpico",
  // São Paulo
  "Ipiranga",
  "Aclimação",
  "Jabaquara",
  "Morumbi",
  "Vila Prudente",
  // Cidades
  "São Bernardo do Campo",
  "São Bernardo",
  "Santo André",
  "São Caetano do Sul",
  "São Caetano",
  "Diadema",
  "Mauá",
];
