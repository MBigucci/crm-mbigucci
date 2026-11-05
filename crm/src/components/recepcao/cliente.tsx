"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";
import { novoId } from "@/lib/supabase";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/leads";
import { useCatalogo } from "@/lib/catalogo-dados";
import {
  antesDaVez,
  dataBr,
  nomeNaVez,
  textoConfirmar,
  TIPOS_CLIENTE,
  turnoAtual,
  type AchadoRetorno,
  type LinhaVez,
  type Midia,
  type Pessoa,
  type RespostaRegistro,
  type Stand,
  type TipoCliente,
} from "@/lib/recepcao";
import { entrarParceiro, filaParceiros, procurarRetorno, registrarCliente } from "@/lib/recepcao-dados";
import { BuscaPessoa } from "./busca-pessoa";

export type Registrado = { resposta: Extract<RespostaRegistro, { status: "ok" }>; corretorQueIndicou?: string };
export type FormularioCliente = { focarTipo: () => void; escolherTipo: (t: TipoCliente) => void };

type Pendente =
  | Extract<RespostaRegistro, { status: "confirmar" }>
  | Extract<RespostaRegistro, { status: "pergunta" }>
  | { status: "vez_mudou"; texto: string };

type Fila = { posicao: number; gerente_id: string; gerente_nome: string }[];

const vazio = { nome: "", whatsapp: "", email: "", acompanhante: "", empreendimento: "", observacao: "" };

/**
 * A linha de digitação da recepção, na ordem das colunas da planilha. Tab
 * avança, Enter registra. O banco decide a vez e devolve quem anunciar.
 */
export const RegistrarCliente = forwardRef<
  FormularioCliente,
  {
    stand: Stand;
    vez: LinhaVez[];
    pessoas: Pessoa[];
    midias: Midia[];
    agora: Date;
    tela: "pc" | "celular";
    onRegistrado: (r: Registrado) => void;
    onVezMudou: () => void;
    onCancelar?: () => void;
  }
>(function RegistrarCliente({ stand, vez, pessoas, midias, agora, tela, onRegistrado, onVezMudou, onCancelar }, ref) {
  const [tipo, setTipo] = useState<TipoCliente>("novo");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [campos, setCampos] = useState(vazio);
  const [sozinho, setSozinho] = useState(false);
  const [indicou, setIndicou] = useState<Pessoa | null>(null);
  const [atendeAntes, setAtendeAntes] = useState<Pessoa | null>(null);
  const [especialistaAntes, setEspecialistaAntes] = useState<Pessoa | null>(null);
  const [parceiro, setParceiro] = useState({ nome: "", empresa: "", whatsapp: "", creci: "" });
  const [procura, setProcura] = useState<"roleta" | "gerente">("roleta");
  const [procurado, setProcurado] = useState("");
  const [fila, setFila] = useState<Fila | null>(null);
  const [filaPos, setFilaPos] = useState(0);
  const [gerenteConfirmado, setGerenteConfirmado] = useState(false);
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<AchadoRetorno[] | null>(null);
  const [retorno, setRetorno] = useState<AchadoRetorno | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [respostas, setRespostas] = useState<{ corretor_no_stand?: boolean; gerente_no_stand?: boolean; confirmar: string[] }>({ confirmar: [] });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idAtendimento = useRef<string | null>(null);
  const parceiroId = useRef<string | null>(null);
  const idEntradaParceiro = useRef<string | null>(null);
  const tipoRef = useRef<HTMLDivElement>(null);
  const { catalogo } = useCatalogo();

  const antes = antesDaVez(agora) && tipo === "novo";
  const turno = turnoAtual(agora, vez);
  const daVezC = vez.find((l) => l.turno === turno && l.papel === "corretor" && l.da_vez) ?? null;
  const daVezE = stand.tem_especialista ? vez.find((l) => l.turno === turno && l.papel === "especialista" && l.da_vez) ?? null : null;
  const ativas = midias.filter((m) => m.ativo);
  const p = tela === "pc";

  useImperativeHandle(ref, () => ({
    focarTipo: () => tipoRef.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus(),
    escolherTipo: (t) => mudarTipo(t),
  }));

  // A fila dos gerentes para o parceiro: carregada quando o tipo é escolhido.
  useEffect(() => {
    if (tipo !== "indicacao_parceiro" || fila) return;
    filaParceiros().then((r) => (r.erro !== undefined ? setErro(r.erro) : setFila(r.ok)));
  }, [tipo, fila]);

  function mudarTipo(t: TipoCliente) {
    setTipo(t);
    setPendente(null);
    setRespostas({ confirmar: [] });
    setErro(null);
    idAtendimento.current = null;
  }

  function limpar() {
    setMarcadas([]);
    setCampos(vazio);
    setSozinho(false);
    setIndicou(null);
    setAtendeAntes(null);
    setEspecialistaAntes(null);
    setParceiro({ nome: "", empresa: "", whatsapp: "", creci: "" });
    setProcura("roleta");
    setProcurado("");
    setFila(null);
    setFilaPos(0);
    setGerenteConfirmado(false);
    setTermo("");
    setAchados(null);
    setRetorno(null);
    setPendente(null);
    setRespostas({ confirmar: [] });
    setErro(null);
    idAtendimento.current = null;
    parceiroId.current = null;
    idEntradaParceiro.current = null;
  }

  const muda = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCampos((c) => ({ ...c, [k]: e.target.value }));
    if (k === "whatsapp" || k === "nome") {
      setPendente(null);
      setRespostas((r) => ({ ...r, confirmar: [] }));
    }
  };
  const alternar = (slug: string) => setMarcadas((m) => (m.includes(slug) ? m.filter((x) => x !== slug) : [...m, slug]));

  async function buscarRetorno(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(null);
    const r = await procurarRetorno(termo);
    if (r.erro !== undefined) return setErro(r.erro);
    setAchados(r.ok);
  }

  async function registrar(e: React.FormEvent, extra?: Partial<typeof respostas>) {
    e.preventDefault();
    setErro(null);
    const resp = { ...respostas, ...extra, confirmar: [...respostas.confirmar, ...(extra?.confirmar ?? [])] };
    const numero = campos.whatsapp.trim() ? normalizarWhatsapp(campos.whatsapp) : null;
    const nome = tipo === "retorno" ? campos.nome.trim() || retorno?.primeiro_nome || "" : campos.nome.trim();
    if (tipo === "retorno" && !retorno) return setErro("Procure o cliente e escolha na lista.");
    if (!nome) return setErro("Digite o nome do cliente.");
    if (campos.whatsapp.trim() && !numero) return setErro("Confira o telefone: DDD e número, como (11) 98765-4321.");
    if (!sozinho && !campos.acompanhante.trim()) return setErro("Digite o nome do acompanhante ou marque Veio sozinho.");
    if (tipo !== "retorno" && !marcadas.length) return setErro("Marque como o cliente conheceu.");
    if (tipo === "novo" && antes && !atendeAntes) return setErro("Escolha quem atende antes da vez.");
    if (tipo === "novo" && !antes && !daVezC) return setErro("Ninguém na vez neste período. Ponha os corretores na vez.");
    if (tipo === "indicacao_corretor" && !indicou) return setErro("Escolha o corretor que indicou.");
    if (tipo === "indicacao_parceiro") {
      if (!parceiro.nome.trim()) return setErro("Digite o nome do corretor parceiro.");
      if (!parceiro.whatsapp.trim() && !parceiro.creci.trim()) return setErro("Digite o telefone ou o CRECI do parceiro.");
      if (procura === "gerente" && !procurado) return setErro("Escolha o gerente que o parceiro procura.");
      if (procura === "roleta" && fila?.length && !gerenteConfirmado) return setErro("Confirme se o gerente da roleta está no stand.");
    }

    setEnviando(true);
    // O parceiro entra uma vez só, mesmo que a recepção precise confirmar algo depois.
    if (tipo === "indicacao_parceiro" && !parceiroId.current) {
      idEntradaParceiro.current ??= novoId();
      const escolhido = procura === "roleta" && fila?.length && filaPos > 0 ? fila[filaPos]?.gerente_id : null;
      const r = await entrarParceiro({
        id: idEntradaParceiro.current,
        nome: parceiro.nome.trim(),
        empresa: parceiro.empresa.trim(),
        whatsapp: parceiro.whatsapp.trim(),
        creci: parceiro.creci.trim(),
        procurado: procura === "gerente" ? procurado : null,
        escolhido,
      });
      if (r.erro !== undefined) {
        setEnviando(false);
        return setErro(r.erro);
      }
      parceiroId.current = r.ok.parceiro_id;
    }

    idAtendimento.current ??= novoId();
    const r = await registrarCliente({
      id: idAtendimento.current,
      plantao_id: stand.id,
      tipo,
      midias: marcadas,
      nome,
      whatsapp: numero,
      email: campos.email.trim() || null,
      veio_sozinho: sozinho,
      acompanhante: sozinho ? null : campos.acompanhante.trim(),
      empreendimento: campos.empreendimento.trim() || null,
      observacao: campos.observacao.trim() || null,
      vez_corretor: daVezC?.presenca_id ?? null,
      vez_especialista: daVezE?.presenca_id ?? null,
      antes_da_vez: antes,
      corretor_id: tipo === "indicacao_corretor" ? indicou?.id : antes ? atendeAntes?.id : null,
      especialista_id: antes ? especialistaAntes?.id ?? null : null,
      parceiro_id: tipo === "indicacao_parceiro" ? parceiroId.current : null,
      retorno_atendimento: retorno?.ref_tipo === "atendimento" ? retorno.ref_id : null,
      retorno_lead: retorno?.ref_tipo === "lead" ? retorno.ref_id : null,
      ...(resp.corretor_no_stand !== undefined ? { corretor_no_stand: resp.corretor_no_stand } : {}),
      ...(resp.gerente_no_stand !== undefined ? { gerente_no_stand: resp.gerente_no_stand } : {}),
      confirmar: resp.confirmar,
    });
    setEnviando(false);
    if (r.erro !== undefined) return setErro(r.erro);
    const res = r.ok;
    setRespostas(resp);
    if (res.status === "ok") {
      onRegistrado({ resposta: res, corretorQueIndicou: indicou ? indicou.apelido ?? indicou.nome : undefined });
      limpar();
      setTipo("novo");
      return;
    }
    // Nada foi gravado: um id novo no próximo envio.
    idAtendimento.current = null;
    if (res.status === "vez_mudou") {
      onVezMudou();
      const quem = res.corretor ?? res.especialista;
      return setPendente({ status: "vez_mudou", texto: `! A vez mudou${quem ? `: agora é de ${quem}` : ""}. Confira e registre de novo.` });
    }
    setPendente(res);
  }

  const btnTipo = (t: (typeof TIPOS_CLIENTE)[number]) => (
    <button
      key={t.slug}
      type="button"
      role="radio"
      aria-checked={tipo === t.slug}
      tabIndex={tipo === t.slug ? 0 : -1}
      className={clsx(
        "focus-ring rounded-sm border px-3 py-2 text-[13px] font-semibold",
        tipo === t.slug ? "border-ink bg-ink text-surface" : "border-control bg-surface text-ink",
        !p && "py-3 text-[14px]",
      )}
      onClick={() => mudarTipo(t.slug)}
    >
      {p ? t.nome : t.curto}
      {p && <span className={clsx("ml-2 rounded-sm border px-1 text-[11px]", tipo === t.slug ? "border-surface/60" : "border-control text-ink-soft")}>{t.tecla}</span>}
    </button>
  );

  const fila0 = fila?.[filaPos];
  const lab = "field-label";
  const inp = "input md:py-[9px] md:text-[14px]";

  return (
    <form onSubmit={(e) => registrar(e)} noValidate className="grid gap-3">
      <div>
        <span className={lab} id="t-tipo">
          Tipo do cliente
        </span>
        <div
          ref={tipoRef}
          role="radiogroup"
          aria-labelledby="t-tipo"
          className={clsx("flex flex-wrap gap-2", !p && "grid grid-cols-2")}
          onKeyDown={(e) => {
            const t = TIPOS_CLIENTE.find((x) => x.tecla === e.key.toUpperCase());
            const i = TIPOS_CLIENTE.findIndex((x) => x.slug === tipo);
            if (t) mudarTipo(t.slug);
            else if (e.key === "ArrowRight" || e.key === "ArrowDown") mudarTipo(TIPOS_CLIENTE[(i + 1) % 4].slug);
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") mudarTipo(TIPOS_CLIENTE[(i + 3) % 4].slug);
            else return;
            e.preventDefault();
            requestAnimationFrame(() => tipoRef.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus());
          }}
        >
          {TIPOS_CLIENTE.map(btnTipo)}
        </div>
      </div>

      {tipo === "retorno" && (
        <div className="grid gap-2">
          <label className={lab} htmlFor="busca-retorno">
            Procurar cliente · telefone, ou o nome
          </label>
          <div className="flex gap-2">
            <input
              id="busca-retorno"
              className={inp}
              value={termo}
              autoComplete="off"
              placeholder="(11) 98765-4321 ou o nome"
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarRetorno(e);
              }}
            />
            <button type="button" className="btn btn-ghost focus-ring shrink-0" onClick={() => buscarRetorno()}>
              Procurar
            </button>
          </div>
          {achados && !achados.length && (
            <p className="text-[13px] text-ink-soft">Ninguém encontrado. Confira o telefone ou troque o tipo para Novo ou uma das indicações.</p>
          )}
          {achados && achados.length > 0 && !retorno && (
            <ul className="rounded-sm border border-control bg-surface">
              {achados.map((a) => (
                <li key={a.ref_id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    className="focus-ring grid w-full gap-1 px-3 py-2 text-left text-[13px] md:grid-cols-[1fr_1.4fr_1.4fr] md:items-center md:gap-3"
                    onClick={() => {
                      setRetorno(a);
                      setCampos((c) => ({ ...c, nome: c.nome || a.primeiro_nome }));
                    }}
                  >
                    <span>
                      <b>{a.primeiro_nome}</b>
                      {a.final_telefone && <span className="num block text-[12px] text-concrete">final {a.final_telefone}</span>}
                    </span>
                    <span>{a.vinculo}</span>
                    <span className="text-ink-soft">
                      {a.ultimo_em ? (
                        <>
                          Último: <span className="num">{dataBr(a.ultimo_em)}</span>
                          <span className="block text-[12px] text-concrete">
                            {[a.ultimo_stand, a.ultimo_especialista && `esp. ${a.ultimo_especialista}`].filter(Boolean).join(" · ")}
                          </span>
                        </>
                      ) : (
                        "Na carteira, sem atendimento no stand"
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {retorno && (
            <div className="rounded-sm border border-control bg-surface px-3 py-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <b>{retorno.primeiro_nome}</b> · {retorno.vinculo}
                </span>
                <button type="button" className="focus-ring text-[13px] font-semibold text-brand-dark underline" onClick={() => setRetorno(null)}>
                  Trocar
                </button>
              </div>
              {stand.tem_especialista && (
                <p className="mt-1 text-ink-soft">
                  Especialista do último atendimento: <b>{retorno.ultimo_especialista ?? "–"}</b> · último da vez:{" "}
                  <b>{daVezE ? nomeNaVez(daVezE) : "–"}</b>
                  <span className="block text-[12px] text-concrete">Se o do último atendimento não puder, apresente o da vez. A cortesia não é registrada.</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <fieldset>
        <legend className={lab}>Como conheceu · marque um ou mais{tipo === "retorno" ? " (opcional)" : ""}</legend>
        <div className={clsx("flex flex-wrap gap-2", !p && "grid grid-cols-2")}>
          {ativas.map((m) => (
            <button
              key={m.slug}
              type="button"
              aria-pressed={marcadas.includes(m.slug)}
              className={clsx(
                "focus-ring rounded-sm border px-3 py-[7px] text-left text-[13px] font-semibold",
                marcadas.includes(m.slug) ? "border-ink bg-ink text-surface" : "border-control bg-surface text-ink",
                !p && "py-[10px] text-[14px]",
              )}
              onClick={() => alternar(m.slug)}
            >
              {marcadas.includes(m.slug) ? "✓ " : ""}
              {m.nome}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={clsx("grid gap-3", p && "md:grid-cols-[1.3fr_1fr_1fr]")}>
        <div>
          <label className={lab} htmlFor="c-nome">
            Cliente
          </label>
          <input id="c-nome" className={inp} autoComplete="off" value={campos.nome} onChange={muda("nome")} />
        </div>
        <div>
          <label className={lab} htmlFor="c-tel">
            Telefone
          </label>
          <input
            id="c-tel"
            className={clsx(inp, "num")}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(11) 98765-4321"
            value={campos.whatsapp}
            onChange={muda("whatsapp")}
            onBlur={() => {
              const n = normalizarWhatsapp(campos.whatsapp);
              if (n) setCampos((c) => ({ ...c, whatsapp: formatarWhatsapp(n) }));
            }}
          />
        </div>
        <div>
          <label className={lab} htmlFor="c-email">
            E-mail · opcional
          </label>
          <input id="c-email" className={inp} type="email" autoComplete="off" value={campos.email} onChange={muda("email")} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label className={lab} htmlFor="c-acomp">
            Acompanhante · nome, ou marque Veio sozinho
          </label>
          <input
            id="c-acomp"
            className={inp}
            autoComplete="off"
            disabled={sozinho}
            placeholder={sozinho ? "Veio sozinho" : "Nomes separados por vírgula"}
            value={sozinho ? "" : campos.acompanhante}
            onChange={muda("acompanhante")}
          />
        </div>
        <button
          type="button"
          aria-pressed={sozinho}
          className={clsx(
            "focus-ring rounded-sm border px-3 py-[9px] text-[13px] font-semibold",
            sozinho ? "border-ink bg-ink text-surface" : "border-control bg-surface text-ink",
            !p && "py-3",
          )}
          onClick={() => setSozinho((s) => !s)}
        >
          {sozinho ? "✓ " : ""}Veio sozinho
        </button>
      </div>

      {/* Quem atende: muda com o tipo. */}
      {tipo === "novo" && (
        <div className={clsx("grid gap-3", p && "md:grid-cols-2")}>
          {antes ? (
            <>
              <div className="md:col-span-2">
                <p className="text-[13px] font-semibold text-wa">! Antes da vez: a vez da manhã abre às 8h45. Escolha quem atende; a vez não gira.</p>
              </div>
              <BuscaPessoa id="c-antes" rotulo="Quem atende" pessoas={pessoas} papel="corretor" escolhido={atendeAntes} onEscolher={setAtendeAntes} />
              {stand.tem_especialista && (
                <BuscaPessoa
                  id="c-antes-esp"
                  rotulo="Especialista · opcional"
                  pessoas={pessoas}
                  papel="especialista"
                  placeholder="Nome, se houver"
                  escolhido={especialistaAntes}
                  onEscolher={setEspecialistaAntes}
                />
              )}
            </>
          ) : (
            <>
              <DaVez rotulo="Corretor(a)" linha={daVezC} vazio="! Ninguém na vez" />
              {stand.tem_especialista && <DaVez rotulo="Especialista" linha={daVezE} vazio="– Ninguém na vez" />}
            </>
          )}
        </div>
      )}
      {tipo === "indicacao_corretor" && (
        <div className={clsx("grid gap-3", p && "md:grid-cols-2")}>
          <BuscaPessoa id="c-indicou" rotulo="Corretor(a) que indicou" pessoas={pessoas} papel="corretor" escolhido={indicou} onEscolher={setIndicou} />
          {stand.tem_especialista && <DaVez rotulo="Especialista" linha={daVezE} vazio="– Ninguém na vez" />}
        </div>
      )}
      {tipo === "indicacao_parceiro" && (
        <div className="grid gap-3">
          <div className={clsx("grid gap-3", p && "md:grid-cols-2")}>
            <div>
              <label className={lab} htmlFor="p-nome">
                Corretor(a) parceiro
              </label>
              <input id="p-nome" className={inp} autoComplete="off" value={parceiro.nome} onChange={(e) => setParceiro((x) => ({ ...x, nome: e.target.value }))} />
            </div>
            <div>
              <label className={lab} htmlFor="p-emp">
                Imobiliária ou autônomo
              </label>
              <input id="p-emp" className={inp} autoComplete="off" value={parceiro.empresa} onChange={(e) => setParceiro((x) => ({ ...x, empresa: e.target.value }))} />
            </div>
            <div>
              <label className={lab} htmlFor="p-tel">
                Telefone do parceiro
              </label>
              <input
                id="p-tel"
                className={clsx(inp, "num")}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={parceiro.whatsapp}
                onChange={(e) => setParceiro((x) => ({ ...x, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <label className={lab} htmlFor="p-creci">
                CRECI · se não tiver o telefone
              </label>
              <input id="p-creci" className={inp} autoComplete="off" value={parceiro.creci} onChange={(e) => setParceiro((x) => ({ ...x, creci: e.target.value }))} />
            </div>
          </div>
          <fieldset>
            <legend className={lab}>Procura algum gerente?</legend>
            <div className="flex flex-wrap gap-2">
              {(["roleta", "gerente"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={procura === m}
                  className={clsx(
                    "focus-ring rounded-sm border px-3 py-[7px] text-[13px] font-semibold",
                    procura === m ? "border-ink bg-ink text-surface" : "border-control bg-surface text-ink",
                  )}
                  onClick={() => setProcura(m)}
                >
                  {m === "roleta" ? "Não, usar a roleta" : "Sim, escolher o gerente"}
                </button>
              ))}
            </div>
          </fieldset>
          {procura === "gerente" ? (
            <div>
              <label className={lab} htmlFor="p-gerente">
                Gerente procurado
              </label>
              <select id="p-gerente" className={inp} value={procurado} onChange={(e) => setProcurado(e.target.value)}>
                <option value="">Escolha</option>
                {(fila ?? []).map((g) => (
                  <option key={g.gerente_id} value={g.gerente_id}>
                    {g.gerente_nome}
                  </option>
                ))}
              </select>
            </div>
          ) : fila && fila.length ? (
            <div className="rounded-sm border border-control bg-tint-brand px-3 py-2 text-[13px]">
              {fila0 ? (
                gerenteConfirmado ? (
                  <p>
                    ✓ Gerente <b>{fila0.gerente_nome}</b> está no stand.{" "}
                    <button type="button" className="focus-ring font-semibold text-brand-dark underline" onClick={() => setGerenteConfirmado(false)}>
                      Mudar
                    </button>
                  </p>
                ) : (
                  <>
                    <p>
                      {filaPos === 0 ? "A roleta de parceiros indica" : "Próximo da roleta:"} o gerente <b>{fila0.gerente_nome}</b>. Pergunte: ele está no stand?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-ghost focus-ring px-3 py-[6px]" onClick={() => setGerenteConfirmado(true)}>
                        Sim, fica com {fila0.gerente_nome.split(" ")[0]}
                      </button>
                      <button type="button" className="btn btn-ghost focus-ring px-3 py-[6px]" onClick={() => setFilaPos((i) => i + 1)}>
                        Não está, passar ao próximo
                      </button>
                    </div>
                    {filaPos > 0 && <p className="mt-1 text-[12px] text-concrete">Quem foi pulado não perde a vez.</p>}
                  </>
                )
              ) : (
                <p>
                  ! Nenhum gerente da fila está no stand.{" "}
                  <button type="button" className="focus-ring font-semibold text-brand-dark underline" onClick={() => setFilaPos(0)}>
                    Recomeçar a fila
                  </button>
                </p>
              )}
              <p className="mt-1 text-[12px] text-concrete">Se o parceiro já for cadastrado, ele fica com o gerente dele.</p>
            </div>
          ) : null}
          {stand.tem_especialista && <DaVez rotulo="Especialista" linha={daVezE} vazio="– Ninguém na vez" />}
        </div>
      )}

      <div className={clsx("grid gap-3", p && "md:grid-cols-[1fr_1.6fr]")}>
        <div>
          <label className={lab} htmlFor="c-emp">
            Empreendimento · opcional
          </label>
          <input id="c-emp" className={inp} list="lista-emp" autoComplete="off" value={campos.empreendimento} onChange={muda("empreendimento")} />
          <datalist id="lista-emp">
            {(catalogo ?? []).filter((x) => x.ativo !== false).map((x) => (
              <option key={x.id} value={x.nome} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={lab} htmlFor="c-obs">
            Observação · opcional
          </label>
          <input id="c-obs" className={inp} autoComplete="off" maxLength={500} value={campos.observacao} onChange={muda("observacao")} />
        </div>
      </div>

      {pendente && <Pergunta pendente={pendente} onResponder={(extra, ev) => registrar(ev, extra)} onRetorno={() => mudarTipo("retorno")} onFechar={() => setPendente(null)} />}
      {erro && (
        <p role="alert" className="aviso-erro">
          ✕ {erro}
        </p>
      )}

      <div className={clsx("flex items-center gap-3", p ? "justify-between" : "sticky bottom-0 -mx-4 border-t border-line bg-paper px-4 py-3")}>
        {p && (
          <span className="text-[12px] text-concrete">
            {tipo === "novo" && !antes ? "O lead vai para a carteira do corretor da vez, com próximo contato amanhã às 10h." : "Tab avança · Enter registra"}
          </span>
        )}
        {onCancelar && (
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className={clsx("btn btn-red focus-ring", !p && "btn-lg flex-1")} disabled={enviando}>
          {enviando ? "Registrando…" : tipo === "retorno" ? "Registrar retorno" : "Registrar cliente"}
        </button>
      </div>
    </form>
  );
});

function DaVez({ rotulo, linha, vazio }: { rotulo: string; linha: LinhaVez | null; vazio: string }) {
  return (
    <div>
      <span className="field-label">{rotulo} · da vez</span>
      <div className="flex items-center justify-between gap-2 rounded-sm border border-control bg-surface px-3 py-[9px]">
        {linha ? <b>{nomeNaVez(linha)}</b> : <span className="font-semibold text-wa">{vazio}</span>}
        {linha && <span className="text-[12px] font-semibold text-ok">→ da vez</span>}
      </div>
    </div>
  );
}

/** O que o banco pediu antes de gravar: uma confirmação ou uma pergunta. */
function Pergunta({
  pendente,
  onResponder,
  onRetorno,
  onFechar,
}: {
  pendente: Pendente;
  onResponder: (extra: { corretor_no_stand?: boolean; gerente_no_stand?: boolean; confirmar?: string[] }, e: React.FormEvent) => void;
  onRetorno: () => void;
  onFechar: () => void;
}) {
  const btn = "btn btn-ghost focus-ring";
  let texto: React.ReactNode;
  let botoes: React.ReactNode;
  if (pendente.status === "vez_mudou") {
    texto = pendente.texto;
    botoes = (
      <button type="button" className={btn} onClick={onFechar}>
        Entendi
      </button>
    );
  } else if (pendente.status === "confirmar") {
    texto = textoConfirmar(pendente);
    botoes = (
      <>
        {pendente.aviso === "outra_carteira" && (
          <button type="button" className={btn} onClick={onRetorno}>
            Trocar para Retorno
          </button>
        )}
        <button type="button" className={btn} onClick={(e) => onResponder({ confirmar: [pendente.aviso] }, e)}>
          Registrar mesmo assim
        </button>
      </>
    );
  } else if (pendente.pergunta === "corretor_no_stand") {
    texto = (
      <>
        ! {pendente.corretor} não está na vez. Pergunte: {pendente.corretor} está no stand?
      </>
    );
    botoes = (
      <>
        <button type="button" className={btn} onClick={(e) => onResponder({ corretor_no_stand: true }, e)}>
          Sim, está
        </button>
        <button type="button" className={btn} onClick={(e) => onResponder({ corretor_no_stand: false }, e)}>
          Não está
        </button>
      </>
    );
  } else {
    texto = (
      <>
        ! {pendente.corretor} não está no stand. Pergunte: o gerente {pendente.gerente ?? "da equipe"} está no stand?
      </>
    );
    botoes = (
      <>
        <button type="button" className={btn} onClick={(e) => onResponder({ gerente_no_stand: true }, e)}>
          Sim, anunciar o gerente
        </button>
        <button type="button" className={btn} onClick={(e) => onResponder({ gerente_no_stand: false }, e)}>
          Não está
        </button>
      </>
    );
  }
  return (
    <div className="card bg-tint-brand" role="alert">
      <p className="font-semibold text-wa">{texto}</p>
      <div className="mt-2 flex flex-wrap gap-2">{botoes}</div>
    </div>
  );
}
