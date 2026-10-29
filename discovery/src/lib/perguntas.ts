import { z } from "zod";

/**
 * Perguntas da pesquisa. Tom de escuta: a ferramenta é do corretor, para o dia a dia dele.
 * Não citar verba, campanhas pagas pela empresa nem prestação de contas — isso só será
 * apresentado na reunião de novembro. Os temas aparecem de forma implícita (origem dos
 * clientes, números do próprio trabalho), e cada tela abre espaço para o corretor explicar.
 *
 * O `id` é o que vai para a planilha; o `rotulo`, o que o corretor lê.
 */
export type Opcao = { id: string; rotulo: string; apoio?: string };

export const CONTROLE_ATUAL: Opcao[] = [
  { id: "caderno", rotulo: "Caderno ou papel" },
  { id: "planilha", rotulo: "Planilha", apoio: "Excel ou Google Planilhas" },
  { id: "notas", rotulo: "Bloco de notas do celular" },
  { id: "whatsapp", rotulo: "Pelo próprio WhatsApp", apoio: "Conversas fixadas, etiquetas, listas" },
  { id: "agenda", rotulo: "Agenda ou lembretes do celular" },
  { id: "outro_crm", rotulo: "Um CRM ou aplicativo" },
  { id: "memoria", rotulo: "De cabeça" },
];

export const ORIGENS: Opcao[] = [
  { id: "plantao", rotulo: "Plantão e stand" },
  { id: "indicacao", rotulo: "Indicação de clientes e amigos" },
  { id: "carteira", rotulo: "Minha carteira antiga" },
  { id: "empresa", rotulo: "Contatos que a empresa me repassa" },
  { id: "redes", rotulo: "Minhas redes sociais", apoio: "Posts, stories, reels" },
  { id: "anuncios", rotulo: "Anúncios ou impulsionamentos que eu faço" },
  { id: "grupos_portais", rotulo: "Grupos, portais e parcerias" },
  { id: "outro", rotulo: "Outro" },
];

export const FORMAS_REGISTRO: Opcao[] = [
  { id: "digitando", rotulo: "Digitando rapidinho no celular" },
  { id: "audio", rotulo: "Mandando um áudio" },
  { id: "encaminhar_whatsapp", rotulo: "Encaminhando o contato ou a conversa do WhatsApp" },
  { id: "print", rotulo: "Mandando um print ou foto" },
  { id: "depois", rotulo: "Anoto o básico e completo depois, com calma" },
  { id: "outro", rotulo: "Outro jeito" },
];

export const TEMPOS_CADASTRO: Opcao[] = [
  { id: "10s", rotulo: "Até 10 segundos" },
  { id: "30s", rotulo: "Até 30 segundos" },
  { id: "1min", rotulo: "Até 1 minuto" },
  { id: "tanto_faz", rotulo: "Tanto faz, se depois me ajudar a vender" },
];

export const VISOES: Opcao[] = [
  {
    id: "kanban",
    rotulo: "Quadro por etapas",
    apoio: "Colunas como novo, em contato, visita, proposta. Arrasto o cliente de uma para outra.",
  },
  {
    id: "lista_dia",
    rotulo: "Lista do dia",
    apoio: "Quem eu preciso chamar hoje, em ordem. Abro e já sei por onde começar.",
  },
  { id: "nenhuma", rotulo: "Nenhuma das duas", apoio: "Conto como eu imagino logo abaixo." },
];

export const NUMEROS: Opcao[] = [
  { id: "clientes_mes", rotulo: "Quantos clientes novos entraram no mês" },
  { id: "origem", rotulo: "De onde veio cada cliente" },
  { id: "divulgacao", rotulo: "Qual divulgação minha traz mais clientes" },
  { id: "sem_retorno", rotulo: "Quem está há dias sem retorno" },
  { id: "funil", rotulo: "Quantos viraram visita, proposta e venda" },
  { id: "relatorio", rotulo: "Um resumo pronto para mostrar ou mandar" },
  { id: "nenhum", rotulo: "Não ligo para números, quero só não esquecer ninguém" },
];

const ids = (o: Opcao[]) => o.map((x) => x.id) as [string, ...string[]];
const texto = (max = 2000) => z.string().trim().max(max).optional().default("");
const umOuMais = (o: Opcao[]) => z.array(z.enum(ids(o))).min(1, "Escolha pelo menos uma opção.");

export const respostaSchema = z.object({
  nome: z.string().trim().min(1, "Digite seu nome ou apelido.").max(80),
  controleAtual: umOuMais(CONTROLE_ATUAL),
  controleComentario: texto(),
  origens: umOuMais(ORIGENS),
  origemOutro: texto(200),
  divulgacaoResultado: texto(),
  anotaNaHora: texto(),
  formasRegistro: umOuMais(FORMAS_REGISTRO),
  formaOutro: texto(200),
  tempoCadastro: z.enum(ids(TEMPOS_CADASTRO)),
  visao: z.enum(ids(VISOES)),
  visaoPorque: texto(),
  numeros: umOuMais(NUMEROS),
  numerosOutro: texto(),
  desistencia: texto(),
  funcaoDesejada: texto(),
});

export type Resposta = z.infer<typeof respostaSchema>;
export type RespostaGravada = Resposta & { data: string };

/** Ordem das colunas na planilha (a mesma de apps-script/Code.gs). */
export const COLUNAS = ["data", ...Object.keys(respostaSchema.shape)] as const;
