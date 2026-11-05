"use client";

// Perfil ampliado do cliente na ficha (item 16): o resumo do topo, o formulário
// "Perfil", os dados pessoais para quem só lê e os documentos. Regras em
// docs/leads.md, seção 17.

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { formatarWhatsapp, normalizarWhatsapp, type Lead } from "@/lib/leads";
import { chaveRascunhoPerfil, lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import {
  ACEITA_DOCUMENTO,
  CATEGORIAS_DOCUMENTO,
  dadosPessoais,
  ESTADOS_CIVIS,
  FAIXAS_RENDA,
  FORMAS_PAGAMENTO,
  formatarTamanho,
  MOTIVOS_COMPRA,
  nomeCategoria,
  PRAZOS_COMPRA,
  PRONTO_OU_PLANTA,
  resumoDoPerfil,
  textoAniversario,
  type CategoriaDocumento,
  type Documento,
  type PerfilAmpliado,
} from "@/lib/perfil";
import { enviarDocumento, linkDoDocumento, removerDocumento, useDocumentos } from "@/lib/perfil-dados";
import { lerReais } from "@/lib/vendas";
import { ConferirNoCatalogo, ListaEmpreendimentos } from "@/components/empreendimentos/partes";
import { BotaoMensagem } from "./mensagem";

type LeadDaFicha = Lead & Partial<PerfilAmpliado>;

/**
 * As informações-chave no topo da ficha: o aviso de aniversário (com os
 * parabéns em 1 toque, no dia) e a linha do perfil. Sem perfil, o dono vê o
 * convite para preencher.
 */
export function ResumoDoPerfil({
  lead,
  agora,
  podeEditar,
  onEditar,
}: {
  lead: LeadDaFicha;
  agora: Date;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  const itens = resumoDoPerfil(lead);
  const niver = textoAniversario(lead.nascimento, agora);
  if (!itens.length && !niver && !podeEditar) return null;
  return (
    <div className="mt-3 grid gap-2 border-t border-line pt-3">
      {niver && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-semibold text-ink">→ {niver}</p>
          {niver.endsWith("hoje") && lead.status === "ativo" && (
            <BotaoMensagem
              lead={lead}
              modelo="parabens"
              rotulo="Mandar parabéns →"
              rotuloAcessivel={`Mandar parabéns para ${lead.nome}`}
              className="py-1 text-[13px]"
            />
          )}
        </div>
      )}
      {itens.length > 0 ? (
        <p className="text-[13px] text-ink-soft">
          <span className="sr-only">Perfil: </span>
          {itens.map((x, i) => (
            <span key={x} className={clsx(/^(Até|Entrada) R\$/.test(x) && "num")}>
              {i > 0 && <span aria-hidden> · </span>}
              {x}
            </span>
          ))}
          {podeEditar && (
            <>
              {" "}
              <button type="button" className="link-acao focus-ring" onClick={onEditar}>
                Editar
              </button>
            </>
          )}
        </p>
      ) : (
        podeEditar && (
          <p className="text-[13px] text-ink-soft">
            Perfil vazio.{" "}
            <button type="button" className="link-acao focus-ring" onClick={onEditar}>
              Preencher quando der
            </button>
          </p>
        )
      )}
    </div>
  );
}

const reais = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));

/**
 * Perfil do cliente: compra e dados pessoais, tudo opcional. Sem o SQL do
 * item 16 (`perfil` nulo e `erroPerfil`), salva só os campos de antes.
 */
export function PerfilCliente({
  lead,
  perfil,
  erroPerfil,
  aberto,
  onAlternar,
  onSalvar,
}: {
  lead: Lead;
  perfil: PerfilAmpliado | null;
  erroPerfil: string | null;
  aberto: boolean;
  onAlternar: (aberto: boolean) => void;
  onSalvar: (c: Partial<Lead & PerfilAmpliado>) => Promise<string | null>;
}) {
  const p = perfil;
  const [f, setF] = useState({
    email: lead.email ?? "",
    empreendimento: lead.empreendimento ?? "",
    campanha: lead.campanha ?? "",
    valor: lead.valor?.toString() ?? "",
    dormitorios: lead.dormitorios?.toString() ?? "",
    regiao: lead.regiao ?? "",
    finalidade: lead.finalidade ?? "",
    prazo_compra: p?.prazo_compra ?? "",
    forma_pagamento: p?.forma_pagamento ?? "",
    usa_fgts: p?.usa_fgts == null ? "" : p.usa_fgts ? "sim" : "nao",
    renda_faixa: p?.renda_faixa ?? "",
    entrada: reais(p?.entrada),
    pronto_planta: p?.pronto_planta ?? "",
    motivo_compra: p?.motivo_compra ?? "",
    nascimento: p?.nascimento ?? "",
    profissao: p?.profissao ?? "",
    estado_civil: p?.estado_civil ?? "",
    cidade_mora: p?.cidade_mora ?? "",
    bairro_mora: p?.bairro_mora ?? "",
    telefone2: p?.telefone2 ? formatarWhatsapp(p.telefone2) : "",
  });
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editado, setEditado] = useState(false);
  const restauradoRef = useRef(false);

  useEffect(() => {
    const r = lerRascunho<typeof f>(chaveRascunhoPerfil(lead.id));
    if (r) {
      setF((anterior) => ({ ...anterior, ...r }));
      setEditado(true);
      if (!aberto) onAlternar(true);
    }
    restauradoRef.current = true;
  }, [lead.id]);

  useEffect(() => {
    if (!restauradoRef.current || !editado) return;
    salvarRascunho(chaveRascunhoPerfil(lead.id), f);
  }, [lead.id, f, editado]);

  const campo = (k: keyof typeof f) => ({
    id: `p-${k}`,
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      setF((x) => ({ ...x, [k]: v }));
      setEditado(true);
      setSalvo(false);
    },
  });
  const hoje = new Date();
  const maxNascimento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const valor = f.valor ? lerReais(f.valor) : null;
    if (f.valor && valor === null) return setErro("Confira o valor: só números, como 450.000.");
    const base: Partial<Lead & PerfilAmpliado> = {
      email: f.email.trim() || null,
      empreendimento: f.empreendimento.trim() || null,
      campanha: f.campanha.trim() || null,
      valor,
      dormitorios: f.dormitorios ? Number(f.dormitorios) : null,
      regiao: f.regiao.trim() || null,
      finalidade: (f.finalidade || null) as Lead["finalidade"],
    };
    let extra: Partial<PerfilAmpliado> = {};
    if (perfil) {
      const entrada = f.entrada ? lerReais(f.entrada) : null;
      if (f.entrada && entrada === null) return setErro("Confira a entrada: só números, como 80.000.");
      const tel = f.telefone2.trim() ? normalizarWhatsapp(f.telefone2) : null;
      if (f.telefone2.trim() && !tel) return setErro("Confira o outro telefone: DDD e número.");
      if (f.nascimento && f.nascimento > maxNascimento) return setErro("A data de nascimento não pode ser no futuro.");
      extra = {
        prazo_compra: (f.prazo_compra || null) as PerfilAmpliado["prazo_compra"],
        forma_pagamento: (f.forma_pagamento || null) as PerfilAmpliado["forma_pagamento"],
        usa_fgts: f.usa_fgts ? f.usa_fgts === "sim" : null,
        renda_faixa: (f.renda_faixa || null) as PerfilAmpliado["renda_faixa"],
        entrada,
        pronto_planta: (f.pronto_planta || null) as PerfilAmpliado["pronto_planta"],
        motivo_compra: (f.motivo_compra || null) as PerfilAmpliado["motivo_compra"],
        nascimento: f.nascimento || null,
        profissao: f.profissao.trim() || null,
        estado_civil: (f.estado_civil || null) as PerfilAmpliado["estado_civil"],
        cidade_mora: f.cidade_mora.trim() || null,
        bairro_mora: f.bairro_mora.trim() || null,
        telefone2: tel,
      };
    }
    setSalvando(true);
    const e2 = await onSalvar({ ...base, ...extra });
    setSalvando(false);
    if (e2) return setErro(e2);
    limparRascunho(chaveRascunhoPerfil(lead.id));
    setEditado(false);
    setSalvo(true);
  }

  const opcoes = (lista: { slug: string; nome: string }[]) => (
    <>
      <option value="">–</option>
      {lista.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.nome}
        </option>
      ))}
    </>
  );
  const rotulo = (k: keyof typeof f, texto: string) => (
    <label className="field-label" htmlFor={`p-${k}`}>
      {texto}
    </label>
  );

  return (
    <details id="perfil" className="card scroll-mt-[72px]" open={aberto} onToggle={(e) => onAlternar((e.target as HTMLDetailsElement).open)}>
      <summary className="focus-ring cursor-pointer list-none font-semibold">
        <span aria-hidden>{aberto ? "– " : "+ "}</span>Perfil do cliente (opcional)
      </summary>
      <form onSubmit={salvar} className="mt-4 grid gap-5" noValidate>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="eyebrow mb-3">Compra</legend>
          <div>
            {rotulo("valor", "Valor (R$)")}
            <input className="input num" inputMode="decimal" placeholder="450.000" autoComplete="off" {...campo("valor")} />
          </div>
          <div>
            {rotulo("dormitorios", "Dormitórios")}
            <select className="input" {...campo("dormitorios")}>
              <option value="">–</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            {rotulo("regiao", "Região")}
            <input className="input" placeholder="Rudge Ramos, Centro / SBC" {...campo("regiao")} />
          </div>
          <div>
            {rotulo("finalidade", "Finalidade")}
            <select className="input" {...campo("finalidade")}>
              <option value="">–</option>
              <option value="morar">Morar</option>
              <option value="investir">Investir</option>
            </select>
          </div>
          <div>
            {rotulo("empreendimento", "Empreendimento")}
            <input className="input" list="p-emps" autoComplete="off" {...campo("empreendimento")} />
            <ListaEmpreendimentos id="p-emps" />
            <ConferirNoCatalogo nome={f.empreendimento} />
          </div>
          <div>
            {rotulo("campanha", "Campanha")}
            <input className="input" {...campo("campanha")} />
          </div>
          {perfil && (
            <>
              <div>
                {rotulo("pronto_planta", "Pronto ou na planta")}
                <select className="input" {...campo("pronto_planta")}>
                  {opcoes(PRONTO_OU_PLANTA)}
                </select>
              </div>
              <div>
                {rotulo("prazo_compra", "Prazo de compra")}
                <select className="input" {...campo("prazo_compra")}>
                  {opcoes(PRAZOS_COMPRA)}
                </select>
              </div>
              <div>
                {rotulo("forma_pagamento", "Forma de pagamento")}
                <select className="input" {...campo("forma_pagamento")}>
                  {opcoes(FORMAS_PAGAMENTO)}
                </select>
              </div>
              <div>
                {rotulo("usa_fgts", "Usa FGTS")}
                <select className="input" {...campo("usa_fgts")}>
                  <option value="">–</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                {rotulo("renda_faixa", "Renda familiar")}
                <select className="input" {...campo("renda_faixa")}>
                  {opcoes(FAIXAS_RENDA)}
                </select>
              </div>
              <div>
                {rotulo("entrada", "Entrada disponível (R$)")}
                <input className="input num" inputMode="decimal" placeholder="80.000" autoComplete="off" {...campo("entrada")} />
              </div>
              <div className="md:col-span-2">
                {rotulo("motivo_compra", "Motivo da compra")}
                <select className="input" {...campo("motivo_compra")}>
                  {opcoes(MOTIVOS_COMPRA)}
                </select>
              </div>
            </>
          )}
        </fieldset>

        {perfil ? (
          <fieldset className="grid gap-4 md:grid-cols-2">
            <legend className="eyebrow mb-3">Dados pessoais</legend>
            <div>
              {rotulo("nascimento", "Data de nascimento")}
              <input className="input num" type="date" min="1900-01-01" max={maxNascimento} {...campo("nascimento")} />
            </div>
            <div>
              {rotulo("profissao", "Profissão")}
              <input className="input" maxLength={120} autoComplete="off" {...campo("profissao")} />
            </div>
            <div>
              {rotulo("estado_civil", "Estado civil")}
              <select className="input" {...campo("estado_civil")}>
                {opcoes(ESTADOS_CIVIS)}
              </select>
            </div>
            <div>
              {rotulo("telefone2", "Outro telefone")}
              <input className="input num" type="tel" inputMode="tel" placeholder="(11) 98765-4321" autoComplete="off" {...campo("telefone2")} />
            </div>
            <div>
              {rotulo("cidade_mora", "Cidade onde mora")}
              <input className="input" maxLength={120} autoComplete="off" {...campo("cidade_mora")} />
            </div>
            <div>
              {rotulo("bairro_mora", "Bairro onde mora")}
              <input className="input" maxLength={120} autoComplete="off" {...campo("bairro_mora")} />
            </div>
            <div className="md:col-span-2">
              {rotulo("email", "E-mail")}
              <input className="input" type="email" inputMode="email" autoComplete="off" {...campo("email")} />
            </div>
          </fieldset>
        ) : (
          <div className="grid gap-2">
            <div>
              {rotulo("email", "E-mail")}
              <input className="input" type="email" inputMode="email" autoComplete="off" {...campo("email")} />
            </div>
            {erroPerfil && <p className="text-[13px] text-ink-soft">! Os campos novos do perfil não carregaram: {erroPerfil}</p>}
          </div>
        )}

        {erro && <p className="aviso-erro">! {erro}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-ghost btn-lg focus-ring" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar perfil"}
          </button>
          {salvo && (
            <span className="aviso-ok" role="status">
              ✓ Salvo
            </span>
          )}
        </div>
      </form>
    </details>
  );
}

/** Os dados pessoais preenchidos, só leitura (gerente e quem vê o lead sem ser o dono). */
export function DadosDoCliente({ lead }: { lead: LeadDaFicha }) {
  const dados = dadosPessoais(lead);
  if (!dados.length) return null;
  return (
    <section className="card" aria-labelledby="dados-cliente">
      <h2 id="dados-cliente" className="eyebrow">
        Dados do cliente
      </h2>
      <dl className="mt-3 grid gap-1 text-[13px]">
        {dados.map((d) => (
          <div key={d.rotulo} className="flex gap-2">
            <dt className="w-[110px] shrink-0 text-ink-soft sm:w-[120px]">{d.rotulo}</dt>
            <dd className={clsx("min-w-0 break-words", /telefone|Anivers/.test(d.rotulo) && "num")}>{d.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/**
 * Documentos do lead no bucket privado: o dono anexa (foto ou PDF, até 10 MB)
 * e remove; quem vê o lead abre por um link que vale 60 segundos.
 */
export function DocumentosDoLead({
  leadId,
  podeEnviar,
  podeRemover,
  onMudou,
}: {
  leadId: string;
  podeEnviar: boolean;
  podeRemover: boolean;
  onMudou: () => void;
}) {
  const { docs, erro: erroLista, recarregar } = useDocumentos(leadId);
  const [categoria, setCategoria] = useState<CategoriaDocumento | "">("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // Sem o SQL do item 16 e sem nada a fazer aqui, a ficha não mostra o card.
  if (erroLista && !podeEnviar) return null;
  if (docs && !docs.length && !podeEnviar) return null;

  async function enviar(arquivo: File | undefined) {
    if (!arquivo || !categoria) return;
    setErro(null);
    setOk(null);
    setEnviando(true);
    const e = await enviarDocumento(leadId, arquivo, categoria);
    setEnviando(false);
    if (arquivoRef.current) arquivoRef.current.value = "";
    if (e) return setErro(e);
    setOk(`${nomeCategoria(categoria)} anexado`);
    setCategoria("");
    await recarregar();
    onMudou();
  }

  async function remover(d: Documento) {
    setErro(null);
    setOk(null);
    const e = await removerDocumento(d);
    if (e) return setErro(e);
    setOk(`${nomeCategoria(d.categoria)} removido`);
    await recarregar();
    onMudou();
  }

  return (
    <section className="card grid gap-3" aria-labelledby="documentos-titulo">
      <h2 id="documentos-titulo" className="eyebrow">
        Documentos
      </h2>
      <p className="text-[13px] text-ink-soft">
        ! Dados pessoais protegidos pela LGPD. Anexe só o que a proposta pede. Só o corretor do lead, o gerente da equipe e a
        gerência geral abrem os arquivos.
      </p>
      {erroLista && <p className="aviso-erro">! {erroLista}</p>}
      {docs === null && !erroLista && <p className="text-concrete">Carregando…</p>}
      {docs && docs.length > 0 && (
        <ul className="grid gap-2">
          {docs.map((d) => (
            <ItemDocumento key={d.id} doc={d} podeRemover={podeRemover} onRemover={() => remover(d)} onErro={setErro} />
          ))}
        </ul>
      )}
      {docs && !docs.length && !erroLista && <p className="text-ink-soft">Nenhum documento anexado.</p>}
      {podeEnviar && !erroLista && (
        <div className="grid gap-2 border-t border-line pt-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="field-label" htmlFor="doc-categoria">
              Anexar documento
            </label>
            <select
              id="doc-categoria"
              className="input"
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value as CategoriaDocumento);
                setOk(null);
              }}
            >
              <option value="">Escolha o tipo</option>
              {CATEGORIAS_DOCUMENTO.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <label
            className={clsx(
              "btn btn-ghost btn-lg focus-ring cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
              (!categoria || enviando) && "pointer-events-none opacity-50",
            )}
            aria-disabled={!categoria || enviando}
          >
            {enviando ? "Enviando…" : "+ Foto ou PDF"}
            <input
              ref={arquivoRef}
              type="file"
              accept={ACEITA_DOCUMENTO}
              className="sr-only"
              disabled={!categoria || enviando}
              onChange={(e) => enviar(e.target.files?.[0])}
            />
          </label>
          <p className="text-[12px] text-ink-soft md:col-span-2">Escolha o tipo e depois o arquivo. Até 10 MB.</p>
        </div>
      )}
      {erro && <p className="aviso-erro">! {erro}</p>}
      {ok && (
        <p className="aviso-ok" role="status">
          ✓ {ok}
        </p>
      )}
    </section>
  );
}

function ItemDocumento({
  doc,
  podeRemover,
  onRemover,
  onErro,
}: {
  doc: Documento;
  podeRemover: boolean;
  onRemover: () => Promise<void>;
  onErro: (e: string) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  /** A janela abre no toque (o iPhone bloqueia a que abre depois de esperar) e recebe o link quando ele chega. */
  async function abrir() {
    const janela = window.open("", "_blank");
    setAbrindo(true);
    const { url, erro } = await linkDoDocumento(doc.caminho);
    setAbrindo(false);
    if (!url) {
      janela?.close();
      return onErro(erro ?? "Não consegui abrir o arquivo.");
    }
    if (janela) {
      janela.opener = null;
      janela.location.href = url;
    } else window.location.href = url;
  }

  return (
    <li className="rounded-sm border border-line p-3">
      <p className="text-[13px] font-semibold">{nomeCategoria(doc.categoria)}</p>
      <p className="break-all text-[13px] text-ink-soft">{doc.nome}</p>
      <p className="num text-[12px] text-ink-soft">
        {formatarTamanho(doc.tamanho)} · {dataCurta(doc.enviado_em)}
      </p>
      {!confirmando ? (
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn btn-ghost focus-ring" onClick={abrir} disabled={abrindo}>
            {abrindo ? "Abrindo…" : "Abrir"}
          </button>
          {podeRemover && (
            <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmando(true)}>
              Remover
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="text-[13px]">✕ Remover este arquivo? Ele sai do Base360 Vendas e o histórico registra a remoção.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-red focus-ring" onClick={() => onRemover().finally(() => setConfirmando(false))}>
              Remover
            </button>
            <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
