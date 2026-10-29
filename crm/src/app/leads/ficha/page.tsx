"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import {
  AvisoDesfazer,
  CampoProximoContato,
  PrazoPrimeiroContato,
  EscolhaTemperatura,
  ProximoContato,
  SeloTemperatura,
  SemContato,
} from "@/components/leads/partes";
import { BotaoLigar, BotaoMensagem } from "@/components/leads/mensagem";
import { AvisarCorretor } from "@/components/leads/repasse";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import {
  COLUNAS_EVENTO,
  COLUNAS_INTERACAO,
  COLUNAS_LEAD,
  deCampos,
  formatarQuando,
  formatarWhatsapp,
  MOTIVOS_DESCARTE,
  nomeTipoInteracao,
  paraCampos,
  TIPOS_INTERACAO,
  type Evento,
  type Interacao,
  type Lead,
  type MotivoDescarte,
  type TipoInteracao,
} from "@/lib/leads";
import { LIMITE_TENTATIVAS, seloSemContato, sugereDescarte } from "@/lib/followup";
import { descreverEvento, montarHistorico } from "@/lib/historico";
import { registrarSemResposta, useCatalogos, useCorretores, useHorarioAtendimento } from "@/lib/leads-dados";
import { aguardaPrimeiroContato, type HorarioAtendimento } from "@/lib/prazo";

export default function FichaPage() {
  return (
    <Casca titulo="Ficha do lead">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <FichaPeloEndereco />
      </Suspense>
    </Casca>
  );
}

function FichaPeloEndereco() {
  const id = useSearchParams().get("id");
  if (!id) return <p className="text-ink-soft">! Lead não informado. Volte para a lista.</p>;
  return <Ficha id={id} />;
}

function Ficha({ id }: { id: string }) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState<{ n: number; proximo: string } | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [desfazer, setDesfazer] = useState<{ texto: string; anterior: Partial<Lead> } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);

  const carregar = useCallback(async () => {
    const [l, h, e] = await Promise.all([
      db().from("leads").select(COLUNAS_LEAD).eq("id", id).maybeSingle(),
      db().from("lead_interacoes").select(COLUNAS_INTERACAO).eq("lead_id", id).order("criado_em", { ascending: false }),
      db().from("lead_eventos").select(COLUNAS_EVENTO).eq("lead_id", id).order("criado_em", { ascending: false }),
    ]);
    if (l.error || h.error || e.error) return setErro(mensagemErro(l.error ?? h.error ?? e.error));
    setLead((l.data as unknown as Lead) ?? null);
    setInteracoes((h.data ?? []) as Interacao[]);
    setEventos((e.data ?? []) as Evento[]);
    setAgora(new Date());
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Nomes do dono, dos autores e de quem recebeu o lead (o RLS de profiles já limita ao que a pessoa vê).
  useEffect(() => {
    if (!lead) return;
    const ids = [
      ...new Set(
        [
          lead.dono_id,
          ...interacoes.map((h) => h.autor_id),
          ...eventos.flatMap((e) => (e.tipo === "dono" || e.tipo === "criado" ? [e.autor_id, e.de, e.para] : [e.autor_id])),
        ].filter(Boolean) as string[],
      ),
    ];
    db()
      .from("profiles")
      .select("id, nome")
      .in("id", ids)
      .then(({ data }) => setNomes(new Map((data ?? []).map((p) => [p.id as string, p.nome as string]))));
  }, [lead, interacoes, eventos]);

  if (erro) return <p className="aviso-erro">! {erro}</p>;
  if (lead === undefined) return <p className="text-concrete">Carregando…</p>;
  if (lead === null)
    return (
      <div className="card max-w-[520px]">
        <p>! Lead não encontrado, ou você não tem acesso a ele.</p>
        <Link href="/leads/" className="link-acao mt-3 inline-block">
          Ver leads
        </Link>
      </div>
    );

  const ehDono = lead.dono_id === eu.id && pode("leads.cadastrar");
  const origem = catalogos?.origens.find((o) => o.slug === lead.origem);
  const etapa = catalogos?.etapas.find((e) => e.slug === lead.etapa);

  async function alterar(campos: Partial<Lead>) {
    setErro(null);
    const { error } = await db().from("leads").update(campos).eq("id", id);
    if (error) return setErro(mensagemErro(error));
    await carregar();
  }

  /** Muda e mostra o Desfazer, que grava de volta os valores de antes. */
  async function alterarComDesfazer(campos: Partial<Lead>, texto: string) {
    if (!lead) return;
    const anterior = Object.fromEntries(Object.keys(campos).map((k) => [k, lead[k as keyof Lead]])) as Partial<Lead>;
    setDesfazer(null);
    setErro(null);
    const { error } = await db().from("leads").update(campos).eq("id", id);
    if (error) return setErro(mensagemErro(error));
    await carregar();
    setDesfazer({ texto, anterior });
  }

  const descartar = (motivo: MotivoDescarte) =>
    alterarComDesfazer(
      { status: "descartado", motivo_descarte: motivo },
      `Descartado: ${MOTIVOS_DESCARTE.find((m) => m.slug === motivo)?.nome ?? motivo}`,
    );

  async function semResposta() {
    if (!lead) return;
    setErro(null);
    const { proximo, erro: e } = await registrarSemResposta(id);
    if (e) return setErro(e);
    setTentativa({ n: lead.tentativas + 1, proximo });
    await carregar();
  }

  const historico = montarHistorico(interacoes, eventos);
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((x) => x.slug === slug)?.nome ?? slug;

  return (
    <div className="grid max-w-[760px] gap-4 pb-8">
      <section className="card bar-brand">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">{etapa?.nome ?? lead.etapa}</span>
            <h2 className="titulo-card mt-1 break-words text-[20px]">{lead.nome}</h2>
            <p className="num mt-1 text-ink-soft">{formatarWhatsapp(lead.whatsapp)}</p>
          </div>
          <SeloTemperatura valor={lead.temperatura} />
        </div>
        <dl className="mt-3 grid gap-1 text-[13px]">
          {aguardaPrimeiroContato(lead) && (
            <Linha rotulo="Primeiro contato">
              <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} />
            </Linha>
          )}
          <Linha rotulo="Próximo contato">
            <ProximoContato iso={lead.proximo_contato} agora={agora} />
          </Linha>
          {lead.status === "ativo" && (
            <Linha rotulo="Último contato">
              {seloSemContato(lead, agora) ? (
                <SemContato lead={lead} agora={agora} comTentativas={false} />
              ) : lead.ultima_interacao_em ? (
                <span className="num">{formatarQuando(lead.ultima_interacao_em, agora)}</span>
              ) : (
                <span className="text-ink-soft">Nenhum ainda</span>
              )}
              {lead.tentativas > 0 && (
                <span className="num block text-ink-soft">
                  Tentativa {lead.tentativas} de {LIMITE_TENTATIVAS} sem resposta
                </span>
              )}
            </Linha>
          )}
          <Linha rotulo="Origem">
            {origem?.nome ?? lead.origem}
            {lead.campanha && ` · ${lead.campanha}`}
          </Linha>
          {lead.empreendimento && <Linha rotulo="Empreendimento">{lead.empreendimento}</Linha>}
          {lead.email && <Linha rotulo="E-mail">{lead.email}</Linha>}
          {!ehDono && <Linha rotulo="Corretor">{nomes.get(lead.dono_id) ?? "–"}</Linha>}
          <Linha rotulo="Cadastrado">
            <span className="num">{formatarQuando(lead.created_at, agora)}</span>
          </Linha>
        </dl>
        {lead.status === "descartado" && (
          <p className="mt-3 font-semibold text-ink-soft">
            ✕ Descartado · {MOTIVOS_DESCARTE.find((m) => m.slug === lead.motivo_descarte)?.nome}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <BotaoMensagem lead={lead} className="btn-lg flex-1 md:flex-none" />
          <BotaoLigar numero={lead.whatsapp} className="btn-lg flex-1 md:flex-none" />
          {ehDono && lead.status === "ativo" && (
            <button type="button" className="btn btn-ghost btn-lg focus-ring flex-1 md:flex-none" onClick={semResposta}>
              Sem resposta (+1)
            </button>
          )}
        </div>
        {tentativa && lead.status === "ativo" && (
          <MudarProximoContato
            key={tentativa.proximo}
            n={tentativa.n}
            proximo={tentativa.proximo}
            agora={agora}
            onSalvar={(iso) => alterar({ proximo_contato: iso })}
          />
        )}
      </section>

      {ehDono && sugereDescarte(lead) && (
        <section className="card" aria-labelledby="sugere-descarte">
          <h2 id="sugere-descarte" className="titulo-card">
            ! {lead.tentativas} tentativas sem resposta
          </h2>
          <p className="mt-2 text-ink-soft">
            Descarte como Sem retorno ou continue tentando. O lead descartado fica guardado e pode ser reativado.
          </p>
          <button
            type="button"
            className="btn btn-red focus-ring mt-3"
            onClick={() => descartar("sem_retorno")}
          >
            ✕ Descartar: sem retorno
          </button>
        </section>
      )}

      {ehDono && lead.status === "ativo" && (
        <>
          <RegistrarInteracao leadId={id} onSalvo={carregar} />

          <section className="card">
            <span className="eyebrow">Andamento</span>
            <div className="mt-3 grid gap-4">
              <div>
                <span className="field-label">Temperatura</span>
                <EscolhaTemperatura valor={lead.temperatura} onChange={(t) => alterar({ temperatura: t })} />
              </div>
              <div>
                <label className="field-label" htmlFor="etapa">
                  Etapa
                </label>
                <select
                  id="etapa"
                  className="input"
                  value={lead.etapa}
                  onChange={(e) => alterarComDesfazer({ etapa: e.target.value }, `Etapa: ${nomeEtapa(e.target.value)}`)}
                >
                  {catalogos?.etapas
                    .filter((x) => x.ativo || x.slug === lead.etapa)
                    .map((x) => (
                      <option key={x.slug} value={x.slug}>
                        {x.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          <PerfilCliente lead={lead} onSalvar={alterar} />
          <Descartar key={lead.status} onDescartar={descartar} />
        </>
      )}

      {ehDono && lead.status === "descartado" && (
        <section className="card">
          <p className="text-ink-soft">O lead descartado continua guardado com o histórico.</p>
          <button
            type="button"
            className="btn btn-ghost focus-ring mt-3"
            onClick={() => alterar({ status: "ativo", motivo_descarte: null })}
          >
            Reativar lead
          </button>
        </section>
      )}

      {!ehDono && pode("leads.atribuir") && (
        <Atribuir
          lead={lead}
          horario={horario}
          nomeDe={(u) => nomes.get(u)}
          onAtribuir={(dono) => alterar({ dono_id: dono })}
        />
      )}

      <section className="card">
        <span className="eyebrow">Histórico</span>
        {historico.length ? (
          <ol className="mt-3 grid gap-3">
            {historico.map((item) => {
              const autor = (u: string | null) => (u && u !== eu.id ? ` · ${nomes.get(u) ?? ""}` : "");
              if (item.tipo === "evento") {
                const e = item.evento;
                return (
                  <li key={`e-${e.id}`} className="border-t border-line pt-3 text-[13px] first:border-0 first:pt-0">
                    <p className="num text-[12px] text-concrete">
                      {formatarQuando(e.criado_em, agora)}
                      {e.automatico ? " · automático" : autor(e.autor_id)}
                    </p>
                    <p className="mt-1 text-ink-soft">{descreverEvento(e, nomeEtapa, (u) => nomes.get(u))}</p>
                  </li>
                );
              }
              const h = item.interacao;
              return (
                <li key={`i-${h.id}`} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <p className="num text-[12px] text-concrete">
                    <span className="font-semibold text-ink-soft">{nomeTipoInteracao(h.tipo)}</span> ·{" "}
                    {formatarQuando(h.criado_em, agora)}
                    {autor(h.autor_id)}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words">{h.texto}</p>
                  {h.proximo_contato && (
                    <p className="num mt-1 text-[12px] text-ink-soft">
                      → Próximo contato: {formatarQuando(h.proximo_contato, agora)}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-ink-soft">Nenhuma interação ainda.</p>
        )}
      </section>

      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
          onFim={fecharDesfazer}
          onDesfazer={() => {
            const anterior = desfazer.anterior;
            setDesfazer(null);
            alterar(anterior);
          }}
        />
      )}
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[120px] shrink-0 text-concrete">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Depois do "Sem resposta (+1)": mostra o próximo contato sugerido e deixa mudar o dia. */
function MudarProximoContato({
  n,
  proximo,
  agora,
  onSalvar,
}: {
  n: number;
  proximo: string;
  agora: Date;
  onSalvar: (iso: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [campos, setCampos] = useState(() => paraCampos(new Date(proximo)));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);

  async function salvar() {
    const iso = deCampos(campos.data, campos.hora);
    if (!iso) return setErro("Confira o dia e a hora do próximo contato.");
    setErro(null);
    await onSalvar(iso);
    setSalvo(iso);
    setAberto(false);
  }

  return (
    <div className="mt-3 border-t border-line pt-3" role="status">
      <p className="aviso-ok">
        ✓ Tentativa {n} registrada. Próximo contato: {formatarQuando(salvo ?? proximo, agora)}.
      </p>
      {!aberto ? (
        <button type="button" className="link-acao mt-2" onClick={() => setAberto(true)}>
          Mudar o dia
        </button>
      ) : (
        <div className="mt-3 grid gap-3">
          <CampoProximoContato idBase="tentativa-contato" {...campos} onChange={setCampos} />
          {erro && <p className="aviso-erro">! {erro}</p>}
          <button type="button" className="btn btn-ghost focus-ring justify-self-start" onClick={salvar}>
            Salvar próximo contato
          </button>
        </div>
      )}
    </div>
  );
}

/** Toda interação tem um tipo (1 toque) e termina com o próximo contato: dia e hora. */
function RegistrarInteracao({ leadId, onSalvo }: { leadId: string; onSalvo: () => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoInteracao>("whatsapp");
  const [texto, setTexto] = useState("");
  const [contato, setContato] = useState({ data: "", hora: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!texto.trim()) return setErro("Escreva o que aconteceu.");
    if (!contato.data || !contato.hora) return setErro("Marque o dia e a hora do próximo contato.");
    const proximo = deCampos(contato.data, contato.hora);
    if (!proximo) return setErro("Confira o dia e a hora do próximo contato.");
    setSalvando(true);
    const { error } = await db()
      .from("lead_interacoes")
      .insert({ lead_id: leadId, tipo, texto: texto.trim(), proximo_contato: proximo });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    setTexto("");
    setContato({ data: "", hora: "" });
    await onSalvo();
  }

  return (
    <form onSubmit={salvar} className="card grid gap-3" noValidate>
      <span className="eyebrow">Registrar interação</span>
      <fieldset>
        <legend className="field-label">Como foi</legend>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {TIPOS_INTERACAO.map((t) => {
            const marcado = tipo === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={marcado}
                onClick={() => setTipo(t.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-1 py-2 text-[13px] font-semibold transition-colors",
                  marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {t.nome}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor="texto">
          O que aconteceu
        </label>
        <textarea
          id="texto"
          className="input min-h-[88px]"
          placeholder="Ex.: Falou que quer visitar no sábado"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label">Próximo contato</span>
        <CampoProximoContato idBase="interacao-contato" {...contato} onChange={setContato} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
        {salvando ? "Salvando…" : "Registrar"}
      </button>
    </form>
  );
}

/** Perfil do cliente: tudo opcional, preenchido quando der. */
function PerfilCliente({ lead, onSalvar }: { lead: Lead; onSalvar: (c: Partial<Lead>) => Promise<void> }) {
  const [f, setF] = useState({
    email: lead.email ?? "",
    empreendimento: lead.empreendimento ?? "",
    campanha: lead.campanha ?? "",
    valor: lead.valor?.toString() ?? "",
    dormitorios: lead.dormitorios?.toString() ?? "",
    regiao: lead.regiao ?? "",
    finalidade: lead.finalidade ?? "",
  });
  const [salvo, setSalvo] = useState(false);
  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF((x) => ({ ...x, [k]: e.target.value }));
      setSalvo(false);
    },
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const valor = f.valor ? Number(f.valor.replace(/\./g, "").replace(",", ".")) : null;
    await onSalvar({
      email: f.email.trim() || null,
      empreendimento: f.empreendimento.trim() || null,
      campanha: f.campanha.trim() || null,
      valor: valor !== null && Number.isFinite(valor) ? valor : null,
      dormitorios: f.dormitorios ? Number(f.dormitorios) : null,
      regiao: f.regiao.trim() || null,
      finalidade: (f.finalidade || null) as Lead["finalidade"],
    });
    setSalvo(true);
  }

  return (
    <details className="card">
      <summary className="focus-ring cursor-pointer list-none font-semibold">
        <span aria-hidden>+ </span>Perfil do cliente (opcional)
      </summary>
      <form onSubmit={salvar} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="p-email">
            E-mail
          </label>
          <input id="p-email" className="input" type="email" inputMode="email" autoComplete="off" {...campo("email")} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-emp">
            Empreendimento
          </label>
          <input id="p-emp" className="input" {...campo("empreendimento")} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-camp">
            Campanha
          </label>
          <input id="p-camp" className="input" {...campo("campanha")} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-valor">
            Valor (R$)
          </label>
          <input id="p-valor" className="input num" inputMode="decimal" placeholder="450.000" {...campo("valor")} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-dorm">
            Dormitórios
          </label>
          <select id="p-dorm" className="input" {...campo("dormitorios")}>
            <option value="">–</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="p-reg">
            Região
          </label>
          <input id="p-reg" className="input" {...campo("regiao")} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-fin">
            Finalidade
          </label>
          <select id="p-fin" className="input" {...campo("finalidade")}>
            <option value="">–</option>
            <option value="morar">Morar</option>
            <option value="investir">Investir</option>
          </select>
        </div>
        <div className="flex items-center gap-3 md:col-span-2">
          <button type="submit" className="btn btn-ghost focus-ring">
            Salvar perfil
          </button>
          {salvo && <span className="aviso-ok">✓ Salvo</span>}
        </div>
      </form>
    </details>
  );
}

/** Descartar em 1 toque: o toque no motivo já descarta. */
function Descartar({ onDescartar }: { onDescartar: (m: MotivoDescarte) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="card">
      {!aberto ? (
        <button type="button" className="btn btn-ghost focus-ring" onClick={() => setAberto(true)}>
          ✕ Descartar lead
        </button>
      ) : (
        <>
          <span className="eyebrow">Descartar: escolha o motivo</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MOTIVOS_DESCARTE.map((m) => (
              <button
                key={m.slug}
                type="button"
                className="btn btn-ghost focus-ring whitespace-normal py-3"
                onClick={() => onDescartar(m.slug)}
              >
                {m.nome}
              </button>
            ))}
            <button
              type="button"
              className={clsx("focus-ring py-3 text-[13px] font-semibold text-ink-soft")}
              onClick={() => setAberto(false)}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Atribuir({
  lead,
  horario,
  nomeDe,
  onAtribuir,
}: {
  lead: Lead;
  horario: HorarioAtendimento;
  nomeDe: (id: string) => string | undefined;
  onAtribuir: (dono: string) => Promise<void>;
}) {
  const corretores = useCorretores(true);
  const [dono, setDono] = useState(lead.dono_id);
  const [atribuido, setAtribuido] = useState<string | null>(null);
  return (
    <section className="card">
      <label className="field-label" htmlFor="atribuir">
        Atribuir a
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id="atribuir"
          className="input min-w-[200px] flex-1"
          value={dono}
          onChange={(e) => {
            setDono(e.target.value);
            setAtribuido(null);
          }}
        >
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-red focus-ring"
          disabled={dono === lead.dono_id}
          onClick={async () => {
            await onAtribuir(dono);
            setAtribuido(dono);
          }}
        >
          Atribuir
        </button>
      </div>
      {atribuido && atribuido === lead.dono_id && (
        <div className="mt-3 grid gap-2">
          <p className="aviso-ok">✓ Lead atribuído</p>
          <AvisarCorretor
            corretorId={atribuido}
            corretorNome={corretores.find((c) => c.id === atribuido)?.nome ?? nomeDe(atribuido) ?? "Corretor"}
            lead={lead}
            horario={horario}
          />
        </div>
      )}
    </section>
  );
}
