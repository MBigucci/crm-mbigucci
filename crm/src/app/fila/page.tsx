"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Casca } from "@/components/casca";
import { EscolherCorretor, chamar } from "@/components/distribuicao/partes";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { useDistribuicaoStore, carregarEstado } from "@/lib/distribuicao-dados";
import {
  ROTULO_FAIXA,
  ROTULO_MODO,
  hora,
  inicioDoDiaSP,
  linhaDecisao,
  linhaVez,
  linhaVoce,
  ordinal,
  recortarFila,
  resumoFila,
  sinalCurto,
  situacaoLonga,
  textoEscopo,
  type Decisao,
  type Fila,
  type ItemFila,
  type VezEquipe,
  type VezMinha,
} from "@/lib/distribuicao";
import { Aviso } from "@/components/alicerce/aviso";
import { Cartao } from "@/components/alicerce/cartao";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { GrupoDaLista, ItemDaLista, Lista } from "@/components/alicerce/lista";
import { nivelDoTom } from "@/components/alicerce/mapas";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Prazo } from "@/components/alicerce/prazo";
import { Selo } from "@/components/alicerce/selo";
import { Tabela } from "@/components/alicerce/tabela";

export default function FilaPage() {
  return (
    <Casca titulo="Fila de leads" migrada>
      <div className="pagina-alicerce">
        <h1 className="mb-visualmente-oculto">Fila de leads</h1>
        <Fila_ />
      </div>
    </Casca>
  );
}

/** Quem lê decide a visão: gerente geral, corretor que recebe ou gerente com equipe. */
function Fila_() {
  const perfil = usePerfil();
  const { estado, lido } = useDistribuicaoStore();
  const ehGG = perfil.perfil === "gerente_geral";
  if (ehGG) return <FilaGerente geral />;
  if (!lido) return <CarregandoTabela texto="Carregando a fila…" />;
  if (estado?.recebe) return <FilaCorretor />;
  return <FilaGerente />;
}

const hojeAgora = () => {
  const agora = new Date();
  return { p_de: inicioDoDiaSP(agora), p_ate: new Date(agora.getTime() + 60_000).toISOString() };
};

// ---------------------------------------------------------------------------
// Corretor
// ---------------------------------------------------------------------------

/**
 * A Fila de leads no Alicerce (item 48, passo e): a fila em Lista (a vez, o nome e a situação em Prazo), "Hoje"
 * em Cartao com uma seção recolhível por vez (toque para ver o motivo), e a visão do gerente com Tabela, Cartao
 * e o PainelLateral das ações de cada corretor. As mesmas leituras e as mesmas chamadas ao banco de antes.
 */
function FilaCorretor() {
  const { estado } = useDistribuicaoStore();
  const [fila, setFila] = useState<Fila | null>(null);
  const [vezes, setVezes] = useState<VezMinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [f, v] = await Promise.all([chamar<Fila>("distribuicao_fila"), chamar<VezMinha[]>("distribuicao_minha_fila", hojeAgora())]);
    if (f.erro) return setErro(f.erro);
    setErro(null);
    setFila(f.data);
    setVezes(v.data ?? []);
  }, []);
  useEffect(() => {
    void carregar();
    const t = setInterval(() => document.visibilityState === "visible" && void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  if (estado?.modo === "gerentes")
    return <Aviso titulo="Não há fila de corretores" texto="No modo só gerentes, o gerente da equipe repassa os leads." />;
  if (erro) return <Aviso tom="erro" titulo="Não foi possível carregar a fila" texto={erro} />;
  if (!fila || !estado) return <CarregandoTabela texto="Carregando a fila…" />;

  const pesos = !!estado.chaves?.pesos;
  const naFila = fila.itens.filter((i) => i.posicao != null);
  const foraDaFila = fila.itens.filter((i) => i.posicao == null);
  const linhas = fila.escopo === "empresa" ? recortarFila(naFila) : naFila;

  return (
    <>
      <div className="pagina-alicerce__barra">
        <span className="mb-escopo">{textoEscopo(fila.escopo, fila.equipe_nome)}</span>
        <span className="mb-item__linha">
          {linhaVoce(estado, pesos)} ·{" "}
          <Link href="/fila/como/" className="mb-link">
            Como é calculado
          </Link>
        </span>
      </div>

      <section aria-labelledby="t-fila" className="pagina-alicerce__grupo pagina-alicerce--estreita">
        <h2 id="t-fila" className="titulo-secao">
          A fila agora
        </h2>
        {fila.itens.length > 0 ? (
          <Lista cartao rotulo="A fila agora">
            {linhas.map((x, n) =>
              "pulo" in x ? (
                <GrupoDaLista key={`pulo-${n}`}>
                  … {x.pulo} {x.pulo === 1 ? "corretor" : "corretores"}
                </GrupoDaLista>
              ) : (
                <LinhaFila key={x.corretor_id} item={x} comEquipe={fila.escopo === "empresa"} />
              ),
            )}
            {foraDaFila.map((i) => (
              <LinhaFila key={i.corretor_id} item={i} comEquipe={fila.escopo === "empresa"} />
            ))}
          </Lista>
        ) : (
          <EstadoVazio titulo="Ninguém na fila agora" texto="Quem estiver recebendo leads aparece aqui." />
        )}
        {fila.ultima && (
          <p className="pagina-alicerce__rodape">
            Última: {fila.ultima.apelido}, <span className="mb-num">{hora(fila.ultima.quando)}</span>
          </p>
        )}
      </section>

      <div className="pagina-alicerce--estreita">
        <Cartao id="t-hoje" titulo="Hoje" descricao={vezes && vezes.length > 0 ? "Toque numa linha para ver o motivo." : undefined}>
          {vezes && !vezes.length && <p className="mb-item__linha">Nenhuma vez hoje ainda.</p>}
          {vezes?.map((v, i) => {
            const l = linhaVez(v);
            return (
              <details key={i} className="mb-recolhivel">
                <summary>
                  <Situacao tom={l.tom} texto={l.texto} /> <span className="mb-recolhivel__contagem">· {hora(v.quando)}</span>
                </summary>
                <div className="mb-recolhivel__corpo">
                  <p className="mb-item__linha">{l.detalhe}</p>
                </div>
              </details>
            );
          })}
        </Cartao>
      </div>
    </>
  );
}

function LinhaFila({ item, comEquipe }: { item: ItemFila; comEquipe: boolean }) {
  const s = sinalCurto(item.situacao);
  return (
    <ItemDaLista
      atual={item.eu}
      ancora={<span className="mb-lista__hora">{item.posicao != null ? ordinal(item.posicao) : "–"}</span>}
      titulo={item.eu ? "Você" : item.apelido}
      meta={comEquipe && item.equipe_nome ? item.equipe_nome : undefined}
      lateral={<Situacao tom={s.tom} texto={s.texto} />}
    />
  );
}

// ---------------------------------------------------------------------------
// Gerente e gerente geral
// ---------------------------------------------------------------------------

type Equipe = { id: string; nome: string };
type Esperando = { id: string; nome: string; empreendimento: string | null; distribuicao_chegada: string | null; equipe_id: string | null };

function FilaGerente({ geral }: { geral?: boolean }) {
  const { pode } = useSessao();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipe, setEquipe] = useState<string | null>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [decisoes, setDecisoes] = useState<Decisao[] | null>(null);
  const [vezEquipes, setVezEquipes] = useState<VezEquipe[] | null>(null);
  const [esperando, setEsperando] = useState<Esperando[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // As ações do corretor abrem no PainelLateral; o item fica montado depois de fechar, para o foco voltar à linha.
  const [menu, setMenu] = useState<{ item: ItemFila; origem: HTMLElement } | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [repasse, setRepasse] = useState<Esperando | null>(null);
  const [todas, setTodas] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!geral) return;
    db()
      .from("teams")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => {
        const ts = (data ?? []) as Equipe[];
        setEquipes(ts);
        setEquipe((e) => e ?? ts[0]?.id ?? null);
      });
  }, [geral]);

  const carregar = useCallback(async () => {
    if (geral && !equipe && equipes.length) return;
    const [f, d] = await Promise.all([
      chamar<Fila>("distribuicao_fila", { p_equipe: geral ? equipe : null }),
      chamar<Decisao[]>("distribuicao_decisoes", hojeAgora()),
    ]);
    if (f.erro) return setErro(f.erro);
    setErro(null);
    setFila(f.data);
    setDecisoes(d.data ?? []);
    setAgora(Date.now());
    if (geral) chamar<VezEquipe[]>("distribuicao_equipes").then((r) => setVezEquipes(r.data ?? []));
    if (f.data?.modo === "gerentes") {
      let q = db()
        .from("leads")
        .select("id, nome, empreendimento, distribuicao_chegada, equipe_id")
        .is("dono_id", null)
        .eq("distribuicao_estado", "fila_equipe")
        .order("distribuicao_chegada");
      if (geral && equipe) q = q.eq("equipe_id", equipe);
      const { data, error } = await q;
      setEsperando(error ? [] : ((data ?? []) as Esperando[]));
    } else setEsperando(null);
  }, [geral, equipe, equipes.length]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => document.visibilityState === "visible" && void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  const decisoesDaEquipe = useMemo(() => decisoes ?? [], [decisoes]);

  if (erro) return <Aviso tom="erro" titulo="Não foi possível carregar a fila" texto={erro} />;
  if (!fila) return <CarregandoTabela texto="Carregando a fila…" />;

  const equipeNome = equipes.find((e) => e.id === equipe)?.nome ?? fila.equipe_nome;
  const escopo = textoEscopo(fila.escopo, equipeNome, !geral);

  return (
    <>
      <div className="pagina-alicerce__barra">
        <span className="mb-escopo">
          {escopo} · Modo: {ROTULO_MODO[fila.modo].toLowerCase()}
        </span>
        {geral && fila.escopo === "equipe" && equipes.length > 1 && (
          <label className="mb-campo pagina-alicerce__filtro">
            <span className="mb-campo__rotulo">Equipe</span>
            <span className="mb-campo__selecao">
              <select className="mb-campo__entrada" value={equipe ?? ""} onChange={(e) => setEquipe(e.target.value)}>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
      </div>

      <div className="pagina-alicerce__colunas">
        <div className="pagina-alicerce">
          {fila.modo === "gerentes" ? (
            <section className="pagina-alicerce__grupo" aria-labelledby="t-esperando">
              <h2 id="t-esperando" className="titulo-secao">
                Leads esperando repasse{esperando ? ` · ${esperando.length}` : ""}
              </h2>
              {esperando && !esperando.length && <EstadoVazio titulo="Nenhum lead esperando repasse" texto="Os leads que chegarem para a equipe aparecem aqui." />}
              {esperando && esperando.length > 0 && (
                <Tabela tipo="registros" rotulo="Leads esperando repasse">
                  <thead>
                    <tr>
                      <th scope="col">Lead</th>
                      <th scope="col">Empreendimento</th>
                      <th scope="col">Espera</th>
                      <th scope="col">
                        <span className="mb-visualmente-oculto">Ação</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {esperando.map((l) => {
                      const min = l.distribuicao_chegada ? Math.max(0, Math.floor((agora - new Date(l.distribuicao_chegada).getTime()) / 60_000)) : null;
                      return (
                        <tr key={l.id}>
                          <td>
                            <span className="mb-tabela__principal">{l.nome}</span>
                          </td>
                          <td data-rotulo="Empreendimento">{l.empreendimento ?? "–"}</td>
                          <td data-rotulo="Espera">{min != null ? <Prazo nivel={min >= 15 ? "estourado" : "atencao"}>! {min} min</Prazo> : "–"}</td>
                          <td className="mb-tabela__acoes">
                            <button type="button" className="mb-botao mb-botao--secundario" onClick={() => setRepasse(l)}>
                              Repassar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
              )}
            </section>
          ) : (
            <section className="pagina-alicerce__grupo" aria-labelledby="t-fila">
              <h2 id="t-fila" className="titulo-secao">
                A fila agora
              </h2>
              <p className="mb-item__linha">{resumoFila(fila.itens)}</p>
              {fila.escopo === "empresa" && !geral && <p className="mb-item__linha">Créditos e motivos só da sua equipe.</p>}
              <TabelaFila
                itens={fila.itens}
                comEquipe={fila.escopo === "empresa"}
                onMenu={(item, origem) => {
                  setMenu({ item, origem });
                  setMenuAberto(true);
                }}
              />
            </section>
          )}
        </div>

        <div className="pagina-alicerce">
          <Cartao
            id="t-decisao"
            titulo={`Última decisão${decisoesDaEquipe[0] ? ` · ${hora(decisoesDaEquipe[0].quando)}` : ""}`}
            acao={
              decisoesDaEquipe.length > 1 ? (
                <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" aria-expanded={todas} onClick={() => setTodas(!todas)}>
                  {todas ? "Só a última" : "Todas as decisões"}
                </button>
              ) : undefined
            }
          >
            {!decisoesDaEquipe.length && <p className="mb-item__linha">Nenhuma decisão hoje.</p>}
            <div className="mb-subsecoes">
              {(todas ? decisoesDaEquipe : decisoesDaEquipe.slice(0, 1)).map((d, i) => {
                const l = linhaDecisao(d);
                return (
                  <div key={i} className="mb-subsecao">
                    <span className="mb-item__linha mb-item__linha--forte">
                      {todas && <span className="mb-num">{hora(d.quando)} · </span>}
                      {l.titulo}
                    </span>
                    {l.pulados && <span className="mb-item__linha">{l.pulados}</span>}
                  </div>
                );
              })}
            </div>
          </Cartao>

          {geral && vezEquipes && (
            <Cartao id="t-equipes" titulo="Equipes" acao={<span className="mb-escopo">Empresa toda</span>}>
              <Lista rotulo="Equipes">
                {vezEquipes.map((e) => (
                  <ItemDaLista
                    key={e.equipe_id}
                    ancora={<span className="mb-lista__hora">{ordinal(e.posicao)}</span>}
                    titulo={e.nome}
                    lateral={e.ultimo ? `último ${hora(e.ultimo)}` : "–"}
                  />
                ))}
              </Lista>
            </Cartao>
          )}
        </div>
      </div>

      {menu && (
        <MenuCorretor
          item={menu.item}
          aberto={menuAberto}
          origem={menu.origem}
          podeProdutos={pode("distribuicao.produtos")}
          onFechar={() => setMenuAberto(false)}
          onMudou={carregar}
        />
      )}
      {repasse && (
        <EscolherCorretor
          titulo={`Repassar ${repasse.nome}`}
          equipe={repasse.equipe_id}
          onFechar={() => setRepasse(null)}
          onEscolher={async (id) => {
            const r = await chamar("distribuicao_atribuir", { p_lead: repasse.id, p_corretor: id });
            if (r.erro) return r.erro;
            setRepasse(null);
            await carregar();
            return null;
          }}
        />
      )}
    </>
  );
}

/**
 * A fila do gerente numa Tabela de registros: no computador, as colunas; no celular, cada corretor vira um card
 * (o `data-rotulo` de cada célula). Quem tem detalhe (a própria equipe) abre as ações no PainelLateral pela linha
 * inteira; sem "⋯" em cada linha.
 */
function TabelaFila({ itens, comEquipe, onMenu }: { itens: ItemFila[]; comEquipe: boolean; onMenu: (i: ItemFila, origem: HTMLElement) => void }) {
  return (
    <Tabela tipo="registros" rotulo="A fila agora">
      <thead>
        <tr>
          <th scope="col">Corretor</th>
          <th scope="col">Situação</th>
          <th scope="col">Desempenho</th>
          <th scope="col" className="mb-tabela__num">
            Créditos
          </th>
          <th scope="col" className="mb-tabela__num">
            Hoje
          </th>
        </tr>
      </thead>
      <tbody>
        {itens.map((i) => {
          const s = situacaoLonga(i.situacao, i.desde);
          const detalhe = i.creditos != null;
          const nome = (
            <>
              <span className="mb-num">{i.posicao != null ? ordinal(i.posicao) : "–"}</span> {i.apelido}
            </>
          );
          return (
            <tr key={i.corretor_id}>
              <td>
                {detalhe ? (
                  <button type="button" className="mb-tabela__principal mb-tabela__alvo" aria-haspopup="dialog" aria-label={`Ações de ${i.apelido}`} onClick={(e) => onMenu(i, e.currentTarget)}>
                    {nome}
                  </button>
                ) : (
                  <span className="mb-tabela__principal">{nome}</span>
                )}
                {comEquipe && i.equipe_nome && <span className="mb-tabela__secundario">{i.equipe_nome}</span>}
                {!!i.nao_atende && (
                  <span className="mb-tabela__selos">
                    <Selo>Não atende {i.nao_atende} {i.nao_atende === 1 ? "produto" : "produtos"}</Selo>
                  </span>
                )}
              </td>
              <td data-rotulo="Situação">
                <Situacao tom={s.tom} texto={s.texto} />
              </td>
              <td data-rotulo="Desempenho">{i.faixa ? ROTULO_FAIXA[i.faixa] : "–"}</td>
              <td className="mb-tabela__num" data-rotulo="Créditos">
                {detalhe ? Math.round(Number(i.creditos) * 10) / 10 : "–"}
              </td>
              <td className="mb-tabela__num" data-rotulo="Hoje">
                {i.recebidos_hoje ?? "–"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}

/** As ações do gerente sobre um corretor: pausar, tirar da distribuição, como é calculado e produtos. */
function MenuCorretor({
  item,
  aberto,
  origem,
  podeProdutos,
  onFechar,
  onMudou,
}: {
  item: ItemFila;
  aberto: boolean;
  origem: HTMLElement;
  podeProdutos: boolean;
  onFechar: () => void;
  onMudou: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function fazer(nome: string, args: Record<string, unknown>) {
    setOcupado(true);
    setErro(null);
    const r = await chamar(nome, args);
    setOcupado(false);
    if (r.erro) return setErro(r.erro);
    await onMudou();
    void carregarEstado();
    onFechar();
  }
  const pausado = item.situacao === "pausa";
  const fora = item.situacao === "fora_gerente";
  const q = `?c=${encodeURIComponent(item.corretor_id)}&n=${encodeURIComponent(item.apelido)}`;
  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo={item.apelido}
      descricao={situacaoLonga(item.situacao, item.desde).texto}
      foco={() => (origem.isConnected ? origem : null)}
    >
      <div className="mb-lateral__corpo">
        {erro && <Aviso tom="erro" titulo={erro} />}
        {!fora && (
          <button
            type="button"
            disabled={ocupado}
            className="mb-botao mb-botao--secundario"
            onClick={() => fazer(pausado ? "distribuicao_voltar" : "distribuicao_pausar", pausado ? { p_corretor: item.corretor_id } : { p_corretor: item.corretor_id, p_ate: null })}
          >
            {pausado ? "Voltar a receber" : "Pausar"}
          </button>
        )}
        <button type="button" disabled={ocupado} className="mb-botao mb-botao--secundario" onClick={() => fazer("distribuicao_participa", { p_corretor: item.corretor_id, p_sim: fora })}>
          {fora ? "Pôr na distribuição" : "Tirar da distribuição"}
        </button>
        <Link href={`/fila/como/${q}`} className="mb-botao mb-botao--secundario">
          Como é calculado
        </Link>
        {podeProdutos && (
          <Link href={`/equipes/corretor/?id=${encodeURIComponent(item.corretor_id)}`} className="mb-botao mb-botao--secundario">
            Produtos e participação
          </Link>
        )}
      </div>
    </PainelLateral>
  );
}

/**
 * A situação na fila (sinal + palavra). O que pede ação é Prazo (! em âmbar, vermelho); o que está em dia
 * ("✓ Apto", "✓ Recebendo") é texto normal com o sinal, sem cor: estado em dia não é prazo (Alicerce 1794069383-61bf).
 */
function Situacao({ tom, texto }: { tom: "red" | "ok" | "wa" | "neutro"; texto: string }) {
  return tom === "ok" ? <span>{texto}</span> : <Prazo nivel={nivelDoTom(tom)}>{texto}</Prazo>;
}
