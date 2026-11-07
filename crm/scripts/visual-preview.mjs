// Prévia isolada para revisão visual. Não copia .env nem conecta ao Supabase real.
// node scripts/visual-preview.mjs prepara a cópia; --serve serve o export em 4173.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dest = join(root, '.visual-preview');
if (process.argv.includes('--serve')) {
  const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.png':'image/png', '.json':'application/json' };
  createServer((req,res) => {
    let path = resolve(dest, 'out', '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/vendas/, ''));
    if (!path.startsWith(join(dest,'out') + '\\') && path !== join(dest,'out')) { res.writeHead(403).end(); return; }
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path,'index.html');
    if (!existsSync(path)) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(readFileSync(path));
  }).listen(4173, '127.0.0.1', () => console.log('Prévia fictícia: http://127.0.0.1:4173/vendas/'));
} else {
  mkdirSync(dest, {recursive:true});
  for (const name of ['src','public','next.config.mjs','tailwind.config.ts','postcss.config.mjs','tsconfig.json','next-env.d.ts','package.json']) cpSync(join(root,name), join(dest,name), {recursive:true});
  cpSync(join(root,'scripts/visual-fixtures.ts'), join(dest,'src/lib/visual-fixtures.ts'));
  writeFileSync(join(dest,'src/lib/supabase.ts'), `import type { SupabaseClient } from '@supabase/supabase-js';
import { client } from './visual-fixtures';
export const supabase = client as unknown as SupabaseClient;
export const db = () => supabase;
export const novoId = () => crypto.randomUUID();
`);
  writeFileSync(join(dest,'src/lib/sessao.tsx'), `"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from './tipos';
import { profiles } from './visual-fixtures';
const Context = createContext({estado: {fase:'carregando'} as any, pode: (_:string) => false, sair:async()=>{}, recarregar:async()=>{}});
export function SessaoProvider({children}:{children:React.ReactNode}) {
 const [estado,setEstado]=useState<any>({fase:'carregando'});
 useEffect(()=>{const path=location.pathname; const q0=new URLSearchParams(location.search).get('qa'); if(q0==='desativado'){setEstado({fase:'desativado',email:'x@example.invalid'});return;} if(q0==='erro'){setEstado({fase:'erro',mensagem:'PGRST301 JWT expired (fictício)'});return;} if(path==='/vendas/entrar/') {setEstado({fase:'deslogado'}); return;} const qa=new URLSearchParams(location.search).get('qa'); const gerente=(path==='/vendas/leads/' && qa!=='corretor') || path==='/vendas/painel/' || qa==='gerente'; const geral=new URLSearchParams(location.search).get('qa')==='geral' || ['/vendas/configuracoes/','/vendas/equipes/','/vendas/usuarios/','/vendas/empreendimentos/editar/','/vendas/empreendimentos/importar/','/vendas/faixas/','/vendas/programa/','/vendas/programa/aprovacao/','/vendas/distribuicao/'].includes(path);
 const perfil=geral?{...profiles[0],perfil:'gerente_geral'}:gerente?{...profiles[0],id:'gerente',perfil:'gerente'}:profiles[0];
 const permissoes=gerente?['dados.ver_equipe','leads.atribuir','distribuicao.produtos']:['leads.cadastrar','distribuicao.receber'];
 setEstado({fase:'pronto',perfil,permissoes});},[]);
 return <Context.Provider value={{estado,pode:(p)=>estado.fase==='pronto' && (estado.perfil.perfil==='gerente_geral' || estado.permissoes.includes(p)),sair:async()=>{},recarregar:async()=>{}}}>{children}</Context.Provider>;
}
export const useSessao=()=>useContext(Context);
export const usePerfil=()=>useSessao().estado.perfil as Profile;
`);
  // As páginas de QA das mensagens (passo d): o Desfazer e o erro de carga, só na cópia local.
  {
  const previa = join(dest, "src");
  mkdirSync(join(previa, "app", "qa-desfazer"), { recursive: true });
  mkdirSync(join(previa, "app", "qa-quebrar"), { recursive: true });
  writeFileSync(join(previa, "app", "qa-desfazer", "page.tsx"), `"use client";
import { useState } from "react";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { useToast } from "@/components/alicerce/toast";
declare global { interface Window { __log: string[] } }
const log = (x: string) => { (window.__log ||= []).push(x); };
function Corpo() {
  const toast = useToast();
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null);
  return (
    <>
      <div style={{ padding: 16, display: "flex", gap: 8 }}>
        <button id="mostrar" onClick={() => setAviso({ texto: "Etapa: Proposta", n: 1 })}>Mostrar</button>
        <button id="outro" onClick={() => setAviso({ texto: "Descartado: Sem interesse", n: 1 })}>Outro</button>
        <button id="mesmo" onClick={() => setAviso((a) => a && { texto: a.texto, n: a.n + 1 })}>Mesmo</button>
        <button id="info" onClick={() => toast.mostrar("Interação registrada.", { tipo: "sucesso" })}>Info</button>
      </div>
      {aviso && <AvisoDesfazer texto={aviso.texto} chave={aviso.n} onDesfazer={() => { log("desfazer"); setAviso(null); }} onFim={() => { log("fim"); setAviso(null); }} />}
    </>
  );
}
export default function Qa() {
  return (
    <Casca titulo="QA do Desfazer" migrada>
      <Corpo />
    </Casca>
  );
}
`);
  writeFileSync(join(previa, "app", "qa-quebrar", "page.tsx"), `"use client";
import { useEffect, useState } from "react";
// Só quebra no navegador (a exportação estática renderiza a página no build).
export default function Qa() {
  const [quebrar, setQuebrar] = useState(false);
  useEffect(() => setQuebrar(true), []);
  if (quebrar) throw new Error("Falha fictícia de carga");
  return null;
}
`);
  }
  // Só a cópia de QA carrega dados fictícios. Não há modo de bypass no app.
  console.log(dest);
}
