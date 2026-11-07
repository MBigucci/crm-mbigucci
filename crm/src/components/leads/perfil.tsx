"use client";

// Perfil ampliado do cliente na ficha (item 16): o resumo do topo, o formulário
// "Perfil", os dados pessoais para quem só lê e os documentos. Regras em
// docs/leads.md, seção 17. No Alicerce desde o passo f do item 48 (07/11/2026): as mesmas
// gravações, regras e textos, com as peças do Alicerce.

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
import { Aviso } from "@/components/alicerce/aviso";
import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { Campo, CampoSelecao } from "@/components/alicerce/campo";
import { Cartao } from "@/components/alicerce/cartao";
import { ConfirmarNaLinha } from "@/components/alicerce/confirmar-na-linha";
import { CampoEmpreendimento } from "@/components/alicerce/campo-empreendimento";
import { Envio, ItemDeEnvio } from "@/components/alicerce/envio";
import { Pares } from "@/components/alicerce/pares";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { useToast } from "@/components/alicerce/toast";

type LeadDaFicha = Lead & Partial<PerfilAmpliado>;

/**
 * As informações-chave no topo da ficha: o aviso de aniversário (com os
 * parabéns em 1 toque, no dia) e a linha do perfil. Sem perfil, o dono vê o
 * convite para preencher. `onParabens` abre a mensagem pronta (modelo "parabéns") da ficha.
 */
export function ResumoDoPerfil({
  lead,
  agora,
  podeEditar,
  onEditar,
  onParabens,
}: {
  lead: LeadDaFicha;
  agora: Date;
  podeEditar: boolean;
  onEditar: () => void;
  onParabens: () => void;
}) {
  const itens = resumoDoPerfil(lead);
  const niver = textoAniversario(lead.nascimento, agora);
  if (!itens.length && !niver && !podeEditar) return null;
  return (
    <div className="ficha__resumo">
      {niver && (
        <>
          <Aviso titulo={niver} />
          {niver.endsWith("hoje") && lead.status === "ativo" && lead.whatsapp && (
            <div className="mb-grupo-botoes">
              <BotaoWhatsapp rotulo="Mandar parabéns →" rotuloAcessivel={`Mandar parabéns para ${lead.nome}`} onClick={onParabens} />
            </div>
          )}
        </>
      )}
      {itens.length > 0 ? (
        <div className="ficha__linha">
          <p className="ficha__texto">
            <span className="mb-visualmente-oculto">Perfil: </span>
            {itens.map((x, i) => (
              <span key={x} className={clsx(/^(Até|Entrada) R\$/.test(x) && "mb-num")}>
                {i > 0 && <span aria-hidden> · </span>}
                {x}
              </span>
            ))}
          </p>
          {podeEditar && (
            <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={onEditar}>
              Editar perfil
            </button>
          )}
        </div>
      ) : (
        podeEditar && (
          <div className="ficha__linha">
            <p className="ficha__texto">Perfil vazio.</p>
            <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={onEditar}>
              Preencher perfil
            </button>
          </div>
        )
      )}
    </div>
  );
}

const reais = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));

/**
 * Perfil do cliente: compra e dados pessoais, tudo opcional, numa seção recolhível. Sem o SQL do
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
  const toast = useToast();
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
    toast.mostrar("Perfil salvo.", { tipo: "sucesso" });
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

  return (
    <section id="perfil" className="mb-cartao ficha__ancora" aria-label="Perfil do cliente">
      <div className="mb-cartao__corpo">
        <Recolhivel titulo="Perfil do cliente" contagem="· opcional" aberto={aberto} onAlternar={onAlternar}>
          <form onSubmit={salvar} className="ficha__corpo" noValidate>
            <h3 className="mb-sobrelinha">Compra</h3>
            <div className="mb-form-grade">
              <Campo rotulo="Valor (R$)" colunas={6}>
                <input className="mb-campo__entrada" inputMode="decimal" placeholder="450.000" autoComplete="off" {...campo("valor")} />
              </Campo>
              <CampoSelecao rotulo="Dormitórios" colunas={6}>
                <select className="mb-campo__entrada" {...campo("dormitorios")}>
                  <option value="">–</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </CampoSelecao>
              <Campo rotulo="Região" colunas={6}>
                <input className="mb-campo__entrada" placeholder="Rudge Ramos, Centro / SBC" {...campo("regiao")} />
              </Campo>
              <CampoSelecao rotulo="Finalidade" colunas={6}>
                <select className="mb-campo__entrada" {...campo("finalidade")}>
                  <option value="">–</option>
                  <option value="morar">Morar</option>
                  <option value="investir">Investir</option>
                </select>
              </CampoSelecao>
              <CampoEmpreendimento valor={f.empreendimento} vazio="–" colunas={6} onChange={(v) => { setF((x) => ({ ...x, empreendimento: v })); setEditado(true); }} />
              <Campo rotulo="Campanha" colunas={6}>
                <input className="mb-campo__entrada" {...campo("campanha")} />
              </Campo>
              {perfil && (
                <>
                  <CampoSelecao rotulo="Pronto ou na planta" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("pronto_planta")}>
                      {opcoes(PRONTO_OU_PLANTA)}
                    </select>
                  </CampoSelecao>
                  <CampoSelecao rotulo="Prazo de compra" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("prazo_compra")}>
                      {opcoes(PRAZOS_COMPRA)}
                    </select>
                  </CampoSelecao>
                  <CampoSelecao rotulo="Forma de pagamento" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("forma_pagamento")}>
                      {opcoes(FORMAS_PAGAMENTO)}
                    </select>
                  </CampoSelecao>
                  <CampoSelecao rotulo="Usa FGTS" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("usa_fgts")}>
                      <option value="">–</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </CampoSelecao>
                  <CampoSelecao rotulo="Renda familiar" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("renda_faixa")}>
                      {opcoes(FAIXAS_RENDA)}
                    </select>
                  </CampoSelecao>
                  <Campo rotulo="Entrada disponível (R$)" colunas={6}>
                    <input className="mb-campo__entrada" inputMode="decimal" placeholder="80.000" autoComplete="off" {...campo("entrada")} />
                  </Campo>
                  <CampoSelecao rotulo="Motivo da compra">
                    <select className="mb-campo__entrada" {...campo("motivo_compra")}>
                      {opcoes(MOTIVOS_COMPRA)}
                    </select>
                  </CampoSelecao>
                </>
              )}
            </div>

            {perfil ? (
              <>
                <h3 className="mb-sobrelinha">Dados pessoais</h3>
                <div className="mb-form-grade">
                  <Campo rotulo="Data de nascimento" colunas={6}>
                    <input className="mb-campo__entrada" type="date" min="1900-01-01" max={maxNascimento} {...campo("nascimento")} />
                  </Campo>
                  <Campo rotulo="Profissão" colunas={6}>
                    <input className="mb-campo__entrada" maxLength={120} autoComplete="off" {...campo("profissao")} />
                  </Campo>
                  <CampoSelecao rotulo="Estado civil" colunas={6}>
                    <select className="mb-campo__entrada" {...campo("estado_civil")}>
                      {opcoes(ESTADOS_CIVIS)}
                    </select>
                  </CampoSelecao>
                  <Campo rotulo="Outro telefone" colunas={6}>
                    <input className="mb-campo__entrada" type="tel" inputMode="tel" placeholder="(11) 98765-4321" autoComplete="off" {...campo("telefone2")} />
                  </Campo>
                  <Campo rotulo="Cidade onde mora" colunas={6}>
                    <input className="mb-campo__entrada" maxLength={120} autoComplete="off" {...campo("cidade_mora")} />
                  </Campo>
                  <Campo rotulo="Bairro onde mora" colunas={6}>
                    <input className="mb-campo__entrada" maxLength={120} autoComplete="off" {...campo("bairro_mora")} />
                  </Campo>
                  <Campo rotulo="E-mail">
                    <input className="mb-campo__entrada" type="email" inputMode="email" autoComplete="off" {...campo("email")} />
                  </Campo>
                </div>
              </>
            ) : (
              <>
                <Campo rotulo="E-mail">
                  <input className="mb-campo__entrada" type="email" inputMode="email" autoComplete="off" {...campo("email")} />
                </Campo>
                {erroPerfil && <Aviso tom="alerta" titulo="Os campos novos do perfil não carregaram" texto={erroPerfil} />}
              </>
            )}

            {erro && <Aviso tom="erro" titulo={erro} />}
            <div className="mb-grupo-botoes mb-grupo-botoes--fim">
              <button type="submit" className="mb-botao mb-botao--secundario mb-botao--bloco-celular" aria-busy={salvando || undefined} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar perfil"}
              </button>
            </div>
          </form>
        </Recolhivel>
      </div>
    </section>
  );
}

/** Os dados pessoais preenchidos, só leitura (gerente e quem vê o lead sem ser o dono). */
export function DadosDoCliente({ lead }: { lead: LeadDaFicha }) {
  const dados = dadosPessoais(lead);
  if (!dados.length) return null;
  return (
    <Cartao id="dados-cliente" titulo="Dados do cliente">
      <Pares itens={dados.map((d) => ({ rotulo: d.rotulo, valor: d.valor }))} />
    </Cartao>
  );
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/**
 * Documentos do lead no bucket privado, na aba Documentos da ficha (o conteúdo do painel, sem cartão): o dono
 * anexa (foto ou PDF, até 10 MB) e remove; quem vê o lead abre por um link que vale 60 segundos. O Vendas
 * pede o tipo do documento antes do arquivo, então a área de envio só liga depois dele. O que deu certo sai
 * em `Toast`, e Remover confirma na própria linha.
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
  const toast = useToast();
  const { docs, erro: erroLista, recarregar } = useDocumentos(leadId);
  const [categoria, setCategoria] = useState<CategoriaDocumento | "">("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined, limpar: () => void) {
    if (!arquivo || !categoria) return;
    setErro(null);
    setEnviando(true);
    const e = await enviarDocumento(leadId, arquivo, categoria);
    setEnviando(false);
    limpar();
    if (e) return setErro(e);
    toast.mostrar(`${nomeCategoria(categoria)} anexado.`, { tipo: "sucesso" });
    setCategoria("");
    await recarregar();
    onMudou();
  }

  async function remover(d: Documento) {
    setErro(null);
    const e = await removerDocumento(d);
    if (e) return setErro(e);
    toast.mostrar(`${nomeCategoria(d.categoria)} removido.`, { tipo: "sucesso" });
    await recarregar();
    onMudou();
  }

  return (
    <>
      <Aviso
        titulo="Dados pessoais protegidos pela LGPD"
        texto="Anexe só o que a proposta pede. Só o corretor do lead, o gerente da equipe e a gerência geral abrem os arquivos."
      />
      {erroLista && <Aviso tom="erro" titulo={erroLista} />}
      {podeEnviar && !erroLista && (
        <>
          <CampoSelecao rotulo="Tipo do documento">
            <select className="mb-campo__entrada" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}>
              <option value="">Escolha o tipo</option>
              {CATEGORIAS_DOCUMENTO.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nome}
                </option>
              ))}
            </select>
          </CampoSelecao>
          <div className="ficha__envio">
            <span className="mb-campo__rotulo" id="doc-arquivo">
              Arquivo
            </span>
            <Envio
              idRotulo="doc-arquivo"
              titulo={
                <>
                  Arraste ou <u>escolha no aparelho</u>
                </>
              }
              ajuda="Foto ou PDF · até 10 MB"
              accept={ACEITA_DOCUMENTO}
              desabilitado={!categoria || enviando}
              onEscolher={enviar}
            />
            {(!categoria || enviando) && <span className="mb-campo__ajuda">{enviando ? "Enviando…" : "Escolha o tipo do documento primeiro."}</span>}
          </div>
        </>
      )}
      {erro && <Aviso tom="erro" titulo={erro} />}
      {docs === null && !erroLista && <p className="ficha__texto">Carregando…</p>}
      {docs && docs.length > 0 && (
        <ul className="mb-envio__lista ficha__lista">
          {docs.map((d) => (
            <ItemDocumento key={d.id} doc={d} podeRemover={podeRemover} onRemover={() => remover(d)} onErro={setErro} />
          ))}
        </ul>
      )}
      {docs && !docs.length && !erroLista && <p className="ficha__texto">Nenhum documento anexado.</p>}
    </>
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
  const [removendo, setRemovendo] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const remover = useRef<HTMLButtonElement>(null);

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

  const fechar = () => {
    setConfirmando(false);
    requestAnimationFrame(() => remover.current?.focus());
  };

  return (
    <>
      <ItemDeEnvio
        nome={doc.nome}
        estado={`${nomeCategoria(doc.categoria)} · ${formatarTamanho(doc.tamanho)} · ${dataCurta(doc.enviado_em)}`}
        acoes={
          <span className="mb-grupo-botoes">
            <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" aria-label={`Abrir ${doc.nome}`} onClick={abrir} disabled={abrindo}>
              {abrindo ? "Abrindo…" : "Abrir"}
            </button>
            {podeRemover && (
              <button ref={remover} type="button" className="mb-botao mb-botao--discreto mb-botao--p" aria-label={`Remover ${doc.nome}`} aria-expanded={confirmando} onClick={() => setConfirmando(true)}>
                Remover
              </button>
            )}
          </span>
        }
      />
      {confirmando && (
        <li className="ficha__confirmar">
          <ConfirmarNaLinha
            pergunta="✕ Remover este arquivo?"
            efeito="Ele sai do Base360 Vendas e o histórico registra a remoção."
            verbo="Remover"
            ocupado={removendo}
            onCancelar={fechar}
            onConfirmar={() => {
              setRemovendo(true);
              onRemover().finally(() => {
                setRemovendo(false);
                setConfirmando(false);
              });
            }}
          />
        </li>
      )}
    </>
  );
}
