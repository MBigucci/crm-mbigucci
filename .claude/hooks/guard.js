#!/usr/bin/env node
/**
 * PreToolUse: proibições absolutas do projeto (docs/candidatos-automacao.md, "Hooks").
 * Sai com código 2 e uma mensagem em stderr para bloquear a chamada; 0 libera.
 *
 * 1. Nada se edita dentro de ref/ (referência do CRM da Bruna).
 * 2. Nenhum segredo (service_role, chave JWT longa) em crm/src ou discovery/src.
 * 3. Nenhum @import de arquivo no CLAUDE.md (o índice usa caminhos simples).
 * 4. .env.local nunca entra em out/ nem em pacote de publicação.
 */
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let ev;
  try {
    ev = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const motivo = verificar(ev.tool_name || "", ev.tool_input || {});
  if (motivo) {
    process.stderr.write(`Bloqueado pelo hook do projeto: ${motivo}\n`);
    process.exit(2);
  }
  process.exit(0);
});

const norm = (p) => String(p || "").replace(/\\/g, "/");
const raiz = norm(process.env.CLAUDE_PROJECT_DIR || process.cwd()).replace(/\/$/, "");

/** Caminho relativo à raiz do projeto, ou null se estiver fora dela. */
function relativo(p) {
  const n = norm(p);
  const lower = n.toLowerCase();
  const r = raiz.toLowerCase();
  if (lower.startsWith(r + "/")) return n.slice(raiz.length + 1);
  // Git Bash: /c/Projects/... × C:/Projects/...
  const alt = r.replace(/^([a-z]):/, (_, d) => `/${d}`);
  if (lower.startsWith(alt + "/")) return n.slice(alt.length + 1);
  return /^[a-z]:\//i.test(n) || n.startsWith("/") ? null : n.replace(/^\.\//, "");
}

/** Todo texto que a ferramenta vai gravar. */
function textoNovo(input) {
  const partes = [input.content, input.new_string, input.new_source];
  for (const e of input.edits || []) partes.push(e.new_string);
  return partes.filter((x) => typeof x === "string").join("\n");
}

const SEGREDO = /service_role|SUPABASE_SERVICE|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/;
const IMPORT_MD = /(^|\s)@[~.\w/-]+\.(md|txt|json)\b/m;

function verificar(tool, input) {
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    const rel = relativo(input.file_path || input.notebook_path);
    if (rel === null) return null;
    const texto = textoNovo(input);

    if (/^ref\//i.test(rel)) return "ref/ é só referência (CRM da Bruna) e não pode ser editada.";
    if (/^(crm|discovery)\/src\//i.test(rel) && SEGREDO.test(texto))
      return "segredo no código do front (service_role ou chave JWT). Use NEXT_PUBLIC_ só para chaves públicas (anon) e nunca a service_role.";
    if (/^CLAUDE\.md$/i.test(rel) && IMPORT_MD.test(texto))
      return "CLAUDE.md não usa @import. Liste os docs pelo caminho simples, em 'Onde encontrar contexto'.";
    if (/(^|\/)out\/(.*\/)?\.env/i.test(rel)) return ".env não pode ir para out/ (pasta publicada no WordPress).";
    return null;
  }

  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = String(input.command || "");
    if (/\.env\.local/i.test(cmd) && /(\bout\/|\bout\\|\bzip\b|\btar\b|\brsync\b|\bscp\b|\blftp\b|\bftp\b|curl\s[^|]*-T|Compress-Archive)/i.test(cmd))
      return ".env.local não pode entrar em out/ nem em pacote de publicação.";
    // Cada trecho entre ; && || | é um comando
    for (const trecho of cmd.split(/;|&&|\|\||\|/)) {
      const t = trecho.trim();
      const tocaRef = /(^|[\s"'\/\\])ref[\/\\]/i.test(t);
      if (!tocaRef) continue;
      if (/^(sudo\s+)?(rm|mv|sed\s+-i|tee|touch|mkdir|Remove-Item|Move-Item|Set-Content|Out-File|Add-Content|New-Item)\b/i.test(t))
        return "comando que altera ref/ (referência só de leitura).";
      // cp/Copy-Item: só bloqueia quando o DESTINO (último argumento) está em ref/
      if (/^(cp|Copy-Item)\b/i.test(t)) {
        const destino = t.split(/\s+/).pop() || "";
        if (/(^|["'\/\\])ref[\/\\]/i.test(destino)) return "cópia com destino em ref/ (referência só de leitura).";
      }
      if (/>\s*["']?[^\s"']*(^|[\/\\"'])ref[\/\\]/i.test(t)) return "redirecionamento que grava em ref/ (referência só de leitura).";
    }
    return null;
  }
  return null;
}
