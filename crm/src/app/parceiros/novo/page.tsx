"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Casca } from "@/components/casca";
import { Cartao } from "@/components/alicerce/cartao";
import { BarraDeAcoes } from "@/components/alicerce/barra-de-acoes";
import { Aviso } from "@/components/alicerce/aviso";
import { CabecalhoParceiros, CamposCadastro, ComPermissao } from "@/components/parceiros/partes";
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
    <Casca titulo="Cadastrar parceiro" migrada>
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
      <Aviso titulo="Seu perfil vê os parceiros, mas não cadastra" texto="Peça o acesso ao gerente geral." />
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

  const botaoSalvar = <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando} aria-busy={salvando}>{salvando ? "Cadastrando…" : "Cadastrar parceiro"}</button>;
  return <form onSubmit={salvar} className="parcerias-formulario" noValidate>
    <CabecalhoParceiros titulo="Novo parceiro" subtitulo="Cadastre um corretor autônomo ou uma imobiliária." />
    <Cartao id="cadastro-parceiro" titulo="Cadastro do parceiro" rodape={<><Link href="/parceiros/" className="mb-botao mb-botao--discreto">Cancelar</Link>{botaoSalvar}</>} rodapeClasse="mb-so-computador">
      <CamposCadastro campos={campos} setCampos={setCampos} regioes={regioes} idBase="novo" />
      <p className="mb-campo__ajuda">Informe WhatsApp ou CRECI para conferir se o parceiro já existe. O rascunho fica neste aparelho.</p>
      <span ref={topo} className="ficha__ancora" />
      {resposta && <Resultado r={resposta} eu={eu.id} nomeGerente={nomeGerente} />}
      {erro && <Aviso tom="erro" titulo="Não foi possível cadastrar o parceiro" texto={erro} />}
    </Cartao>
    <BarraDeAcoes>{botaoSalvar}</BarraDeAcoes>
  </form>;
}

/** Duplicado.md:8-12: a regra proíbe repetir e só o próprio parceiro pode ser aberto. */
function Resultado({ r, eu, nomeGerente }: { r: RespostaCadastro; eu: string; nomeGerente: (id?: string | null) => string | null | undefined }) {
  const ficha = `/parceiros/ficha/?id=${r.parceiro_id}`;
  if (r.status === "ja_cadastrado") return <Aviso tom="info" titulo={`Já é parceiro de ${r.dono_nome || "outro gerente"}`} texto={`Não foi cadastrado. ${r.dono_nome ? r.dono_nome.split(" ")[0] : "O gerente atual"} recebeu um aviso de que o parceiro procurou a MBigucci de novo.`} />;
  if (r.status === "seu") return <Aviso tom="erro" titulo="Já é seu parceiro" texto="Nada foi cadastrado de novo." acoes={<Link href={ficha} className="mb-botao mb-botao--secundario">Abrir o existente</Link>} />;
  return <Aviso tom="sucesso" titulo="Parceiro cadastrado" texto={r.gerente_id === undefined ? "Abra a ficha para registrar a primeira interação." : r.gerente_id === eu ? "Fica com você. Registre a primeira interação." : r.gerente_id ? `Foi para a roleta e ficou com ${nomeGerente(r.gerente_id) ?? "o próximo gerente da vez"}.` : "Nenhum gerente ativo para receber agora: a rotina diária distribui."} acoes={<Link href={ficha} className="mb-botao mb-botao--secundario">Abrir a ficha</Link>} />;
}
