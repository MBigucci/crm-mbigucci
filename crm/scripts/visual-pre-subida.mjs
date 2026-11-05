// Executar depois de visual-preview.mjs e antes do build isolado.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const arquivo = nome => fileURLToPath(new URL('../.visual-preview/' + nome, import.meta.url));
function substituir(nome, antes, depois) {
  const path = arquivo('src/' + nome);
  const fonte = readFileSync(path, 'utf8');
  if (!fonte.includes(antes)) throw Error('Atualize o cenário de QA: ' + nome);
  writeFileSync(path, fonte.replace(antes, depois));
}
substituir('lib/sessao.tsx', "const gerente=path", "const gerente=new URLSearchParams(location.search).get('qa')==='gerente' || path.startsWith('/parceiros/') || path");
substituir('lib/sessao.tsx', "'dados.ver_equipe','leads.atribuir'", "'dados.ver_equipe','leads.atribuir','parceiros.cadastrar','plantao.atendimentos_ver'");
// Estados transitórios do componente real, sem simular sucesso de uma escrita.
const estado = "new URLSearchParams(location.search).get('estado')";
substituir('app/recepcao/page.tsx', 'useState<Registrado | null>(null)', "useState<Registrado | null>(() => " + estado + " === 'anuncie' ? {resposta:{status:'ok',tipo:'novo',atendimento_id:'qa',anunciar:{papel:'corretor',nome:'Marina Exemplo'},especialista:'Lia Exemplo'}} : null)");
substituir('app/recepcao/page.tsx', 'useState<"stand" | "clientes">("stand")', 'useState<"stand" | "clientes">(() => ' + estado + " === 'anuncie' ? 'clientes' : 'stand')");
substituir('components/recepcao/cliente.tsx', 'useState<Pendente | null>(null)', 'useState<Pendente | null>(() => ' + estado + " === 'aviso' ? {status:'confirmar',aviso:'outra_carteira'} : null)");
substituir('components/avisos-aparelho.tsx', 'const d = disponibilidade();', "const d = " + estado + " === 'avisos' ? 'ok' : disponibilidade();");
substituir('components/avisos-aparelho.tsx', 'if (d !== "ok") return;', 'if (d !== "ok" || ' + estado + " === 'avisos') return;");
copyFileSync(new URL('../wordpress/corretores/dist/corretores-cadastro.html', import.meta.url), arquivo('public/parceiro-qa.html'));
