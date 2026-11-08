"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Casca } from "@/components/casca";
import { Aviso } from "@/components/alicerce/aviso";
import { BarraDeAcoes } from "@/components/alicerce/barra-de-acoes";
import { BuscaComSugestoes } from "@/components/alicerce/busca-com-sugestoes";
import { Campo, CampoEmGrupo, CampoSelecao } from "@/components/alicerce/campo";
import { Cartao } from "@/components/alicerce/cartao";
import { DataHora } from "@/components/alicerce/data-hora";
import { Duplicado, type DadosDoDuplicado } from "@/components/alicerce/duplicado";
import { precisaChecarDuplicado } from "@/lib/duplicado";
import { Pares } from "@/components/alicerce/pares";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { Selo } from "@/components/alicerce/selo";
import { Seletor } from "@/components/alicerce/seletor";
import { db, novoId } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { erroAoSalvar, jaEstavaSalvo, mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, TEMPERATURAS, deCampos, formatarWhatsapp, normalizarWhatsapp, type Lead, type Temperatura } from "@/lib/leads";
import { camposEncontrados, lerMensagem, type LeadLido } from "@/lib/cadastro-magico";
import {
  gravarUltimaOrigem,
  lerUltimaOrigem,
  useCatalogos,
  useCorretores,
  useHorarioAtendimento,
} from "@/lib/leads-dados";
import { AvisarCorretor } from "@/components/leads/repasse";
import { acharNoCatalogo, bairrosDoCatalogo, listaDoMagico, nomeStatus, nomesDoCatalogo } from "@/lib/catalogo";
import { useCatalogo } from "@/lib/catalogo-dados";
import { chaveRascunhoNovoLead, lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import Link from "next/link";

export default function NovoLeadPage() {
  const { pode } = useSessao();
  return (
    <Casca
      titulo={pode("leads.atribuir") ? "Lead da empresa" : "Novo lead"}
      exige={pode("leads.atribuir") ? "leads.atribuir" : "leads.cadastrar"}
      migrada
    >
      <NovoLead />
    </Casca>
  );
}

/** Perfil que veio da mensagem colada e que o corretor tocou para usar. */
type PerfilColado = { valor: number | null; dormitorios: number | null; regiao: string | null };

/** Os campos que mostram erro de validação, e onde o foco vai (o primeiro campo errado). */
type CampoComErro = "nome" | "whatsapp" | "origem" | "dono" | "email" | "contato";
const ONDE_FOCAR: Record<CampoComErro, string> = {
  nome: "#novo-nome",
  whatsapp: "#novo-whatsapp",
  origem: '.mb-opcoes[aria-labelledby="novo-origem"] button',
  dono: "#novo-dono",
  email: "#novo-email",
  contato: "form .mb-campo__par input",
};

type RascunhoNovoLead = {
  nome?: string;
  whatsapp?: string;
  email?: string;
  origem?: string | null;
  campanha?: string;
  empreendimento?: string;
  temperatura?: Temperatura | null;
  contato?: { data: string; hora: string };
  detalhes?: boolean;
  dono?: string;
  mensagem?: string | null;
  perfil?: PerfilColado | null;
};

const reais = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

/**
 * Cadastro rápido: só nome, WhatsApp e origem são obrigatórios. A origem é 1
 * toque e já vem com a última usada neste aparelho. O resto fica para a ficha.
 * Quem distribui leads (leads.atribuir) escolhe o corretor que vai receber.
 * "Colar mensagem" (Cadastro Mágico) preenche os campos a partir do texto.
 */
function NovoLead() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const router = useRouter();
  const atribui = pode("leads.atribuir");
  const { catalogos, erro: erroCatalogo } = useCatalogos();
  const corretores = useCorretores(atribui);

  const [colando, setColando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilColado | null>(null);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [origem, setOrigem] = useState<string | null>(null);
  const [campanha, setCampanha] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [temperatura, setTemperatura] = useState<Temperatura | null>(null);
  const [contato, setContato] = useState({ data: "", hora: "" });
  const [detalhes, setDetalhes] = useState(false);
  const [dono, setDono] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // O aviso de duplicado e o número a que ele se refere: mudar o WhatsApp apaga os dois, como antes.
  const [avisoDup, setAvisoDup] = useState<{ numero: string; dados: DadosDoDuplicado } | null>(null);
  // Erro de validação no campo (FormularioDenso): um por vez, na mesma ordem de antes; `foco` leva o cursor até ele.
  const [erroCampo, setErroCampo] = useState<{ campo: CampoComErro; texto: string } | null>(null);
  const [foco, setFoco] = useState(0);
  const avisoRef = useRef<HTMLDivElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [repasse, setRepasse] = useState<Lead | null>(null);
  const ids = useRef<{ lead: string; mensagem: string } | null>(null);
  const horario = useHorarioAtendimento();
  const restauradoRef = useRef(false);
  const { catalogo } = useCatalogo();

  // O empreendimento digitado vale mesmo fora do catálogo; a lista só sugere. O detalhe separa homônimos.
  const opcoesDeEmpreendimento = useMemo(
    () =>
      nomesDoCatalogo(catalogo).map((nomeDoEmpreendimento) => {
        const e = catalogo?.find((x) => x.nome === nomeDoEmpreendimento);
        return { valor: nomeDoEmpreendimento, detalhe: e ? [nomeStatus(e.status), e.bairro].filter(Boolean).join(" · ") : undefined };
      }),
    [catalogo],
  );
  const foraDoCatalogo = !!empreendimento.trim() && !!catalogo?.length && !acharNoCatalogo(empreendimento, catalogo);

  // Ao enviar com erro, o foco vai ao campo errado (FormularioDenso); o aviso de duplicado entra na vista.
  useEffect(() => {
    if (!erroCampo) return;
    document.querySelector<HTMLElement>(ONDE_FOCAR[erroCampo.campo])?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco]);
  useEffect(() => {
    if (avisoDup) avisoRef.current?.scrollIntoView({ block: "center" });
  }, [avisoDup]);

  useEffect(() => {
    if (!eu.id || restauradoRef.current) return;
    const r = lerRascunho<RascunhoNovoLead>(chaveRascunhoNovoLead(eu.id));
    if (r) {
      if (typeof r.nome === "string") setNome(r.nome);
      if (typeof r.whatsapp === "string") setWhatsapp(r.whatsapp);
      if (typeof r.email === "string") setEmail(r.email);
      if (r.origem !== undefined) setOrigem(r.origem);
      if (typeof r.campanha === "string") setCampanha(r.campanha);
      if (typeof r.empreendimento === "string") setEmpreendimento(r.empreendimento);
      if (r.temperatura !== undefined) setTemperatura(r.temperatura);
      if (r.contato && typeof r.contato === "object") setContato(r.contato);
      if (typeof r.dono === "string") setDono(r.dono);
      if (r.mensagem !== undefined) setMensagem(r.mensagem);
      if (r.perfil !== undefined) setPerfil(r.perfil);

      const abrirDetalhes =
        !!r.detalhes ||
        !!r.email ||
        !!r.empreendimento ||
        !!r.temperatura ||
        !!r.contato?.data;
      if (abrirDetalhes) setDetalhes(true);
    }
    restauradoRef.current = true;
  }, [eu.id]);

  const origens = useMemo(
    () => (catalogos?.origens ?? []).filter((o) => o.ativo && (atribui || !o.restrita)),
    [catalogos, atribui],
  );
  const origemAtual = origens.find((o) => o.slug === origem);

  useEffect(() => {
    if (origem || !origens.length) return;
    const ultima = lerUltimaOrigem(eu.id);
    const padrao = atribui ? origens.find((o) => o.restrita) : undefined;
    setOrigem((origens.find((o) => o.slug === ultima) ?? padrao)?.slug ?? null);
  }, [origens, origem, eu.id, atribui]);

  const temAlgo = !!(
    nome.trim() ||
    whatsapp.trim() ||
    email.trim() ||
    campanha.trim() ||
    empreendimento.trim() ||
    temperatura ||
    contato.data ||
    contato.hora ||
    mensagem ||
    perfil ||
    (atribui && dono)
  );

  useEffect(() => {
    if (!restauradoRef.current || !eu.id) return;
    if (temAlgo) {
      salvarRascunho(chaveRascunhoNovoLead(eu.id), {
        nome,
        whatsapp,
        email,
        origem,
        campanha,
        empreendimento,
        temperatura,
        contato,
        detalhes,
        dono,
        mensagem,
        perfil,
      });
    } else {
      limparRascunho(chaveRascunhoNovoLead(eu.id));
    }
  }, [
    eu.id,
    atribui,
    temAlgo,
    nome,
    whatsapp,
    email,
    origem,
    campanha,
    empreendimento,
    temperatura,
    contato,
    detalhes,
    dono,
    mensagem,
    perfil,
  ]);

  function usarMensagem(texto: string, lido: LeadLido, escolhido: PerfilColado) {
    if (lido.nome.valor) setNome(lido.nome.valor);
    if (lido.whatsapp.valor) setWhatsapp(formatarWhatsapp(lido.whatsapp.valor));
    if (lido.email.valor) setEmail(lido.email.valor);
    if (lido.empreendimento.valor) setEmpreendimento(lido.empreendimento.valor);
    if (lido.email.valor || lido.empreendimento.valor) setDetalhes(true);
    setPerfil(escolhido.valor || escolhido.dormitorios || escolhido.regiao ? escolhido : null);
    setMensagem(texto.trim());
    setAvisoDup(null);
    setErro(null);
    setErroCampo(null);
    setColando(false);
  }

  function invalido(campo: CampoComErro, texto: string) {
    if (campo === "contato" || campo === "email") setDetalhes(true);
    setErroCampo({ campo, texto });
    setFoco((n) => n + 1);
  }

  async function salvar(e?: React.FormEvent, assimMesmo = false) {
    e?.preventDefault();
    setErro(null);
    setErroCampo(null);
    // Sem telefone pode (04/11/2026); digitado, precisa estar certo.
    const numero = whatsapp.trim() ? normalizarWhatsapp(whatsapp) : null;
    if (!nome.trim()) return invalido("nome", "Preencha o nome.");
    if (whatsapp.trim() && !numero) return invalido("whatsapp", "Confira o WhatsApp: DDD e número, como (11) 98765-4321.");
    if (!origemAtual) return invalido("origem", "Escolha a origem.");
    if (atribui && !dono) return invalido("dono", "Escolha o corretor que vai receber o lead.");
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return invalido("email", "Confira o e-mail.");
    const proximo = contato.data ? deCampos(contato.data, contato.hora || "09:00") : null;
    if (contato.data && !proximo) return invalido("contato", "Confira o dia e a hora do próximo contato.");

    setSalvando(true);
    // Num novo toque depois de uma tentativa enviada, o lead "duplicado" pode ser o próprio. Com o aviso na tela, só
    // "Cadastrar assim mesmo" (aviso visível) grava; o Cadastrar principal confere de novo (lib/duplicado.ts).
    if (numero && precisaChecarDuplicado({ numero, jaTemId: !!ids.current, assimMesmo, avisoAtual: avisoDup && { numero: avisoDup.numero, forma: avisoDup.dados.forma } })) {
      // Aviso de duplicado. Entre os leads que a pessoa enxerga, mostra o nome (e o corretor, para o gerente) e deixa
      // abrir o existente ou cadastrar assim mesmo. Nos outros, a função do banco só diz que o número está em outra
      // carteira, e o cadastro não segue.
      const aviso = await avisoDeDuplicado(numero);
      if (aviso) {
        setAvisoDup({ numero, dados: aviso });
        setSalvando(false);
        return;
      }
    }

    // O id nasce no aparelho e fica até o cadastro terminar: se a resposta se
    // perder e a pessoa tocar de novo em Cadastrar, o banco recusa a cópia.
    ids.current ??= { lead: novoId(), mensagem: novoId() };
    const { lead: idLead, mensagem: idMensagem } = ids.current;
    const inserido = await db()
      .from("leads")
      .insert({
        id: idLead,
        dono_id: atribui ? dono : eu.id,
        nome: nome.trim(),
        whatsapp: numero,
        email: email.trim() || null,
        origem: origemAtual.slug,
        campanha: origemAtual.pede_campanha ? campanha.trim() || null : null,
        empreendimento: empreendimento.trim() || null,
        temperatura,
        proximo_contato: proximo,
        ...(perfil ?? {}),
      })
      .select(COLUNAS_LEAD)
      .single<Lead>();
    const { data, error } = jaEstavaSalvo(inserido.error)
      ? await db().from("leads").select(COLUNAS_LEAD).eq("id", idLead).single<Lead>()
      : inserido;
    if (error) {
      setSalvando(false);
      return setErro(erroAoSalvar(error));
    }
    gravarUltimaOrigem(eu.id, origemAtual.slug);
    if (mensagem) {
      // A mensagem colada vira a primeira interação ("Mensagem original").
      const { error: e2 } = await db()
        .from("lead_interacoes")
        .insert({ id: idMensagem, lead_id: data.id, tipo: "mensagem", texto: mensagem.slice(0, 4000) });
      if (e2 && !jaEstavaSalvo(e2)) {
        setSalvando(false);
        return setErro(`O lead foi cadastrado, mas a mensagem original não foi guardada: ${mensagemErro(e2)} Toque em Cadastrar de novo para tentar só a mensagem.`);
      }
    }
    ids.current = null;
    limparRascunho(chaveRascunhoNovoLead(eu.id));
    setSalvando(false);
    if (atribui) setRepasse(data);
    else router.push(`/leads/ficha/?id=${data.id}`);
  }

  async function avisoDeDuplicado(numero: string): Promise<DadosDoDuplicado | null> {
    const { data } = await db()
      .from("leads")
      .select("id, nome, dono_id")
      .eq("whatsapp", numero)
      .eq("status", "ativo")
      .limit(1);
    const visivel = data?.[0] as { id: string; nome: string; dono_id: string } | undefined;
    if (visivel) {
      const deOutro = visivel.dono_id !== eu.id ? corretores.find((c) => c.id === visivel.dono_id)?.nome : undefined;
      return { forma: "visivel", id: visivel.id, nome: visivel.nome, deOutro };
    }
    const { data: emOutra } = await db().rpc("whatsapp_em_outra_carteira", { p_whatsapp: numero });
    return emOutra === true ? { forma: "outra-carteira", atribui } : null;
  }

  function novoCadastro() {
    limparRascunho(chaveRascunhoNovoLead(eu.id));
    setRepasse(null);
    setNome("");
    setWhatsapp("");
    setEmail("");
    setCampanha("");
    setEmpreendimento("");
    setTemperatura(null);
    setContato({ data: "", hora: "" });
    setDetalhes(false);
    setMensagem(null);
    setPerfil(null);
    setAvisoDup(null);
    setErro(null);
    setErroCampo(null);
  }

  const nomeDoCorretor = (id: string | null) => corretores.find((c) => c.id === id)?.nome;
  const titulo = atribui ? "Lead da empresa" : "Novo lead";
  const rotuloDoPerfil = perfil
    ? [perfil.valor && `Até ${reais(perfil.valor)}`, perfil.dormitorios && `${perfil.dormitorios} dorm.`, perfil.regiao].filter(Boolean).join(" · ")
    : "";

  if (repasse)
    return (
      <div className="pagina-alicerce pagina-alicerce--estreita">
        <h1 className="mb-visualmente-oculto">{titulo}</h1>
        <Cartao
          id="lead-cadastrado"
          titulo="✓ Lead cadastrado"
          descricao={`${repasse.nome} foi para ${nomeDoCorretor(repasse.dono_id) ?? "o corretor"}. Avise no WhatsApp com a mensagem pronta.`}
        >
          <AvisarCorretor
            corretorId={repasse.dono_id ?? ""}
            corretorNome={nomeDoCorretor(repasse.dono_id) ?? "Corretor"}
            lead={repasse}
            horario={horario}
            />
        </Cartao>
        <div className="mb-grupo-botoes">
          <button type="button" className="mb-botao mb-botao--secundario" onClick={novoCadastro}>
            + Outro lead
          </button>
          <Link href="/leads/" className="mb-botao mb-botao--discreto">
            Ver leads
          </Link>
        </div>
      </div>
    );

  if (colando)
    return (
      <ColarMensagem
        ignorarNomes={[eu.nome, ...corretores.map((c) => c.nome)]}
        onUsar={usarMensagem}
        onVoltar={() => setColando(false)}
      />
    );

  // O erro de um campo: o texto embaixo dele, o aria-invalid e o aria-describedby (FormularioDenso).
  const doCampo = (campo: CampoComErro) => (erroCampo?.campo === campo ? { erro: erroCampo.texto, idErro: `novo-erro-${campo}` } : {});
  const ligado = (campo: CampoComErro) =>
    erroCampo?.campo === campo ? { "aria-invalid": true as const, "aria-describedby": `novo-erro-${campo}` } : {};

  const acaoFinal = (
    <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando}>
      {salvando ? "Salvando…" : "Cadastrar"}
    </button>
  );

  return (
    <form onSubmit={salvar} className="pagina-alicerce pagina-alicerce--estreita" noValidate>
      <h1 className="mb-visualmente-oculto">{titulo}</h1>
      {erroCatalogo && <Aviso tom="erro" titulo={erroCatalogo} />}

      {mensagem ? (
        <Aviso
          tom="sucesso"
          titulo="Dados da mensagem preenchidos"
          texto="Confira, escolha a origem e cadastre. A mensagem fica no histórico."
          acoes={
            <button type="button" className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => setColando(true)}>
              Colar outra
            </button>
          }
        />
      ) : (
        <Cartao id="colar-mensagem" titulo="Colar mensagem" descricao="Cole a conversa do WhatsApp ou o e-mail do lead, e o Base360 Vendas preenche os campos.">
          <div className="mb-grupo-botoes">
            <button type="button" className="mb-botao mb-botao--secundario" onClick={() => setColando(true)}>
              + Colar mensagem
            </button>
          </div>
        </Cartao>
      )}

      <Cartao
        id="dados-do-lead"
        titulo="Dados do lead"
        acao={temAlgo ? <span className="mb-salvo mb-salvo--ok">✓ Rascunho guardado</span> : undefined}
        rodape={acaoFinal}
        rodapeClasse="mb-so-computador"
      >
        <div className="mb-form-secao">
          <div className="mb-form-grade">
            {atribui && (
              <CampoSelecao rotulo="Corretor que vai receber" obrigatorio {...doCampo("dono")}>
                <select id="novo-dono" className="mb-campo__entrada" value={dono} onChange={(e) => setDono(e.target.value)} {...ligado("dono")}>
                  <option value="">Escolha</option>
                  {corretores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </CampoSelecao>
            )}
            <Campo rotulo="Nome" obrigatorio {...doCampo("nome")}>
              <input
                id="novo-nome"
                className="mb-campo__entrada"
                autoComplete="off"
                autoCapitalize="words"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                {...ligado("nome")}
              />
            </Campo>
            <Campo rotulo="WhatsApp" opcional="se o cliente der" {...doCampo("whatsapp")}>
              <input
                id="novo-whatsapp"
                className="mb-campo__entrada"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(11) 98765-4321"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  setAvisoDup(null);
                }}
                onBlur={() => {
                  const n = normalizarWhatsapp(whatsapp);
                  if (n) setWhatsapp(formatarWhatsapp(n));
                }}
                {...ligado("whatsapp")}
              />
            </Campo>
            <CampoEmGrupo id="novo-origem" rotulo="Origem" obrigatorio {...doCampo("origem")}>
              <Seletor idRotulo="novo-origem" grade="linha" opcoes={origens.map((o) => ({ valor: o.slug, rotulo: o.nome }))} valor={origem} onChange={setOrigem} />
            </CampoEmGrupo>
            {origemAtual?.pede_campanha && (
              <Campo rotulo="Campanha" opcional="opcional">
                <input
                  id="novo-campanha"
                  className="mb-campo__entrada"
                  placeholder="Ex.: Instagram, anúncio do Rudge Ramos"
                  value={campanha}
                  onChange={(e) => setCampanha(e.target.value)}
                />
              </Campo>
            )}
          </div>

          {perfil && (
            <Aviso
              titulo="Perfil da mensagem"
              texto={rotuloDoPerfil}
              acoes={
                <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => setPerfil(null)}>
                  Não usar
                </button>
              }
            />
          )}

          <Recolhivel id="novo-detalhes" titulo="Mais detalhes" contagem="opcional" aberto={detalhes} onAlternar={setDetalhes}>
            <div className="mb-form-grade">
              <CampoEmGrupo id="novo-temperatura" rotulo="Temperatura">
                <Seletor
                  idRotulo="novo-temperatura"
                  grade={3}
                  opcoes={TEMPERATURAS.map((t) => ({
                    valor: t.slug,
                    rotulo: (
                      <>
                        <span aria-hidden="true">{t.sinal}</span> {t.nome}
                      </>
                    ),
                  }))}
                  valor={temperatura}
                  // Tocar na marcada limpa a escolha (a temperatura é opcional), como antes.
                  onChange={(v) => setTemperatura((t) => (t === v ? null : v))}
                />
              </CampoEmGrupo>
              <BuscaComSugestoes
                rotulo="Empreendimento"
                idEntrada="novo-empreendimento"
                valor={empreendimento}
                onChange={setEmpreendimento}
                opcoes={opcoesDeEmpreendimento}
                ajuda={foraDoCatalogo ? "! Não está no catálogo. Confira o nome ou escolha da lista." : undefined}
              />
              <Campo rotulo="E-mail" {...doCampo("email")}>
                <input
                  id="novo-email"
                  className="mb-campo__entrada"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  {...ligado("email")}
                />
              </Campo>
              <CampoEmGrupo id="novo-contato" rotulo="Próximo contato" {...doCampo("contato")}>
                <DataHora idRotulo="novo-contato" atalhosEmGrade data={contato.data} hora={contato.hora} onChange={setContato} />
              </CampoEmGrupo>
            </div>
          </Recolhivel>

          {avisoDup && (
            <div ref={avisoRef}>
              <Duplicado dados={avisoDup.dados} desabilitado={salvando} onSeguir={() => salvar(undefined, true)} />
            </div>
          )}
          {erro && <Aviso tom="erro" titulo={erro} />}
        </div>
      </Cartao>

      <BarraDeAcoes>{acaoFinal}</BarraDeAcoes>
    </form>
  );
}

/**
 * Cadastro Mágico: o corretor cola o texto, vê o que foi achado com um selo por
 * campo e toca nas sugestões de perfil que quer usar. Nada é gravado aqui: os
 * dados voltam para o cadastro rápido, onde ele confere e cadastra.
 */
function ColarMensagem({
  ignorarNomes,
  onUsar,
  onVoltar,
}: {
  ignorarNomes: string[];
  onUsar: (texto: string, lido: LeadLido, perfil: PerfilColado) => void;
  onVoltar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [usarValor, setUsarValor] = useState(false);
  const [usarDorm, setUsarDorm] = useState(false);
  const [bairros, setBairros] = useState<string[]>([]);
  // Empreendimentos e bairros do catálogo; com ele vazio ou fora do ar, a lista fixa.
  const { catalogo } = useCatalogo();
  const listas = useMemo(() => ({ empreendimentos: listaDoMagico(catalogo), bairros: bairrosDoCatalogo(catalogo) }), [catalogo]);
  const lido = useMemo(() => (texto.trim() ? lerMensagem(texto, ignorarNomes, listas) : null), [texto, ignorarNomes, listas]);

  // Texto novo: as sugestões voltam a valer só depois de tocadas.
  useEffect(() => {
    setUsarValor(false);
    setUsarDorm(false);
    setBairros([]);
  }, [texto]);

  const campos = lido
    ? [
        { rotulo: "Nome", campo: lido.nome, valor: lido.nome.valor },
        {
          rotulo: "WhatsApp",
          campo: lido.whatsapp,
          valor: lido.whatsapp.valor && formatarWhatsapp(lido.whatsapp.valor),
        },
        { rotulo: "E-mail", campo: lido.email, valor: lido.email.valor },
        { rotulo: "Empreendimento", campo: lido.empreendimento, valor: lido.empreendimento.valor },
      ]
    : [];
  const s = lido?.sugestoes;
  const temSugestao = !!s && (s.valor || s.dormitorios || s.bairros.length > 0);

  // As sugestões de perfil, uma pílula por item (várias marcadas ao mesmo tempo): "valor", "dorm" ou o bairro.
  const sugestoes = s
    ? [
        ...(s.valor ? [{ valor: "valor", rotulo: <span className="num">Até {reais(s.valor)}</span> }] : []),
        ...(s.dormitorios ? [{ valor: "dorm", rotulo: `${s.dormitorios} ${s.dormitorios === 1 ? "dormitório" : "dormitórios"}` }] : []),
        ...s.bairros.map((b) => ({ valor: `bairro:${b}`, rotulo: b })),
      ]
    : [];
  const marcados = [...(usarValor ? ["valor"] : []), ...(usarDorm ? ["dorm"] : []), ...bairros.map((b) => `bairro:${b}`)];
  function alternar(chave: string) {
    if (chave === "valor") setUsarValor((x) => !x);
    else if (chave === "dorm") setUsarDorm((x) => !x);
    else {
      const b = chave.slice("bairro:".length);
      setBairros((xs) => (xs.includes(b) ? xs.filter((x) => x !== b) : [...xs, b]));
    }
  }

  const usar = () =>
    lido &&
    onUsar(texto, lido, {
      valor: usarValor ? s?.valor ?? null : null,
      dormitorios: usarDorm ? s?.dormitorios ?? null : null,
      regiao: bairros.length ? bairros.join(", ") : null,
    });
  const voltar = (
    <button type="button" className="mb-botao mb-botao--discreto" onClick={onVoltar}>
      Voltar
    </button>
  );
  const usarDados = (
    <button type="button" className="mb-botao mb-botao--primario" disabled={!lido} onClick={usar}>
      Usar estes dados
    </button>
  );

  return (
    <div className="pagina-alicerce pagina-alicerce--estreita">
      <h1 className="mb-visualmente-oculto">Colar mensagem</h1>
      <Cartao id="mensagem-colada" titulo="Colar mensagem">
        <Campo rotulo="Mensagem do WhatsApp ou e-mail do lead">
          <textarea
            id="mensagem"
            className="mb-campo__entrada"
            rows={8}
            autoFocus
            placeholder="Cole aqui a conversa do WhatsApp, o e-mail do portal, do Facebook ou do RD Station."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </Campo>
      </Cartao>

      {lido && (
        <section aria-live="polite" className="pagina-alicerce__grupo">
          <Cartao id="campos-encontrados" titulo={`${camposEncontrados(lido)} de 4 campos encontrados`}>
            <Pares
              itens={campos.map((c) => ({
                rotulo: c.rotulo,
                valor: (
                  <>
                    {c.valor ?? "–"}
                    <SeloDoCampo selo={c.campo.selo} />
                  </>
                ),
              }))}
            />
          </Cartao>
          {!lido.nome.valor ? <Aviso tom="alerta" titulo="O nome é obrigatório" texto="Você completa no cadastro." /> : null}
        </section>
      )}

      {temSugestao && s && (
        <Cartao id="perfil-sugerido" titulo="Perfil: toque no que quiser usar">
          <Seletor idRotulo="perfil-sugerido" multipla grade="linha" opcoes={sugestoes} marcados={marcados} valor={null} onChange={alternar} />
        </Cartao>
      )}

      <div className="mb-grupo-botoes mb-so-computador">
        {voltar}
        {usarDados}
      </div>
      <BarraDeAcoes grupo>
        {voltar}
        {usarDados}
      </BarraDeAcoes>
    </div>
  );
}

/** Selo só no que pede atenção (ImportacaoComPrevia): “! Conferir” e “✕ Não encontrado”. O lido sem dúvida fica sem selo. */
function SeloDoCampo({ selo }: { selo: "detectado" | "conferir" | "faltando" }) {
  if (selo === "detectado") return null;
  return (
    <>
      {" "}
      {selo === "conferir" ? <Selo tom="alerta">! Conferir</Selo> : <Selo>✕ Não encontrado</Selo>}
    </>
  );
}
