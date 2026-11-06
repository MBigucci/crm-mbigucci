"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { EscolherCorretor, Escopo, chamar } from "@/components/distribuicao/partes";
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
    <Casca titulo="Distribuição automática" soGerenteGeral>
      <Distribuicao />
    </Casca>
  );
}

function Distribuicao() {
  const [cfg, setCfg] = useState<ConfigDistribuicao | null>(null);
  const [historico, setHistorico] = useState<MudancaConfig[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await db().from("distribuicao_config").select("*").maybeSingle<ConfigDistribuicao>();
    if (error) return setErro(mensagemErro(error));
    setCfg(data);
    const h = await chamar<MudancaConfig[]>("distribuicao_config_historico");
    setHistorico(h.data ?? []);
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
    if (r.erro) return setErro(r.erro);
    if (r.data) setCfg(r.data);
    void carregarConfig();
    const h = await chamar<MudancaConfig[]>("distribuicao_config_historico");
    setHistorico(h.data ?? []);
  }

  if (erro && !cfg) return <p className="aviso-erro">✕ {erro}</p>;
  if (!cfg) return <p className="text-concrete">Carregando…</p>;

  const ligouEm = historico?.find((h) => h.chave === "ligada" && h.para === "true")?.quando ?? null;
  const desde = ligouEm ? (diaMes(ligouEm) === diaMes(new Date().toISOString()) ? ` desde ${hora(ligouEm)}` : ` desde ${diaMes(ligouEm)}`) : "";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        {erro && (
          <p role="alert" className="aviso-erro">
            ✕ {erro}
          </p>
        )}
        <section className={clsx("card grid gap-3", cfg.ligada ? "" : "bar-brand")} aria-labelledby="t-geral">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="t-geral" className="titulo-card">
                {cfg.ligada ? `✓ Ligada${desde}` : "– Desligada"}
              </h2>
              <p className="mt-1 text-[13px] text-ink-soft">{cfg.ligada ? "A roleta escolhe quem recebe o lead da empresa." : "Todo lead da entrada vai para A distribuir."}</p>
            </div>
            <Interruptor
              ligado={cfg.ligada}
              rotulo="Distribuição automática"
              ocupado={salvando === "ligada"}
              onTrocar={() => (cfg.ligada ? setConfirmarDesligar(true) : salvar({ ligada: true }))}
            />
          </div>
          {confirmarDesligar && (
            <div className="grid gap-2 rounded-sm border border-line bg-paper p-3">
              <p className="text-[14px]">Desligar? Todo lead da entrada vai para A distribuir e é atribuído à mão.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-red focus-ring"
                  onClick={() => {
                    setConfirmarDesligar(false);
                    void salvar({ ligada: false });
                  }}
                >
                  Desligar
                </button>
                <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmarDesligar(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          <div>
            <span className="field-label">Modo</span>
            <div role="radiogroup" aria-label="Modo" className="inline-flex flex-wrap overflow-hidden rounded-sm border border-control">
              {(Object.keys(ROTULO_MODO) as Modo[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={cfg.modo === m}
                  disabled={!!salvando}
                  className={clsx(
                    "focus-ring min-h-[36px] border-l border-line px-3 text-[13px] font-semibold first:border-l-0",
                    cfg.modo === m ? "bg-ink text-surface" : "bg-surface text-ink",
                  )}
                  onClick={() => cfg.modo !== m && salvar({ modo: m })}
                >
                  {ROTULO_MODO[m]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="t-principais">
          <h2 id="t-principais" className="titulo-card">
            Principais
          </h2>
          <ul className="mt-2 grid">
            {CHAVES_PRINCIPAIS.map((k) => (
              <LinhaChave key={k} chave={k} cfg={cfg} ocupado={salvando === k} onSalvar={salvar} />
            ))}
          </ul>
          <details className="group mt-2 border-t border-line pt-2">
            <summary className="focus-ring cursor-pointer list-none py-2 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
              <span className="text-ink-soft group-open:hidden">+ </span>
              <span className="hidden text-ink-soft group-open:inline">– </span>
              Avançadas ({CHAVES_AVANCADAS.length + 1})
            </summary>
            <ul className="grid">
              {CHAVES_AVANCADAS.map((k) => (
                <LinhaChave key={k} chave={k} cfg={cfg} ocupado={salvando === k} onSalvar={salvar} />
              ))}
              <Historico historico={historico} />
            </ul>
          </details>
          <p className="mt-2 text-[12px] text-concrete">Toque no nome de uma chave para ver o que acontece ligada e desligada.</p>
        </section>
      </div>

      <div className="grid gap-4">
        <ADistribuirCard ligada={cfg.ligada} />
        <EquipesCard />
      </div>
    </div>
  );
}

function Interruptor({ ligado, rotulo, ocupado, inativo, onTrocar }: { ligado: boolean; rotulo: string; ocupado?: boolean; inativo?: boolean; onTrocar: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={ocupado}
      onClick={onTrocar}
      className={clsx("focus-ring inline-flex min-h-[36px] shrink-0 items-center gap-2 text-[12px] font-semibold", inativo ? "text-concrete" : "text-ink")}
    >
      <span
        aria-hidden
        className={clsx(
          "relative block h-5 w-[34px] rounded-[10px] transition-colors",
          ligado ? (inativo ? "bg-control" : "bg-ink") : "border border-control bg-surface-disabled",
        )}
      >
        <span
          className={clsx(
            "absolute top-[3px] block h-[14px] w-[14px] rounded-full transition-[left]",
            ligado ? "left-[17px] bg-surface" : "left-[2px] top-[2px] bg-control",
          )}
        />
      </span>
      <span className="w-[66px] text-left">{ocupado ? "Salvando…" : ligado ? "Ligada" : "Desligada"}</span>
    </button>
  );
}

function LinhaChave({ chave, cfg, ocupado, onSalvar }: { chave: ChaveConfig; cfg: ConfigDistribuicao; ocupado: boolean; onSalvar: (p: Partial<ConfigDistribuicao>) => void }) {
  const [aberta, setAberta] = useState(false);
  const sobre = SOBRE_CHAVE[chave];
  const inativa = chaveInativa(cfg, chave);
  return (
    <li className="border-t border-line py-2 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-expanded={aberta} className="focus-ring min-w-0 text-left" onClick={() => setAberta(!aberta)}>
          <span className={clsx("block text-[14px] font-semibold", inativa && "text-concrete")}>{sobre.nome}</span>
          {inativa && <span className="block text-[12px] text-ink-soft">{inativa}</span>}
        </button>
        <Interruptor ligado={cfg[chave]} rotulo={sobre.nome} ocupado={ocupado} inativo={!!inativa} onTrocar={() => onSalvar({ [chave]: !cfg[chave] })} />
      </div>
      {aberta && (
        <dl className="mt-2 grid gap-1 text-[13px]">
          <div>
            <dt className="inline font-semibold">Ligada: </dt>
            <dd className="inline text-ink-soft">{sobre.ligada}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Desligada: </dt>
            <dd className="inline text-ink-soft">{sobre.desligada}</dd>
          </div>
        </dl>
      )}
    </li>
  );
}

function Historico({ historico }: { historico: MudancaConfig[] | null }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="border-t border-line py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold">Histórico das mudanças</span>
        <button type="button" aria-expanded={aberto} className="btn btn-ghost focus-ring px-3 py-[5px] text-[12px]" onClick={() => setAberto(!aberto)}>
          {aberto ? "Fechar" : "Ver"}
        </button>
      </div>
      {aberto && (
        <ul className="mt-2 grid gap-1 text-[13px]">
          {!historico?.length && <li className="text-ink-soft">Nenhuma mudança ainda.</li>}
          {historico?.map((h, i) => (
            <li key={i}>
              <span className="num text-ink-soft">
                {diaMes(h.quando)} {hora(h.quando)}
              </span>{" "}
              {textoMudanca(h)}
              {h.quem && <span className="text-ink-soft"> · {h.quem}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ADistribuirCard({ ligada }: { ligada: boolean }) {
  const [itens, setItens] = useState<ADistribuir[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);
  const [atribuir, setAtribuir] = useState<ADistribuir | null>(null);
  const [mandando, setMandando] = useState(false);

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

  const daEntrada = (itens ?? []).filter((i) => i.estado === "a_distribuir").length;
  const visiveis = todos ? (itens ?? []) : (itens ?? []).slice(0, 5);

  return (
    <section className="card" aria-labelledby="t-adistribuir">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-adistribuir" className="titulo-card">
          A distribuir{itens ? ` · ${itens.length}` : ""}
        </h2>
        {itens && itens.length > 5 && (
          <button type="button" className="focus-ring text-[13px] font-semibold text-brand underline underline-offset-2" onClick={() => setTodos(!todos)}>
            {todos ? "Menos" : "Abrir"}
          </button>
        )}
      </div>
      {erro && <p className="aviso-erro mt-2">✕ {erro}</p>}
      {aviso && (
        <p role="status" className="aviso-ok mt-2">
          {aviso}
        </p>
      )}
      {itens && !itens.length && <p className="mt-2 text-ink-soft">Nenhum lead esperando.</p>}
      <ul className="mt-2 grid">
        {visiveis.map((l) => (
          <li key={l.lead_id} className="flex items-center justify-between gap-2 border-t border-line py-[6px] text-[14px] first:border-t-0">
            <span className="min-w-0">
              <span className="font-semibold">{l.nome}</span>
              <span className="text-ink-soft"> · {l.estado === "represado" ? "represado, " : ""}{motivoADistribuir(l.motivo)}</span>
            </span>
            <button type="button" className="btn btn-ghost focus-ring px-3 py-[5px] text-[12px]" onClick={() => setAtribuir(l)}>
              Atribuir
            </button>
          </li>
        ))}
      </ul>
      {ligada && daEntrada > 0 && (
        <button
          type="button"
          disabled={mandando}
          className="btn btn-red focus-ring mt-3 w-full"
          onClick={async () => {
            setMandando(true);
            setAviso(null);
            const r = await chamar<number>("distribuicao_mandar_todos");
            setMandando(false);
            if (r.erro) return setErro(r.erro);
            setAviso(`✓ ${r.data ?? 0} ${r.data === 1 ? "lead distribuído" : "leads distribuídos"}.`);
            await carregar();
          }}
        >
          {mandando ? "Distribuindo…" : "Mandar todos à distribuição"}
        </button>
      )}
      {atribuir && (
        <EscolherCorretor
          titulo={`Atribuir ${atribuir.nome}`}
          onFechar={() => setAtribuir(null)}
          onEscolher={async (id) => {
            const r = await chamar("distribuicao_atribuir", { p_lead: atribuir.lead_id, p_corretor: id });
            if (r.erro) return r.erro;
            setAtribuir(null);
            await carregar();
            return null;
          }}
        />
      )}
    </section>
  );
}

function EquipesCard() {
  const [itens, setItens] = useState<VezEquipe[] | null>(null);
  useEffect(() => {
    chamar<VezEquipe[]>("distribuicao_equipes").then((r) => setItens(r.data ?? []));
  }, []);
  if (!itens) return null;
  return (
    <section className="card" aria-labelledby="t-vez-equipes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="t-vez-equipes" className="titulo-card">
          Equipes
        </h2>
        <Escopo texto="Empresa toda" />
      </div>
      {!itens.length && <p className="mt-2 text-ink-soft">Nenhuma equipe.</p>}
      <ul className="mt-2 grid">
        {itens.map((e) => (
          <li key={e.equipe_id} className="flex items-center gap-2 border-t border-line py-[6px] text-[14px] first:border-t-0">
            <span className="num w-8 font-bold text-ink-soft">{ordinal(e.posicao)}</span>
            <span className="flex-1 font-semibold">{e.nome}</span>
            <span className="num text-[13px] text-ink-soft">{e.ultimo ? `último ${hora(e.ultimo)}` : "–"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
