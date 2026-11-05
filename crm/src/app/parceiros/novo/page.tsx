"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { CamposCadastro, ComPermissao } from "@/components/parceiros/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import { novoId } from "@/lib/supabase";
import { lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import {
  CAMPOS_VAZIOS,
  chaveRascunhoNovoParceiro,
  validarParceiro,
  type CamposParceiro,
  type RespostaCadastro,
} from "@/lib/parceiros";
import { cadastrarParceiro, useGerentes, useRegioes } from "@/lib/parceiros-dados";

export default function NovoParceiroPage() {
  return (
    <Casca titulo="Cadastrar parceiro">
      <ComPermissao>
        <Novo />
      </ComPermissao>
    </Casca>
  );
}

const vazio = (c: CamposParceiro) =>
  !c.nome.trim() && !c.empresa.trim() && !c.whatsapp.trim() && !c.creci.trim() && !c.email.trim() && !c.regioes.length && !c.outra;

function Novo() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const regioes = useRegioes();
  // Quem cadastra sem ser gerente (o gerente geral) manda o parceiro para a roleta: mostra quem recebeu.
  const gerentes = useGerentes(pode("parceiros.ver_todos"));
  const chave = chaveRascunhoNovoParceiro(eu.id);
  const [campos, setCampos] = useState<CamposParceiro>(CAMPOS_VAZIOS);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [resposta, setResposta] = useState<RespostaCadastro | null>(null);
  // Mesmo id até gravar: se a resposta se perder e a pessoa tocar de novo, não duplica.
  const idEnvio = useRef<string | null>(null);
  const restaurado = useRef(false);

  useEffect(() => {
    const r = lerRascunho<CamposParceiro>(chave);
    if (r && typeof r === "object") setCampos({ ...CAMPOS_VAZIOS, ...r, regioes: Array.isArray(r.regioes) ? r.regioes : [] });
    restaurado.current = true;
  }, [chave]);

  useEffect(() => {
    if (!restaurado.current) return;
    if (vazio(campos)) limparRascunho(chave);
    else salvarRascunho(chave, campos);
  }, [chave, campos]);

  // A resposta fica no topo: no celular o botão está no rodapé, então rola até ela.
  const topo = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (resposta) topo.current?.scrollIntoView({ block: "start" });
  }, [resposta]);

  if (!pode("parceiros.cadastrar"))
    return (
      <div className="card max-w-[520px]">
        <p>! Seu perfil vê os parceiros, mas não cadastra.</p>
      </div>
    );

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setResposta(null);
    const invalido = validarParceiro(campos);
    if (invalido) return setErro(invalido);
    setSalvando(true);
    idEnvio.current ??= novoId();
    const r = await cadastrarParceiro(idEnvio.current, campos);
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setResposta(r.resposta);
    // Duplicado não grava nada: o formulário fica como está, para conferir. Criado: limpa.
    if (r.resposta?.status === "criado") {
      idEnvio.current = null;
      limparRascunho(chave);
      setCampos(CAMPOS_VAZIOS);
    }
  }

  const nomeGerente = (id?: string | null) => (id ? gerentes.find((g) => g.id === id)?.nome : null);

  return (
    <form onSubmit={salvar} className="grid max-w-[640px] gap-4 pb-24 md:pb-0" noValidate>
      <Link href="/parceiros/" className="focus-ring text-[13px] font-semibold text-ink-soft">
        ← Parceiros
      </Link>
      <span ref={topo} className="eyebrow scroll-mt-[72px]">
        Novo parceiro
      </span>

      {resposta && <Resultado r={resposta} eu={eu.id} nomeGerente={nomeGerente} />}

      <div className="card">
        <CamposCadastro campos={campos} setCampos={setCampos} regioes={regioes} idBase="novo" />
      </div>
      <p className="text-[12px] text-concrete">
        Compara WhatsApp ou CRECI com os parceiros de todos os gerentes. Se faltar um, vale o outro. O rascunho fica
        salvo se a página recarregar.
      </p>
      {erro && <p className="aviso-erro">✕ {erro}</p>}

      <RodapeAcao>
        <Link href="/parceiros/" className="btn btn-ghost btn-lg focus-ring">
          Cancelar
        </Link>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Cadastrar"}
        </button>
      </RodapeAcao>
    </form>
  );
}

function Resultado({
  r,
  eu,
  nomeGerente,
}: {
  r: RespostaCadastro;
  eu: string;
  nomeGerente: (id?: string | null) => string | null | undefined;
}) {
  const ficha = `/parceiros/ficha/?id=${r.parceiro_id}`;
  if (r.status === "ja_cadastrado")
    return (
      <div className="card bar-brand" role="status">
        <p className="titulo-card">
          <span className="text-brand">✕</span> Já é parceiro de {r.dono_nome || "outro gerente"}
        </p>
        <p className="mt-1 text-ink-soft">
          Não foi cadastrado. {r.dono_nome ? r.dono_nome.split(" ")[0] : "O gerente atual"} recebeu um aviso de que o
          parceiro procurou a MBigucci de novo.
        </p>
      </div>
    );
  if (r.status === "seu")
    return (
      <div className="card" role="status">
        <p className="titulo-card">
          <span className="text-wa">!</span> Já é seu parceiro
        </p>
        <p className="mt-1 text-ink-soft">Nada foi cadastrado de novo.</p>
        <Link href={ficha} className="link-acao mt-2 inline-block text-[14px]">
          Abrir a ficha
        </Link>
      </div>
    );
  // gerente_id ausente: era o reenvio do mesmo cadastro (o banco só confirma que já gravou).
  return (
    <div className="card" role="status">
      <p className="titulo-card">
        <span className="text-ok">✓</span> Parceiro cadastrado
      </p>
      <p className="mt-1 text-ink-soft">
        {r.gerente_id === undefined
          ? "Abra a ficha para registrar a primeira interação."
          : r.gerente_id === eu
          ? "Fica com você. Registre a primeira interação."
          : r.gerente_id
            ? `Foi para a roleta e ficou com ${nomeGerente(r.gerente_id) ?? "o próximo gerente da vez"}.`
            : "Nenhum gerente ativo para receber agora: a rotina diária distribui."}
      </p>
      <Link href={ficha} className="link-acao mt-2 inline-block text-[14px]">
        Abrir a ficha
      </Link>
    </div>
  );
}
