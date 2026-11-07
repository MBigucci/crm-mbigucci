"use client";

import { useEffect, useState } from "react";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { nomePerfil } from "@/lib/tipos";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/leads";
import { AvisosNesteAparelho } from "@/components/avisos-aparelho";
import { Aparencia } from "@/components/alicerce/aparencia";
import { Ajuste } from "@/components/alicerce/ajuste";
import { Ajustes } from "@/components/alicerce/ajustes";
import { Aviso } from "@/components/alicerce/aviso";
import { Campo } from "@/components/alicerce/campo";
import { CampoSenha } from "@/components/alicerce/campo-senha";
import { Cartao } from "@/components/alicerce/cartao";
import { Requisitos } from "@/components/alicerce/requisitos";

/** O índice de Minha conta (fora do componente: o observador do Ajustes depende dele). */
const INDICE = [
  { id: "whatsapp", rotulo: "Seu WhatsApp" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "avisos", rotulo: "Avisos neste aparelho" },
  { id: "senha", rotulo: "Trocar senha" },
  { id: "instalar", rotulo: "Instalar no celular" },
];

export default function ContaPage() {
  return (
    <Casca titulo="Minha conta" migrada>
      <Conta />
    </Casca>
  );
}

function Conta() {
  const perfil = usePerfil();
  return (
    <>
      <h1 className="mb-visualmente-oculto">Minha conta</h1>
      <header className="mb-cabecalho mb-cabecalho--compacto">
        <div className="mb-cabecalho__texto">
          <p className="mb-cabecalho__subtitulo">
            {perfil.nome} · {nomePerfil(perfil.perfil)} · {perfil.email}
          </p>
        </div>
      </header>
      <Ajustes indice={INDICE}>
        <MeuWhatsapp />
        <Aparencia />
        <AvisosNesteAparelho />
        <TrocarSenha />
        <InstalarNoCelular />
      </Ajustes>
    </>
  );
}

function TrocarSenha() {
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
    <form onSubmit={trocar} noValidate>
      <Cartao
        id="t-senha"
        secao="senha"
        titulo="Trocar senha"
        rodape={
          <button type="submit" className="mb-botao mb-botao--secundario" aria-busy={enviando || undefined} disabled={enviando}>
            {enviando ? "Salvando…" : "Trocar senha"}
          </button>
        }
      >
        <div className="mb-entrar__form">
          {msg && <Aviso tom={msg.ok ? "sucesso" : "erro"} titulo={msg.texto} />}
          <CampoSenha rotulo="Nova senha" id="nova" autoComplete="new-password" valor={senha} onChange={setSenha} />
          <Requisitos
            regras={[
              { regra: "tamanho", texto: "8 caracteres ou mais", ok: senha.length >= 8 },
              { regra: "igual", texto: "As duas senhas iguais", ok: senha.length > 0 && senha === confirma },
            ]}
          />
          <CampoSenha rotulo="Repita a nova senha" id="confirma" autoComplete="new-password" valor={confirma} onChange={setConfirma} />
        </div>
      </Cartao>
    </form>
  );
}

function InstalarNoCelular() {
  return (
    <Cartao
      id="t-instalar"
      secao="instalar"
      titulo="Instalar no celular"
      descricao="O Base360 Vendas abre como um app, em tela cheia, a partir do ícone Base360 na tela inicial."
    >
      <Ajuste
        rotulo="Android"
        passos={["Abra o Base360 Vendas no Chrome.", "Toque no menu de três pontos.", "Escolha Instalar app ou Adicionar à tela inicial."]}
      />
      <Ajuste rotulo="iPhone" passos={["Abra o Base360 Vendas no Safari.", "Toque em Compartilhar.", "Toque em Adicionar à Tela de Início."]} />
    </Cartao>
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

  const erro = msg && !msg.ok ? msg.texto : null;
  return (
    <form onSubmit={salvar} noValidate>
      <Cartao
        id="t-whatsapp"
        secao="whatsapp"
        titulo="Seu WhatsApp"
        descricao="Seu gerente usa este número para avisar quando você recebe um lead."
        rodape={
          <>
            {msg?.ok && (
              <span className="mb-salvo mb-salvo--ok" role="status">
                ✓ {msg.texto}
              </span>
            )}
            <button type="submit" className="mb-botao mb-botao--primario" aria-busy={enviando || undefined} disabled={enviando || numero === null}>
              {enviando ? "Salvando…" : "Salvar WhatsApp"}
            </button>
          </>
        }
      >
        <Campo rotulo="WhatsApp" erro={erro} idErro="meu-whatsapp-erro">
          <input
            id="meu-whatsapp"
            className="mb-campo__entrada"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            disabled={numero === null}
            value={numero ?? ""}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "meu-whatsapp-erro" : undefined}
            onChange={(e) => {
              setNumero(e.target.value);
              setMsg(null);
            }}
          />
        </Campo>
      </Cartao>
    </form>
  );
}
