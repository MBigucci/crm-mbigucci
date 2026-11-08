"use client";

import { useCallback, useMemo, useState } from "react";
import { Selo } from "@/components/alicerce/selo";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Tabela } from "@/components/alicerce/tabela";
import { AreaStand, FalhaStand, useStandFiltros } from "@/components/recepcao/area-stand";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { diaCurto, diaDaSemana } from "@/components/programa/partes";
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
    <Casca migrada titulo="Períodos e roleta">
      <AreaStand titulo="Períodos e roleta"><Plantao /></AreaStand>
    </Casca>
  );
}

type Desfazer = { texto: string; id: string; para: "cancelado" | "pendente" };

function Plantao() {
  const { pode } = useSessao();
  const eu = usePerfil();
  const hoje = diaIso(new Date());
  const [filtros, alterarFiltros] = useStandFiltros({ d: hoje, busca: "" });
  const candidato = new Date(filtros.d + "T12:00:00");
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(filtros.d) && Number.isFinite(candidato.getTime()) && diaIso(candidato) === filtros.d && filtros.d <= hoje ? filtros.d : hoje;
  const busca = filtros.busca;
  const setDia = (d: string) => alterarFiltros({ d });
  const setBusca = (busca: string) => alterarFiltros({ busca });
  const [aviso, setAviso] = useState<Desfazer | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const segunda = segundaDaSemana(dia);
  const { corretores, erro: erroCorretores } = useCorretoresPlantao();
  const { lancamentos, erro: erroLanc, recarregar } = useLancamentos(segunda, somarDias(segunda, 7));
  const fimAviso = useCallback(() => setAviso(null), []);

  if (!pode("plantao.registrar") && !pode("lancamentos.registrar"))
    return (
      <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." />
    );
  if (erroCorretores || erroLanc) return <FalhaStand texto={erroCorretores ?? erroLanc} />;
  if (!corretores || !lancamentos) return <CarregandoTabela texto="Carregando…" />;

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
      <nav className="mb-periodo" aria-label="Dia dos períodos">
        <button className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => setDia(somarDias(dia, -1))}>← Anterior</button>
        <span className="mb-periodo__rotulo" aria-live="polite">{diaDaSemana(dia).replace(/^./, c => c.toUpperCase())}, {dia.split('-').reverse().join('/')}</span>
        <button className="mb-botao mb-botao--secundario mb-botao--p" disabled={dia >= hoje} onClick={() => setDia(somarDias(dia, 1))}>Seguinte →</button>
        {dia !== hoje && <button className="mb-botao mb-botao--discreto mb-periodo__hoje" onClick={() => setDia(hoje)}>Voltar para hoje</button>}
      </nav>
      <div className="stand-pilha"><p className="mb-escopo">{pode("plantao.registrar") || pode("dados.ver_todos") ? "Todos os corretores autorizados" : "Sua equipe"}</p>
        <form className="mb-filtros" role="search" onSubmit={e => e.preventDefault()}><label className="mb-campo mb-filtros__busca"><span className="mb-campo__rotulo">Buscar corretor</span><input className="mb-campo__entrada" placeholder="Nome do corretor" value={busca} onChange={e => setBusca(e.target.value)} /></label></form>
        <div className="mb-filtros__ativos">{lista.length} {lista.length === 1 ? "corretor" : "corretores"}{busca.trim() && <button className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => setBusca("")}>Limpar busca</button>}</div>
      </div>
      {erro && <Aviso tom="erro" titulo={erro} />}

      <section aria-labelledby="t-periodos" className="grid gap-3">
        <h2 id="t-periodos" className="mb-sobrelinha">
          Períodos do dia · manhã 9h–14h · tarde 14h–19h
        </h2>
        {!lista.length && (
          <EstadoVazio titulo={corretores.length ? "Nenhum corretor com esse nome" : "Nenhum corretor ativo"} texto={corretores.length ? "Troque a busca ou limpe os filtros." : "Os corretores ativos aparecem aqui."} />
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
    <div className="mb-cartao stand-cartao grid gap-3">
      <div>
        <p className="mb-cartao__titulo">{corretor.nome}</p>
        {corretor.equipe && <p className="stand-nota">{corretor.equipe}</p>}
      </div>
      {TURNOS.map((t) => {
        const l = periodoDoDia(lancamentos, corretor.id, dia, t.slug);
        const vale = l && (l.status === "pendente" || l.status === "aprovado");
        return (
          <div key={t.slug} className="grid gap-2 stand-divisor pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {t.nome} <span className="stand-num font-normal stand-nota">{t.horario}</span>
              </p>
              {l && l.status !== "cancelado" && <SeloStatus status={l.status} />}
            </div>
            {l?.saida_visita && vale && (
              <p className="stand-nota">
                Saída para visita ·{" "}
                <a className="mb-botao mb-botao--discreto" href={l.comprovante ?? "#"} target="_blank" rel="noreferrer">
                  Ver foto
                </a>
              </p>
            )}
            {l?.status === "recusado" && l.motivo_recusa && <p className="stand-nota">Motivo: {l.motivo_recusa}</p>}
            {vale ? (
              l.status === "pendente" &&
              l.lancado_por === eu && (
                <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => onCancelar(l)}>
                  Desmarcar
                </button>
              )
            ) : saida === t.slug ? (
              <div className="grid gap-2">
                <label className="mb-campo__rotulo" htmlFor={`foto-${corretor.id}-${t.slug}`}>
                  Link da foto da saída
                </label>
                <input
                  id={`foto-${corretor.id}-${t.slug}`}
                  className="mb-campo__entrada"
                  inputMode="url"
                  placeholder="https://"
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" className="mb-botao mb-botao--secundario" onClick={registrarSaida}>
                    Registrar saída
                  </button>
                  <button type="button" className="mb-botao mb-botao--discreto" onClick={() => (setSaida(null), setErro(null))}>
                    Cancelar
                  </button>
                </div>
                {erro && <Aviso tom="erro" titulo={erro} />}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" className="mb-botao mb-botao--secundario" onClick={() => onMarcar(t.slug)}>
                  ✓ Cumpriu o período
                </button>
                <button type="button" className="mb-botao mb-botao--discreto" onClick={() => setSaida(t.slug)}>
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
      <h2 id="t-roleta" className="mb-sobrelinha">
        Roleta do fim de semana · semana de {diaCurto(segunda)} a {diaCurto(somarDias(segunda, ROLETA.dias - 1))}
      </h2>
      <div className="mb-cartao stand-cartao grid gap-3">
        <p>
          <span className="stand-num stand-nota font-bold">{aptos}</span> de {linhas.length} aptos. Entra quem tem {ROLETA.periodos} períodos
          aprovados de segunda a sexta. Quem não tem pode ir ao plantão com visita agendada, fora da roleta.
        </p>
        <Tabela tipo="numeros"><thead><tr><th>Corretor</th><th className="mb-tabela__num">Aprovados</th><th className="mb-tabela__num">Pendentes</th><th>Roleta</th></tr></thead><tbody>{linhas.map(l => <tr key={l.corretor}><td>{nome.get(l.corretor)}</td><td className="mb-tabela__num">{l.aprovados} de {ROLETA.periodos}</td><td className="mb-tabela__num">{l.pendentes}</td><td><Selo tom={l.apto ? "sucesso" : "alerta"}>{l.apto ? "Apto" : "Faltam " + l.faltam}</Selo></td></tr>)}</tbody></Tabela>

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
    if (!/^https:\/\/\S+$/i.test(link.trim())) return setErro("Cole o link do vídeo começando com https://.");
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
      <h2 id="t-video" className="mb-sobrelinha">
        Vídeos com a marca
      </h2>
      <div className="mb-cartao stand-cartao grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor="video-corretor">
              Corretor
            </label>
            <div className="mb-campo__selecao"><select id="video-corretor" className="mb-campo__entrada" value={corretor} onChange={(e) => setCorretor(e.target.value)}>
              <option value="">Escolha</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select></div>
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor="video-data">
                Data
              </label>
              <input id="video-data" type="date" className="mb-campo__entrada stand-num" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor="video-qtd">
                Vídeos
              </label>
              <input id="video-qtd" className="mb-campo__entrada stand-num" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mb-campo"><label className="mb-campo__rotulo" htmlFor="video-link">
            Link do vídeo
          </label>
          <input id="video-link" className="mb-campo__entrada" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <button type="button" className="mb-botao mb-botao--primario justify-self-start" onClick={salvar}>
          Lançar vídeo
        </button>
        {erro && <Aviso tom="erro" titulo={erro} />}
      </div>
      {meus.length > 0 && (
        <div className="mb-cartao stand-cartao grid gap-2">
          <p className="mb-sobrelinha">Lançados por você nos últimos 30 dias</p>
          <ul className="grid gap-2">
            {meus.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 stand-divisor pt-2 stand-nota">
                <span>
                  {nomes.get(l.corretor_id) ?? "Corretor"} · <span className="stand-num">{diaCurto(l.data)}</span> · <span className="stand-num">{l.quantidade}</span>{" "}
                  vídeo{l.quantidade > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-3">
                  <SeloStatus status={l.status} />
                  {l.status === "pendente" && (
                    <button type="button" className="mb-botao mb-botao--discreto" onClick={() => mudar(l.id, "cancelado")}>
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

function SeloStatus({ status }: { status: string }) { return <Selo tom={status === "aprovado" ? "sucesso" : status === "recusado" ? "erro" : "alerta"}>{({ aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado", pendente: "Pendente" } as Record<string,string>)[status] ?? status}</Selo>; }
