"use client";

import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { diaCurto, diaDaSemana, diaLongo, SeloStatus } from "@/components/programa/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import { diaIso } from "@/lib/vendas";
import { useNomes } from "@/lib/vendas-dados";
import { periodoDoDia, roletaDaSemana, ROLETA, segundaDaSemana, somarDias, TURNOS, type Lancamento, type Turno } from "@/lib/programa";
import { lancar, mudarStatus, useCorretoresPlantao, useLancamentos, type CorretorPlantao } from "@/lib/programa-dados";

/**
 * Plantão do dia, no celular ou no tablet da recepção: os períodos de cada
 * corretor, a saída para visita com a foto e a roleta da semana. Quem tem
 * lancamentos.registrar (o gerente) também lança os vídeos aqui.
 */
export default function PlantaoPage() {
  return (
    <Casca titulo="Plantão" programa>
      <Plantao />
    </Casca>
  );
}

type Desfazer = { texto: string; id: string; para: "cancelado" | "pendente" };

function Plantao() {
  const { pode } = useSessao();
  const eu = usePerfil();
  const hoje = diaIso(new Date());
  const [dia, setDia] = useState(hoje);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<Desfazer | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const segunda = segundaDaSemana(dia);
  const { corretores, erro: erroCorretores } = useCorretoresPlantao();
  const { lancamentos, erro: erroLanc, recarregar } = useLancamentos(segunda, somarDias(segunda, 7));
  const fimAviso = useCallback(() => setAviso(null), []);

  if (!pode("plantao.registrar") && !pode("lancamentos.registrar"))
    return (
      <div className="card max-w-[520px]">
        <p>! Seu perfil não tem acesso a esta página.</p>
      </div>
    );
  if (erroCorretores || erroLanc) return <p className="aviso-erro">! {erroCorretores ?? erroLanc}</p>;
  if (!corretores || !lancamentos) return <p className="text-concrete">Carregando…</p>;

  const termo = busca.trim().toLowerCase();
  const lista = termo ? corretores.filter((c) => c.nome.toLowerCase().includes(termo)) : corretores;

  async function marcar(c: CorretorPlantao, turno: Turno, comprovante?: string) {
    setErro(null);
    const r = await lancar({ corretor_id: c.id, criterio: "periodo", data: dia, periodo: turno, saida_visita: !!comprovante, comprovante: comprovante ?? null });
    if (r.erro) return setErro(r.erro);
    recarregar();
    const nomeTurno = TURNOS.find((t) => t.slug === turno)!.nome.toLowerCase();
    if (r.id) setAviso({ texto: comprovante ? `Saída de ${c.nome} registrada (${nomeTurno})` : `${c.nome}: ${nomeTurno} marcada`, id: r.id, para: "cancelado" });
  }
  async function cancelar(l: Lancamento, nome: string) {
    setErro(null);
    const e = await mudarStatus([l.id], "cancelado");
    if (e) return setErro(e);
    recarregar();
    setAviso({ texto: `Período de ${nome} desmarcado`, id: l.id, para: "pendente" });
  }
  async function desfazer() {
    if (!aviso) return;
    const e = await mudarStatus([aviso.id], aviso.para);
    setAviso(null);
    if (e) setErro(e);
    recarregar();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:flex md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Dia anterior" onClick={() => setDia(somarDias(dia, -1))}>
            ←
          </button>
          <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
            {dia === hoje ? "Hoje" : diaDaSemana(dia)}, {diaLongo(dia)}
          </p>
          <button
            type="button"
            className="btn btn-ghost focus-ring px-3 text-[15px]"
            aria-label="Dia seguinte"
            disabled={dia >= hoje}
            onClick={() => setDia(somarDias(dia, 1))}
          >
            →
          </button>
        </div>
        <div className="md:w-[280px]">
          <label className="field-label" htmlFor="busca-corretor">
            Buscar corretor
          </label>
          <input id="busca-corretor" className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome" />
        </div>
      </div>

      {erro && <p className="aviso-erro">! {erro}</p>}

      <section aria-labelledby="t-periodos" className="grid gap-3">
        <h2 id="t-periodos" className="eyebrow">
          Períodos do dia · manhã 9h–14h · tarde 14h–19h
        </h2>
        {!lista.length && (
          <div className="card">
            <p className="text-ink-soft">{corretores.length ? "Nenhum corretor com esse nome." : "Nenhum corretor ativo."}</p>
          </div>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((c) => (
            <li key={c.id}>
              <CartaoCorretor
                corretor={c}
                dia={dia}
                lancamentos={lancamentos}
                eu={eu.id}
                onMarcar={(t, foto) => marcar(c, t, foto)}
                onCancelar={(l) => cancelar(l, c.nome)}
              />
            </li>
          ))}
        </ul>
      </section>

      <Roleta corretores={corretores} lancamentos={lancamentos} segunda={segunda} />

      {pode("lancamentos.registrar") && <LancarVideo corretores={corretores} hoje={hoje} />}

      {aviso && <AvisoDesfazer texto={aviso.texto} onDesfazer={desfazer} onFim={fimAviso} />}
    </div>
  );
}

function CartaoCorretor({
  corretor,
  dia,
  lancamentos,
  eu,
  onMarcar,
  onCancelar,
}: {
  corretor: CorretorPlantao;
  dia: string;
  lancamentos: Lancamento[];
  eu: string;
  onMarcar: (turno: Turno, foto?: string) => void;
  onCancelar: (l: Lancamento) => void;
}) {
  const [saida, setSaida] = useState<Turno | null>(null);
  const [foto, setFoto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function registrarSaida() {
    const link = foto.trim();
    if (!/^https?:\/\/\S+$/i.test(link)) return setErro("Cole o link da foto, que começa com https://.");
    setErro(null);
    onMarcar(saida!, link);
    setSaida(null);
    setFoto("");
  }

  return (
    <div className="card grid gap-3">
      <div>
        <p className="titulo-card">{corretor.nome}</p>
        {corretor.equipe && <p className="text-[13px] text-ink-soft">{corretor.equipe}</p>}
      </div>
      {TURNOS.map((t) => {
        const l = periodoDoDia(lancamentos, corretor.id, dia, t.slug);
        const vale = l && (l.status === "pendente" || l.status === "aprovado");
        return (
          <div key={t.slug} className="grid gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {t.nome} <span className="num font-normal text-ink-soft">{t.horario}</span>
              </p>
              {l && l.status !== "cancelado" && <SeloStatus status={l.status} />}
            </div>
            {l?.saida_visita && vale && (
              <p className="text-[13px] text-ink-soft">
                Saída para visita ·{" "}
                <a className="link-acao focus-ring" href={l.comprovante ?? "#"} target="_blank" rel="noreferrer">
                  Ver foto
                </a>
              </p>
            )}
            {l?.status === "recusado" && l.motivo_recusa && <p className="text-[13px] text-ink-soft">Motivo: {l.motivo_recusa}</p>}
            {vale ? (
              l.status === "pendente" &&
              l.lancado_por === eu && (
                <button type="button" className="link-acao focus-ring justify-self-start text-[13px]" onClick={() => onCancelar(l)}>
                  Desmarcar
                </button>
              )
            ) : saida === t.slug ? (
              <div className="grid gap-2">
                <label className="field-label" htmlFor={`foto-${corretor.id}-${t.slug}`}>
                  Link da foto da saída
                </label>
                <input
                  id={`foto-${corretor.id}-${t.slug}`}
                  className="input"
                  inputMode="url"
                  placeholder="https://"
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={registrarSaida}>
                    Registrar saída
                  </button>
                  <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => (setSaida(null), setErro(null))}>
                    Cancelar
                  </button>
                </div>
                {erro && <p className="aviso-erro">! {erro}</p>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={() => onMarcar(t.slug)}>
                  ✓ Cumpriu o período
                </button>
                <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => setSaida(t.slug)}>
                  Saiu para visita
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Quem tem 6 períodos aprovados de segunda a sexta entra na roleta do fim de semana. */
function Roleta({ corretores, lancamentos, segunda }: { corretores: CorretorPlantao[]; lancamentos: Lancamento[]; segunda: string }) {
  const linhas = useMemo(
    () =>
      roletaDaSemana(corretores.map((c) => c.id), lancamentos, segunda).sort(
        (a, b) => Number(b.apto) - Number(a.apto) || b.aprovados - a.aprovados,
      ),
    [corretores, lancamentos, segunda],
  );
  const nome = new Map(corretores.map((c) => [c.id, c.nome]));
  const aptos = linhas.filter((l) => l.apto).length;
  return (
    <section aria-labelledby="t-roleta" className="grid gap-3">
      <h2 id="t-roleta" className="eyebrow">
        Roleta do fim de semana · semana de {diaCurto(segunda)} a {diaCurto(somarDias(segunda, ROLETA.dias - 1))}
      </h2>
      <div className="card bar-brand grid gap-3">
        <p>
          <span className="num font-display text-[22px] font-bold">{aptos}</span> de {linhas.length} aptos. Entra quem tem {ROLETA.periodos} períodos
          aprovados de segunda a sexta. Quem não tem pode ir ao plantão com visita agendada, fora da roleta.
        </p>
        <ul className="grid gap-2">
          {linhas.map((l) => (
            <li key={l.corretor} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <span>{nome.get(l.corretor)}</span>
              <span className={clsx("num text-[14px]", l.apto ? "font-semibold text-ok" : "text-ink-soft")}>
                {l.apto ? "✓ Apto" : `– Faltam ${l.faltam}`} · {l.aprovados} de {ROLETA.periodos}
                {l.pendentes > 0 && ` · ${l.pendentes} pendente${l.pendentes > 1 ? "s" : ""}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Vídeos com a marca: quem tem lancamentos.registrar lança para os corretores que vê. */
function LancarVideo({ corretores, hoje }: { corretores: CorretorPlantao[]; hoje: string }) {
  const eu = usePerfil();
  const [corretor, setCorretor] = useState("");
  const [data, setData] = useState(hoje);
  const [qtd, setQtd] = useState("1");
  const [link, setLink] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Desfazer | null>(null);
  const ini = somarDias(hoje, -30);
  const { lancamentos, recarregar } = useLancamentos(ini, somarDias(hoje, 1), { criterio: "video" });
  const meus = (lancamentos ?? []).filter((l) => l.lancado_por === eu.id).reverse();
  const nomes = useNomes(meus.map((l) => l.corretor_id));
  const fimAviso = useCallback(() => setAviso(null), []);

  async function salvar() {
    const n = Number(qtd);
    if (!corretor) return setErro("Escolha o corretor.");
    if (!Number.isInteger(n) || n < 1 || n > 100) return setErro("Confira a quantidade: de 1 a 100.");
    if (link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) return setErro("O link precisa começar com https://.");
    setErro(null);
    const r = await lancar({ corretor_id: corretor, criterio: "video", data, quantidade: n, comprovante: link.trim() || null });
    if (r.erro) return setErro(r.erro);
    setLink("");
    setQtd("1");
    recarregar();
    if (r.id) setAviso({ texto: "Vídeo lançado para aprovação", id: r.id, para: "cancelado" });
  }
  async function mudar(id: string, para: "cancelado" | "pendente") {
    const e = await mudarStatus([id], para);
    setAviso(null);
    if (e) setErro(e);
    recarregar();
  }

  return (
    <section aria-labelledby="t-video" className="grid gap-3">
      <h2 id="t-video" className="eyebrow">
        Vídeos com a marca
      </h2>
      <div className="card grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="video-corretor">
              Corretor
            </label>
            <select id="video-corretor" className="input" value={corretor} onChange={(e) => setCorretor(e.target.value)}>
              <option value="">Escolha</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div>
              <label className="field-label" htmlFor="video-data">
                Data
              </label>
              <input id="video-data" type="date" className="input num" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="video-qtd">
                Vídeos
              </label>
              <input id="video-qtd" className="input num" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="video-link">
            Link do vídeo (opcional)
          </label>
          <input id="video-link" className="input" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <button type="button" className="btn btn-red btn-lg focus-ring justify-self-start" onClick={salvar}>
          Lançar vídeo
        </button>
        {erro && <p className="aviso-erro">! {erro}</p>}
      </div>
      {meus.length > 0 && (
        <div className="card grid gap-2">
          <p className="eyebrow">Lançados por você nos últimos 30 dias</p>
          <ul className="grid gap-2">
            {meus.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[14px]">
                <span>
                  {nomes.get(l.corretor_id) ?? "Corretor"} · <span className="num">{diaCurto(l.data)}</span> · <span className="num">{l.quantidade}</span>{" "}
                  vídeo{l.quantidade > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-3">
                  <SeloStatus status={l.status} />
                  {l.status === "pendente" && (
                    <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => mudar(l.id, "cancelado")}>
                      Cancelar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {aviso && <AvisoDesfazer texto={aviso.texto} onDesfazer={() => mudar(aviso.id, aviso.para)} onFim={fimAviso} />}
    </section>
  );
}
