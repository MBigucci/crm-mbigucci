const { spawnSync } = require("child_process");
const R = process.env.CLAUDE_PROJECT_DIR || require("path").resolve(__dirname, "../..");
const guard = require("path").join(__dirname, "guard.js");
const casos = [
  [2, "Edit", { file_path: R + "\\ref\\CRM Bruna\\README.md", new_string: "x" }, "editar ref"],
  [0, "Edit", { file_path: R + "\\crm\\src\\a.ts", new_string: "const x=1" }, "editar crm normal"],
  [2, "Write", { file_path: R + "\\crm\\src\\lib\\s.ts", content: "process.env.SUPABASE_SERVICE_ROLE_KEY" }, "service_role no front"],
  [2, "Write", { file_path: "C:/Projects/CRM MBigucci/discovery/src/x.ts", content: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwfQ.abcdefghijklmnopqrstuvwxyz123" }, "JWT no front"],
  [0, "Write", { file_path: "C:/Projects/CRM MBigucci/crm/supabase/schema.sql", content: "grant all to service_role;" }, "service_role no SQL (permitido)"],
  [2, "Edit", { file_path: R + "\\CLAUDE.md", new_string: "veja @docs/pontuacao-verba.md" }, "@import no CLAUDE.md"],
  [0, "Edit", { file_path: R + "\\CLAUDE.md", new_string: "- `docs/x.md`: abra quando..." }, "CLAUDE.md caminho simples"],
  [2, "Write", { file_path: "C:/Projects/CRM MBigucci/crm/out/.env.local", content: "A=1" }, ".env em out"],
  [2, "Bash", { command: "cp .env.local out/" }, "bash cp env para out"],
  [2, "Bash", { command: "zip -r site.zip out .env.local" }, "zip com env"],
  [0, "Bash", { command: "cp .env.example .env.local" }, "criar .env.local (permitido)"],
  [2, "Bash", { command: 'rm -rf "ref/CRM Bruna/.next"' }, "rm em ref"],
  [0, "Bash", { command: "cp ref/CRM\\ Bruna/tailwind.config.ts crm/" }, "copiar DE ref (permitido)"],
  [2, "Bash", { command: "cp x.ts ref/CRM/x.ts" }, "copiar PARA ref"],
  [0, "Bash", { command: "grep -r meta ref/CRM | head" }, "ler ref (permitido)"],
  [0, "Bash", { command: "cd crm && npm run build > build.log" }, "build normal"],
  [0, "Write", { file_path: "C:/outro/projeto/ref/x.ts", content: "x" }, "fora do projeto"],
];
let falhas = 0;
for (const [esperado, tool_name, tool_input, nome] of casos) {
  const r = spawnSync("node", [guard], {
    input: JSON.stringify({ tool_name, tool_input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: R },
  });
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "OK  " : "FALHA"} ${nome} (saiu ${r.status}, esperado ${esperado})`);
}
console.log(falhas ? `${falhas} falha(s)` : "todos passaram");
process.exit(falhas ? 1 : 0);
