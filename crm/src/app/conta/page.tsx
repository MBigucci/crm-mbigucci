"use client";

import { useEffect, useState } from "react";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { nomePerfil } from "@/lib/tipos";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/leads";

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
      <MeuWhatsapp />
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

/** O WhatsApp de quem usa o CRM: é para onde o gerente manda o aviso de lead novo. */
function MeuWhatsapp() {
  const perfil = usePerfil();
  const [numero, setNumero] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    db()
      .from("profiles")
      .select("whatsapp")
      .eq("id", perfil.id)
      .maybeSingle<{ whatsapp: string | null }>()
      .then(({ data }) => setNumero(data?.whatsapp ? formatarWhatsapp(data.whatsapp) : ""));
  }, [perfil.id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = numero?.trim() ? normalizarWhatsapp(numero) : "";
    if (n === null) return setMsg({ ok: false, texto: "Confira o WhatsApp: DDD e número, como (11) 98765-4321." });
    setEnviando(true);
    const { error } = await db().rpc("salvar_meu_whatsapp", { p_whatsapp: n });
    setEnviando(false);
    if (error) return setMsg({ ok: false, texto: mensagemErro(error) });
    setNumero(n ? formatarWhatsapp(n) : "");
    setMsg({ ok: true, texto: n ? "WhatsApp salvo." : "WhatsApp apagado." });
  }

  return (
    <form className="card" onSubmit={salvar} noValidate>
      <h2 className="titulo-card">Seu WhatsApp</h2>
      <p className="mt-2 text-ink-soft">Seu gerente usa este número para avisar quando você recebe um lead.</p>
      <label className="field-label mt-4" htmlFor="meu-whatsapp">
        WhatsApp
      </label>
      <input
        id="meu-whatsapp"
        className="input num"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 98765-4321"
        disabled={numero === null}
        value={numero ?? ""}
        onChange={(e) => {
          setNumero(e.target.value);
          setMsg(null);
        }}
      />
      {msg && (
        <p role="status" className={`${msg.ok ? "aviso-ok" : "aviso-erro"} mt-3`}>
          {msg.ok ? "✓" : "!"} {msg.texto}
        </p>
      )}
      <button type="submit" className="btn btn-ghost focus-ring mt-4" disabled={enviando || numero === null}>
        {enviando ? "Salvando…" : "Salvar WhatsApp"}
      </button>
    </form>
  );
}
