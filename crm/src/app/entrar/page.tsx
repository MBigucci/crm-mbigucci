"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { SemConfiguracao } from "@/components/casca";
import { Aviso } from "@/components/alicerce/aviso";
import { AvisoConexao } from "@/components/alicerce/aviso-conexao";
import { Campo } from "@/components/alicerce/campo";
import { CampoSenha } from "@/components/alicerce/campo-senha";
import { EntrarCaixa } from "@/components/alicerce/entrar-caixa";
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
      setErro(/invalid login credentials/i.test(error.message) ? "E-mail ou senha não conferem." : mensagemErro(error));
    }
  }

  return (
    <>
      <EntrarCaixa modulo="Vendas">
        {estado.fase === "sem-config" ? (
          <SemConfiguracao />
        ) : (
          <form onSubmit={entrar} className="mb-entrar__cartao" noValidate>
            <div className="mb-entrar__cabeca">
              <h1 className="mb-entrar__titulo">Entrar</h1>
              <p className="mb-entrar__texto">Use o e-mail cadastrado no Base360.</p>
            </div>
            {erro && <Aviso tom="erro" titulo={erro} />}
            <div className="mb-entrar__form">
              <Campo rotulo="E-mail">
                <input
                  id="email"
                  className="mb-campo__entrada"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  disabled={enviando}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Campo>
              <CampoSenha rotulo="Senha" id="senha" autoComplete="current-password" valor={senha} onChange={setSenha} desativado={enviando} />
              <button type="submit" className="mb-botao mb-botao--primario mb-botao--g mb-botao--bloco" aria-busy={enviando ? "true" : undefined} disabled={enviando}>
                {enviando ? "Entrando…" : "Entrar"}
              </button>
            </div>
          </form>
        )}
      </EntrarCaixa>
      <AvisoConexao />
    </>
  );
}
