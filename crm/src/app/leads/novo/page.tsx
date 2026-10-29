"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { CampoProximoContato, EscolhaTemperatura, RodapeAcao, SeloCampo } from "@/components/leads/partes";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { deCampos, formatarWhatsapp, normalizarWhatsapp, type Temperatura } from "@/lib/leads";
import { camposEncontrados, lerMensagem, type LeadLido } from "@/lib/cadastro-magico";
import { gravarUltimaOrigem, lerUltimaOrigem, useCatalogos, useCorretores } from "@/lib/leads-dados";

export default function NovoLeadPage() {
  const { pode } = useSessao();
  return (
    <Casca
      titulo={pode("leads.atribuir") ? "Lead da empresa" : "Novo lead"}
      exige={pode("leads.atribuir") ? "leads.atribuir" : "leads.cadastrar"}
    >
      <NovoLead />
    </Casca>
  );
}

/** Perfil que veio da mensagem colada e que o corretor tocou para usar. */
type PerfilColado = { valor: number | null; dormitorios: number | null; regiao: string | null };

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
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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

  function usarMensagem(texto: string, lido: LeadLido, escolhido: PerfilColado) {
    if (lido.nome.valor) setNome(lido.nome.valor);
    if (lido.whatsapp.valor) setWhatsapp(formatarWhatsapp(lido.whatsapp.valor));
    if (lido.email.valor) setEmail(lido.email.valor);
    if (lido.empreendimento.valor) setEmpreendimento(lido.empreendimento.valor);
    if (lido.email.valor || lido.empreendimento.valor) setDetalhes(true);
    setPerfil(escolhido.valor || escolhido.dormitorios || escolhido.regiao ? escolhido : null);
    setMensagem(texto.trim());
    setDuplicado(null);
    setErro(null);
    setColando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const numero = normalizarWhatsapp(whatsapp);
    if (!nome.trim()) return setErro("Preencha o nome.");
    if (!numero) return setErro("Confira o WhatsApp: DDD e número, como (11) 98765-4321.");
    if (!origemAtual) return setErro("Escolha a origem.");
    if (atribui && !dono) return setErro("Escolha o corretor que vai receber o lead.");
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErro("Confira o e-mail.");
    const proximo = contato.data ? deCampos(contato.data, contato.hora || "09:00") : null;
    if (contato.data && !proximo) return setErro("Confira o dia e a hora do próximo contato.");

    setSalvando(true);
    if (duplicado !== numero) {
      // Aviso de duplicado entre os leads que a pessoa enxerga; não impede o cadastro.
      const { data } = await db().from("leads").select("nome").eq("whatsapp", numero).eq("status", "ativo").limit(1);
      if (data?.length) {
        setDuplicado(numero);
        setSalvando(false);
        return setErro(
          `Já existe um lead ativo com este WhatsApp: ${data[0].nome}. Toque em Cadastrar de novo para confirmar.`,
        );
      }
    }

    const { data, error } = await db()
      .from("leads")
      .insert({
        dono_id: atribui ? dono : eu.id,
        nome: nome.trim(),
        whatsapp: numero,
        email: email.trim() || null,
        origem: origemAtual.slug,
        campanha: origemAtual.pede_campanha ? campanha.trim() || null : null,
        empreendimento: empreendimento.trim() || null,
        temperatura,
        // Lead novo sem dia marcado entra para agora: aparece no topo da lista do dia de quem recebe.
        proximo_contato: proximo ?? new Date().toISOString(),
        ...(perfil ?? {}),
      })
      .select("id")
      .single();
    if (error) {
      setSalvando(false);
      return setErro(mensagemErro(error));
    }
    gravarUltimaOrigem(eu.id, origemAtual.slug);
    if (mensagem) {
      // A mensagem colada vira a primeira interação ("Mensagem original").
      const { error: e2 } = await db()
        .from("lead_interacoes")
        .insert({ lead_id: data.id, tipo: "mensagem", texto: mensagem.slice(0, 4000) });
      if (e2) {
        setSalvando(false);
        return setErro(`O lead foi cadastrado, mas a mensagem original não foi guardada: ${mensagemErro(e2)}`);
      }
    }
    setSalvando(false);
    router.push(atribui ? "/leads/" : `/leads/ficha/?id=${data.id}`);
  }

  if (colando)
    return (
      <ColarMensagem
        ignorarNomes={[eu.nome, ...corretores.map((c) => c.nome)]}
        onUsar={usarMensagem}
        onVoltar={() => setColando(false)}
      />
    );

  return (
    <form onSubmit={salvar} className="grid max-w-[640px] gap-5 pb-24 md:pb-0" noValidate>
      {erroCatalogo && <p className="aviso-erro">! {erroCatalogo}</p>}

      {mensagem ? (
        <p className="aviso-ok">
          ✓ Dados da mensagem preenchidos. Confira, escolha a origem e cadastre. A mensagem fica no histórico.{" "}
          <button type="button" className="link-acao" onClick={() => setColando(true)}>
            Colar outra
          </button>
        </p>
      ) : (
        <button type="button" className="card focus-ring text-left" onClick={() => setColando(true)}>
          <span className="titulo-card block">+ Colar mensagem</span>
          <span className="mt-1 block text-[13px] text-ink-soft">
            Cole a conversa do WhatsApp ou o e-mail do lead, e o CRM preenche os campos.
          </span>
        </button>
      )}

      {atribui && (
        <div>
          <label className="field-label" htmlFor="dono">
            Corretor que vai receber
          </label>
          <select id="dono" className="input" value={dono} onChange={(e) => setDono(e.target.value)}>
            <option value="">Escolha</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          className="input"
          autoComplete="off"
          autoCapitalize="words"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="whatsapp">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          className="input num"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 98765-4321"
          value={whatsapp}
          onChange={(e) => {
            setWhatsapp(e.target.value);
            setDuplicado(null);
          }}
          onBlur={() => {
            const n = normalizarWhatsapp(whatsapp);
            if (n) setWhatsapp(formatarWhatsapp(n));
          }}
        />
      </div>

      <fieldset>
        <legend className="field-label">Origem</legend>
        <div className="grid grid-cols-2 gap-2">
          {origens.map((o) => {
            const marcada = origem === o.slug;
            return (
              <button
                key={o.slug}
                type="button"
                aria-pressed={marcada}
                onClick={() => setOrigem(o.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-3 py-3 text-left text-[14px] font-semibold transition-colors",
                  marcada ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {marcada && <span aria-hidden>✓ </span>}
                {o.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      {origemAtual?.pede_campanha && (
        <div>
          <label className="field-label" htmlFor="campanha">
            Campanha
          </label>
          <input
            id="campanha"
            className="input"
            placeholder="Ex.: Instagram, anúncio do Rudge Ramos"
            value={campanha}
            onChange={(e) => setCampanha(e.target.value)}
          />
        </div>
      )}

      {perfil && (
        <div className="card">
          <span className="eyebrow">Perfil da mensagem</span>
          <p className="num mt-1">
            {[
              perfil.valor && `Até ${reais(perfil.valor)}`,
              perfil.dormitorios && `${perfil.dormitorios} dorm.`,
              perfil.regiao,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <button type="button" className="link-acao mt-2" onClick={() => setPerfil(null)}>
            Não usar
          </button>
        </div>
      )}

      <details className="card" open={detalhes} onToggle={(e) => setDetalhes(e.currentTarget.open)}>
        <summary className="focus-ring cursor-pointer list-none font-semibold">
          <span aria-hidden>+ </span>Mais detalhes (opcional)
        </summary>
        <div className="mt-4 grid gap-4">
          <div>
            <span className="field-label">Temperatura</span>
            <EscolhaTemperatura valor={temperatura} onChange={setTemperatura} podeLimpar />
          </div>
          <div>
            <label className="field-label" htmlFor="empreendimento">
              Empreendimento
            </label>
            <input
              id="empreendimento"
              className="input"
              value={empreendimento}
              onChange={(e) => setEmpreendimento(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <span className="field-label">Próximo contato</span>
            <CampoProximoContato idBase="novo-contato" {...contato} onChange={setContato} />
          </div>
        </div>
      </details>

      {erro && <p className="aviso-erro">! {erro}</p>}

      <RodapeAcao>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Cadastrar"}
        </button>
      </RodapeAcao>
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
  const lido = useMemo(() => (texto.trim() ? lerMensagem(texto, ignorarNomes) : null), [texto, ignorarNomes]);

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

  return (
    <div className="grid max-w-[640px] gap-5 pb-24 md:pb-0">
      <div>
        <label className="field-label" htmlFor="mensagem">
          Mensagem do WhatsApp ou e-mail do lead
        </label>
        <textarea
          id="mensagem"
          className="input min-h-[160px]"
          autoFocus
          placeholder="Cole aqui a conversa do WhatsApp, o e-mail do portal, do Facebook ou do RD Station."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {lido && (
        <section className="card" aria-live="polite">
          <span className="eyebrow">
            <span className="num">{camposEncontrados(lido)}</span> de <span className="num">4</span> campos
            encontrados
          </span>
          <dl className="mt-3 grid gap-3">
            {campos.map((c) => (
              <div key={c.rotulo} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <dt className="text-[12px] text-concrete">{c.rotulo}</dt>
                  <dd className={clsx("break-words", c.valor ? "num" : "text-ink-soft")}>{c.valor ?? "–"}</dd>
                </div>
                <SeloCampo selo={c.campo.selo} />
              </div>
            ))}
          </dl>
          {!lido.nome.valor || !lido.whatsapp.valor ? (
            <p className="mt-3 text-[13px] text-ink-soft">
              ! Nome e WhatsApp são obrigatórios. Você completa no cadastro.
            </p>
          ) : null}
        </section>
      )}

      {temSugestao && s && (
        <section className="card">
          <span className="eyebrow">Perfil: toque no que quiser usar</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.valor && (
              <Sugestao marcada={usarValor} onClick={() => setUsarValor((x) => !x)}>
                Até {reais(s.valor)}
              </Sugestao>
            )}
            {s.dormitorios && (
              <Sugestao marcada={usarDorm} onClick={() => setUsarDorm((x) => !x)}>
                {s.dormitorios} {s.dormitorios === 1 ? "dormitório" : "dormitórios"}
              </Sugestao>
            )}
            {s.bairros.map((b) => (
              <Sugestao
                key={b}
                marcada={bairros.includes(b)}
                onClick={() => setBairros((xs) => (xs.includes(b) ? xs.filter((x) => x !== b) : [...xs, b]))}
              >
                {b}
              </Sugestao>
            ))}
          </div>
        </section>
      )}

      <RodapeAcao>
        <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={onVoltar}>
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-red btn-lg focus-ring"
          disabled={!lido}
          onClick={() =>
            lido &&
            onUsar(texto, lido, {
              valor: usarValor ? s?.valor ?? null : null,
              dormitorios: usarDorm ? s?.dormitorios ?? null : null,
              regiao: bairros.length ? bairros.join(", ") : null,
            })
          }
        >
          Usar estes dados
        </button>
      </RodapeAcao>
    </div>
  );
}

/** Sugestão de perfil: só vale depois de tocada (✓ marcada). */
function Sugestao({
  marcada,
  onClick,
  children,
}: {
  marcada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      onClick={onClick}
      className={clsx(
        "num focus-ring rounded-sm border px-3 py-2 text-[14px] font-semibold transition-colors",
        marcada ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
      )}
    >
      {marcada ? <span aria-hidden>✓ </span> : <span aria-hidden>+ </span>}
      {children}
    </button>
  );
}
