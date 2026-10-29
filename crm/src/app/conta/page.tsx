"use client";

import { useState } from "react";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { nomePerfil } from "@/lib/tipos";

export default function ContaPage() {
  return (
    <Casca titulo="Minha conta">
      <Conta />
    </Casca>
  );
}

function Conta() {
  const perfil = usePerfil();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setMsg({ ok: false, texto: "A senha precisa ter ao menos 8 caracteres." });
    if (senha !== confirma) return setMsg({ ok: false, texto: "As duas senhas não são iguais." });
    setEnviando(true);
    const { error } = await db().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setMsg({ ok: false, texto: mensagemErro(error) });
    setSenha("");
    setConfirma("");
    setMsg({ ok: true, texto: "Senha trocada." });
  }

  return (
    <div className="grid max-w-[520px] gap-4">
      <div className="card">
        <span className="eyebrow">{nomePerfil(perfil.perfil)}</span>
        <p className="titulo-card mt-1">{perfil.nome}</p>
        <p className="mt-1 text-ink-soft">{perfil.email}</p>
      </div>
      <form className="card" onSubmit={trocar} noValidate>
        <h2 className="titulo-card">Trocar senha</h2>
        <label className="field-label mt-4" htmlFor="nova">
          Nova senha
        </label>
        <input
          id="nova"
          className="input"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <label className="field-label mt-4" htmlFor="confirma">
          Repita a nova senha
        </label>
        <input
          id="confirma"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
        />
        {msg && (
          <p role="status" className={`${msg.ok ? "aviso-ok" : "aviso-erro"} mt-3`}>
            {msg.ok ? "✓" : "!"} {msg.texto}
          </p>
        )}
        <button type="submit" className="btn btn-red focus-ring mt-4" disabled={enviando}>
          {enviando ? "Salvando…" : "Trocar senha"}
        </button>
      </form>
      <div className="card">
        <h2 className="titulo-card">Instalar no celular</h2>
        <p className="mt-2 text-ink-soft">O CRM abre como um app, em tela cheia, a partir de um ícone na tela inicial.</p>
        <p className="mt-3">
          <span className="font-semibold">Android:</span> abra o CRM no Chrome, toque no menu de três pontos e escolha{" "}
          <span className="font-semibold">Instalar app</span> ou <span className="font-semibold">Adicionar à tela inicial</span>.
        </p>
        <p className="mt-2">
          <span className="font-semibold">iPhone:</span> abra o CRM no Safari, toque em{" "}
          <span className="font-semibold">Compartilhar &gt; Adicionar à Tela de Início</span>.
        </p>
      </div>
    </div>
  );
}
