"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Interruptor } from "@/components/alicerce/interruptor";
import { Recolhivel } from "@/components/alicerce/recolhivel";
import { Seletor } from "@/components/alicerce/seletor";
import { CampoSelecao } from "@/components/alicerce/campo";
import { useToast } from "@/components/alicerce/toast";
import { CabecalhoAdmin, ConfirmacaoAdmin, ErroAdmin, erroAdmin } from "@/components/administracao/partes";
import { Casca } from "@/components/casca";
import { chamar } from "@/components/distribuicao/partes";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { carregarConfig } from "@/lib/distribuicao-dados";
import {
  CHAVES_AVANCADAS,
  CHAVES_PRINCIPAIS,
  ROTULO_MODO,
  SOBRE_CHAVE,
  chaveInativa,
  diaMes,
  hora,
  motivoADistribuir,
  ordinal,
  textoMudanca,
  type ADistribuir,
  type ChaveConfig,
  type ConfigDistribuicao,
  type Modo,
  type MudancaConfig,
  type VezEquipe,
} from "@/lib/distribuicao";

/** Distribuição automática: as chaves do gerente geral (regra fixa no banco, is_gerente_geral()). */
export default function DistribuicaoPage() {
  return (
    <Casca titulo="Distribuição automática" soGerenteGeral migrada>
      <Distribuicao />
    </Casca>
  );
}

function Distribuicao() {
  const toast = useToast(); const [carregado, setCarregado] = useState(false);
  const [cfg, setCfg] = useState<ConfigDistribuicao | null>(null);
  const [historico, setHistorico] = useState<MudancaConfig[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    const { data, error } = await db().from("distribuicao_config").select("*").maybeSingle<ConfigDistribuicao>();
    if (error) return setErro(mensagemErro(error));
    setCarregado(true); setCfg(data);
    const h = await chamar<MudancaConfig[]>("distribuicao_config_historico");
    setHistorico(h.data ?? []);
    return null;
  }, []);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(p: Partial<ConfigDistribuicao>) {
    const chave = Object.keys(p)[0];
    setSalvando(chave);
    setErro(null);
    const r = await chamar<ConfigDistribuicao>("distribuicao_config_salvar", { p });
    setSalvando(null);
    if (r.erro) { if (!(chave === "ligada" && p.ligada === false)) toast.mostrar(erroAdmin(r.erro), { tipo: "erro" }); return r.erro; }
    if (r.data) setCfg(r.data);
    void carregarConfig();
    const h = await chamar<MudancaConfig[]>("distribuicao_config_historico");
    setHistorico(h.data ?? []);
    return null;
  }

  if (erro && !cfg) return <ErroAdmin tentar={() => void carregar()} />;
  if (!cfg) return carregado ? <EstadoDePagina tipo="erro-de-carga" titulo="Distribuição não configurada" texto="Conclua a configuração da distribuição antes de continuar." acoes={<button className="mb-botao mb-botao--primario" onClick={() => void carregar()}>Tentar de novo</button>} /> : <CarregandoTabela texto="Carregando distribuição…" />;
  const ligouEm = historico?.find(h => h.chave === "ligada" && h.para === "true")?.quando;
  return <div className="admin-pilha">
    <CabecalhoAdmin titulo="Distribuição automática" />
    <span className="mb-escopo">Empresa toda</span>
    <div className="admin-distribuicao">
      <div className="admin-pilha">
        {erro && <Aviso tom="erro" titulo={erroAdmin(erro)} />}
        <Cartao id="t-geral" titulo="Distribuição automática" descricao={cfg.ligada ? `A roleta escolhe quem recebe${ligouEm ? ` · ligada em ${diaMes(ligouEm)}, ${hora(ligouEm)}` : ""}` : "Todo lead da entrada vai para A distribuir."} acao={<Interruptor ligado={cfg.ligada} rotulo="Distribuição automática" desativado={!!salvando} onAlternar={v => v ? void salvar({ ligada: true }) : setConfirmarDesligar(true)} />}>
          <div className="admin-pilha">
            <span id="distribuicao-modo" className="mb-campo__rotulo">Modo</span>
            <Seletor idRotulo="distribuicao-modo" valor={cfg.modo} onChange={modo => { if (!salvando && modo !== cfg.modo) void salvar({ modo }); }} grade="linha" opcoes={(Object.keys(ROTULO_MODO) as Modo[]).map(valor => ({ valor, rotulo: ROTULO_MODO[valor] }))} />
          </div>
        </Cartao>
        <Cartao id="t-principais" titulo="Principais" descricao="Abra o nome da regra para conferir o efeito.">
          <ul>{CHAVES_PRINCIPAIS.map(k =>
            <LinhaChave key={k} chave={k} cfg={cfg} ocupado={!!salvando} onSalvar={salvar} />)}</ul>
          <Recolhivel titulo="Avançadas" contagem={String(CHAVES_AVANCADAS.length)}>
            <ul>{CHAVES_AVANCADAS.map(k =>
              <LinhaChave key={k} chave={k} cfg={cfg} ocupado={!!salvando} onSalvar={salvar} />)}</ul>
            <Historico historico={historico} />
          </Recolhivel>
        </Cartao>
      </div>
      <div className="admin-pilha">
        <ADistribuirCard ligada={cfg.ligada} />
        <EquipesCard />
      </div>
    </div>
    <ConfirmacaoAdmin aberto={confirmarDesligar} titulo="Desligar a distribuição automática?" verbo="Desligar distribuição" seguro="Manter distribuição ligada" onFechar={() => setConfirmarDesligar(false)} confirmar={() => salvar({ ligada: false })}>
      <p>Os novos leads da entrada vão para A distribuir, para atribuição à mão. A redistribuição para. Os leads já atribuídos continuam com seus donos; créditos e presenças ficam guardados.</p>
    </ConfirmacaoAdmin>
  </div>;
}
function LinhaChave({ chave, cfg, ocupado, onSalvar }: { chave: ChaveConfig; cfg: ConfigDistribuicao; ocupado: boolean; onSalvar: (p: Partial<ConfigDistribuicao>) => void }) {
  const [aberta, setAberta] = useState(false); const sobre = SOBRE_CHAVE[chave]; const inativa = chaveInativa(cfg, chave);
  return <li className="admin-chave">
    <div className="admin-chave__topo">
      <button className="mb-botao mb-botao--discreto admin-chave__nome" aria-expanded={aberta} aria-controls={`chave-${chave}`} onClick={() => setAberta(!aberta)}>{sobre.nome}</button>
      <Interruptor ligado={cfg[chave]} rotulo={sobre.nome} desativado={ocupado} onAlternar={v => onSalvar({ [chave]: v })} />
    </div>{inativa && <p className="mb-campo__ajuda">{inativa}</p>}<div id={`chave-${chave}`} hidden={!aberta}>
      <dl className="mb-pares">
        <dt>Ligada</dt>
        <dd>{sobre.ligada}</dd>
        <dt>Desligada</dt>
        <dd>{sobre.desligada}</dd>
      </dl>
    </div>
  </li>;
}
function Historico({ historico }: { historico: MudancaConfig[] | null }) {
return <div className="admin-pilha">
    <h3 className="titulo-cartao">Histórico das mudanças</h3>{!historico ? <CarregandoTabela /> : !historico.length ? <p className="mb-campo__ajuda">Nenhuma mudança registrada.</p> : <ul className="mb-lista">{historico.map((h, i) =>
      <li className="mb-lista__item" key={i}>
        <span className="mb-lista__conteudo">
          <span className="mb-lista__titulo">{textoMudanca(h)}</span>
          <span className="mb-lista__meta">{diaMes(h.quando)} {hora(h.quando)}{h.quem ? ` · ${h.quem}` : ""}</span>
        </span>
      </li>)}</ul>}</div>;
}

function ADistribuirCard({ ligada }: { ligada: boolean }) {
  const [itens, setItens] = useState<ADistribuir[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);
  const [atribuir, setAtribuir] = useState<ADistribuir | null>(null);
  const [mandando, setMandando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar<ADistribuir[]>("distribuicao_a_distribuir");
    if (r.erro) return setErro(r.erro);
    setErro(null);
    setItens(r.data ?? []);
  }, []);
  useEffect(() => {
    void carregar();
    const t = setInterval(() => document.visibilityState === "visible" && void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);
  const daEntrada = (itens ?? []).filter(i => i.estado === "a_distribuir").length;
  const visiveis = todos ? (itens ?? []) : (itens ?? []).slice(0, 5);
  async function mandar() { setMandando(true); setAviso(null); const r = await chamar<number>("distribuicao_mandar_todos"); setMandando(false); if (r.erro) { setErro(erroAdmin(r.erro)); return r.erro; } setAviso(`${r.data ?? 0} ${r.data === 1 ? "lead distribuído" : "leads distribuídos"}.`); await carregar(); return null; }
  return <Cartao id="t-adistribuir" titulo={`A distribuir${itens ? ` · ${itens.length}` : ""}`} descricao="Distribuição manual" acao={itens && itens.length > 5 && <button className="mb-botao mb-botao--discreto mb-botao--p" aria-expanded={todos} onClick={() => setTodos(!todos)}>{todos ? "Ver menos" : `Ver os ${itens.length} leads`}</button>}>
    {erro && itens && <Aviso tom="erro" titulo={erroAdmin(erro)} />} {aviso && <Aviso tom="sucesso" titulo={aviso} />}
    {!itens && (erro ? <ErroAdmin tentar={() => void carregar()} /> : <CarregandoTabela texto="Carregando os leads…" />)}{itens && !itens.length && <EstadoVazio titulo="Nenhum lead esperando" texto="Os leads aguardando atribuição aparecem aqui." />}
    <ul className="mb-lista">{visiveis.map(l =>
      <li className="mb-lista__item" key={l.lead_id}>
        <span className="mb-lista__conteudo">
          <button className="mb-lista__titulo mb-lista__alvo" onClick={() => setAtribuir(l)}>{l.nome}</button>
          <span className="mb-lista__meta">{l.estado === "represado" ? "Represado · " : ""}{motivoADistribuir(l.motivo)}</span>
        </span>
        <span aria-hidden="true">→</span>
      </li>)}</ul>
    {atribuir && <EscolherCorretorAdmin titulo={`Atribuir ${atribuir.nome}`} onFechar={() => setAtribuir(null)} onEscolher={async id => { const r = await chamar("distribuicao_atribuir", { p_lead: atribuir.lead_id, p_corretor: id }); if (r.erro) return erroAdmin(r.erro); setAtribuir(null); await carregar(); return null; }} />}
    {ligada && daEntrada > 0 && !atribuir && <button className="mb-botao mb-botao--primario" disabled={mandando} onClick={() => setConfirmando(true)}>Mandar todos à distribuição</button>}
    <ConfirmacaoAdmin aberto={confirmando} titulo="Mandar os leads à distribuição?" verbo="Mandar à distribuição" onFechar={() => setConfirmando(false)} confirmar={mandar}>
      <p>Os leads da entrada em A distribuir seguem para a roleta. A atribuição aos corretores passa a valer na hora.</p>
    </ConfirmacaoAdmin>
  </Cartao>;
}

function EquipesCard() {
  const [itens, setItens] = useState<VezEquipe[] | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    chamar<VezEquipe[]>("distribuicao_equipes").then((r) => r.erro ? setErro(true) : setItens(r.data ?? []));
  }, []);
  return <Cartao id="t-vez-equipes" titulo="Vez das equipes">{erro ? <ErroAdmin tentar={() => location.reload()} /> : !itens ? <CarregandoTabela texto="Carregando equipes…" /> : !itens.length ? <EstadoVazio titulo="Nenhuma equipe na fila" texto="As equipes aptas aparecem na ordem da distribuição." /> : <div className="mb-tabela-envoltorio">
    <table className="mb-tabela mb-tabela--registros">
      <thead>
        <tr>
          <th scope="col">Equipe</th>
          <th scope="col">Posição</th>
          <th scope="col">Último lead</th>
        </tr>
      </thead>
      <tbody>{itens.map(e =>
        <tr key={e.equipe_id}>
          <td>{e.nome}</td>
          <td data-rotulo="Posição">
            <span>{ordinal(e.posicao)}</span>
          </td>
          <td data-rotulo="Último lead">
            <span>{e.ultimo ? hora(e.ultimo) : "–"}</span>
          </td>
        </tr>)}</tbody>
    </table>
  </div>}</Cartao>;
}
function EscolherCorretorAdmin({ titulo, onFechar, onEscolher }: { titulo: string; onFechar: () => void; onEscolher: (id: string) => Promise<string | null> }) {
  const [pessoas, setPessoas] = useState<{ id: string; nome: string }[] | null>(null), [id, setId] = useState(""), [erro, setErro] = useState<string | null>(null), [ocupado, setOcupado] = useState(false); const campo = useRef<HTMLSelectElement>(null);
  useEffect(() => { campo.current?.focus(); db().from("profiles").select("id, nome, perfil, equipe_id").eq("ativo", true).eq("perfil", "corretor").order("nome").then(({ data, error }) => error ? setErro(erroAdmin(error)) : setPessoas(data ?? [])); }, []);
  async function atribuir() { if (!id) return setErro("Escolha o corretor."); setOcupado(true); setErro(await onEscolher(id)); setOcupado(false); }
  return <div className="mb-subsecao admin-pilha">
    <h3 className="mb-subsecao__titulo">{titulo}</h3>
    <CampoSelecao rotulo="Corretor">
      <select ref={campo} className="mb-campo__entrada" value={id} onChange={e => setId(e.target.value)}>
        <option value="">Escolha o corretor</option>{pessoas?.map(p =>
          <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
    </CampoSelecao>{erro && <Aviso tom="erro" titulo={erro} />}<div className="mb-grupo-botoes">
      <button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={onFechar}>Cancelar</button>
      <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void atribuir()}>{ocupado ? "Atribuindo…" : "Atribuir lead"}</button>
    </div>
  </div>;
}
