"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Cabecalho } from "@/components/cabecalho";
import { SemConfiguracao } from "@/components/casca";
import { supabase } from "@/lib/supabase";
import { useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";

const Login = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});

export default function EntrarPage() {
  const { estado } = useSessao();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (estado.fase === "pronto" || estado.fase === "desativado") router.replace("/");
  }, [estado.fase, router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const dados = Login.safeParse({ email: email.trim(), senha });
    if (!dados.success) return setErro(dados.error.issues[0].message);
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: dados.data.email, password: dados.data.senha });
    setEnviando(false);
    if (error) {
      setErro(/invalid login credentials/i.test(error.message) ? "E-mail ou senha incorretos." : mensagemErro(error));
    }
  }

  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-[440px] px-5 pb-16 pt-10">
        {estado.fase === "sem-config" ? (
          <SemConfiguracao />
        ) : (
          <form onSubmit={entrar} className="card bar-brand" noValidate>
            <span className="eyebrow">CRM MBigucci</span>
            <h1 className="titulo-pagina mt-1">Entrar</h1>
            <label className="field-label mt-6" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field-label mt-4" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              className="input"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {erro && (
              <p role="alert" className="aviso-erro mt-3">
                ! {erro}
              </p>
            )}
            <button type="submit" className="btn btn-red btn-lg focus-ring mt-5 w-full" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
            <p className="mt-4 text-[13px] text-ink-soft">
              Não tem acesso ou esqueceu a senha? Fale com o gerente geral.
            </p>
          </form>
        )}
      </main>
    </>
  );
}
