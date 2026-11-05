"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { Anuncie } from "@/components/recepcao/anuncie";
import { ClientesDeHoje } from "@/components/recepcao/clientes-hoje";
import { RegistrarCliente, type FormularioCliente, type Registrado } from "@/components/recepcao/cliente";
import { CartaoVez, type DesfazerVez } from "@/components/recepcao/vez";
import { useSessao } from "@/lib/sessao";
import { abaInicial, diaDaTela, gravarStandDoAparelho, hora, lerStandDoAparelho, TIPOS_CLIENTE, type Stand, type Turno } from "@/lib/recepcao";
import { desfazerCliente, desfazerEvento, useClientesHoje, useMidias, usePessoas, useStands, useVez } from "@/lib/recepcao-dados";

/**
 * Recepção do stand, no PC da loja (o celular é reserva): a vez de corretores e
 * especialistas, o cadastro do cliente por tipo e quem anunciar. Regras em
 * docs/codex-recepcao.md e no banco (supabase/recepcao.sql).
 */
export default function RecepcaoPage() {
  return (
    <Casca titulo="Recepção" exige="plantao.atendimentos">
      <Recepcao />
    </Casca>
  );
}

/** PC a partir de 900px; abaixo, as abas do celular. */
function useTelaPc() {
  const [pc, setPc] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 900px)");
    const muda = () => setPc(m.matches);
    muda();
    m.addEventListener("change", muda);
    return () => m.removeEventListener("change", muda);
  }, []);
  return pc;
}

function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

function Recepcao() {
  const { stands, erro: erroStands } = useStands();
  const [standId, setStandId] = useState<string | null>(null);
  const [lido, setLido] = useState(false);
  useEffect(() => {
    setStandId(lerStandDoAparelho());
    setLido(true);
  }, []);

  if (erroStands) return <p className="aviso-erro">✕ {erroStands}</p>;
  if (!stands || !lido) return <p className="text-concrete">Carregando…</p>;
  const stand = stands.find((s) => s.id === standId && s.ativo);
  if (!stand)
    return (
      <EscolherStand
        stands={stands.filter((s) => s.ativo)}
        onEscolher={(id) => {
          gravarStandDoAparelho(id);
          setStandId(id);
        }}
      />
    );
  return (
    <TelaDoStand
      key={stand.id}
      stand={stand}
      onTrocar={() => {
        gravarStandDoAparelho(null);
        setStandId(null);
      }}
    />
  );
}

function EscolherStand({ stands, onEscolher }: { stands: Stand[]; onEscolher: (id: string) => void }) {
  return (
    <section className="card max-w-[560px]">
      <span className="eyebrow">Recepção</span>
      <h2 className="titulo-card mt-1">Escolha o stand deste computador</h2>
      {stands.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stands.map((s) => (
            <button key={s.id} type="button" className="btn btn-ghost btn-lg focus-ring justify-start font-display text-[16px] font-bold" onClick={() => onEscolher(s.id)}>
              {s.nome}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-ink-soft">! Nenhum stand ativo. Peça ao gerente geral para cadastrar.</p>
      )}
      <p className="mt-3 text-[12px] text-concrete">Este aparelho lembra a escolha. Dá para trocar no topo da tela.</p>
    </section>
  );
}

function TelaDoStand({ stand, onTrocar }: { stand: Stand; onTrocar: () => void }) {
  const { pode } = useSessao();
  const pc = useTelaPc();
  const agora = useAgora();
  const { vez, erro: erroVez, recarregar: recarregarVez } = useVez(stand.id);
  const { clientes, erro: erroClientes, recarregar: recarregarClientes } = useClientesHoje(stand.id);
  const { pessoas, erro: erroPessoas } = usePessoas();
  const { midias, erro: erroMidias } = useMidias();
  const [turno, setTurno] = useState<Turno>(() => abaInicial(new Date()));
  const [erro, setErro] = useState<string | null>(null);
  const [desfazerVez, setDesfazerVez] = useState<DesfazerVez | null>(null);
  const [registrado, setRegistrado] = useState<Registrado | null>(null);
  const [aba, setAba] = useState<"stand" | "clientes">("stand");
  const [cadastrando, setCadastrando] = useState(false);
  const form = useRef<FormularioCliente>(null);
  const fimDesfazer = useCallback(() => setDesfazerVez(null), []);

  const recarregar = useCallback(() => {
    recarregarVez();
    recarregarClientes();
  }, [recarregarVez, recarregarClientes]);

  // Atalhos do PC: Alt+N/C/P/R escolhem o tipo; Alt+V vai para Pôr na vez; Alt+K para o nome do cliente.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toUpperCase();
      const t = TIPOS_CLIENTE.find((x) => x.tecla === k);
      if (t) {
        e.preventDefault();
        form.current?.escolherTipo(t.slug);
        requestAnimationFrame(() => form.current?.focarTipo());
      } else if (k === "V") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(`#por-corretor-${turno}`)?.focus();
      } else if (k === "K") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("#c-nome")?.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [turno]);

  const falha = erroVez ?? erroPessoas ?? erroMidias;
  if (falha) return <p className="aviso-erro">✕ {falha}</p>;
  if (!vez || !pessoas || !midias) return <p className="text-concrete">Carregando…</p>;

  async function desfazerUltimaVez() {
    if (!desfazerVez) return;
    const r = await desfazerEvento(desfazerVez.eventoId);
    setDesfazerVez(null);
    if (r.erro !== undefined) setErro(r.erro);
    recarregarVez();
  }
  async function desfazerRegistro() {
    if (!registrado) return;
    const r = await desfazerCliente(registrado.resposta.atendimento_id);
    if (r.erro !== undefined) setErro(r.erro);
    setRegistrado(null);
    recarregar();
  }
  function aoRegistrar(r: Registrado) {
    setRegistrado(r);
    setCadastrando(false);
    if (!pc) setAba("clientes");
    recarregar();
    requestAnimationFrame(() => form.current?.focarTipo());
  }

  const cartoesVez = (
    <>
      <CartaoVez
        standId={stand.id}
        papel="corretor"
        turno={turno}
        onTurno={setTurno}
        vez={vez}
        pessoas={pessoas}
        agora={agora}
        onMudou={recarregarVez}
        onErro={setErro}
        onDesfazer={setDesfazerVez}
      />
      {stand.tem_especialista && (
        <CartaoVez
          standId={stand.id}
          papel="especialista"
          turno={turno}
          vez={vez}
          pessoas={pessoas}
          agora={agora}
          compacto
          onMudou={recarregarVez}
          onErro={setErro}
          onDesfazer={setDesfazerVez}
        />
      )}
    </>
  );
  const formulario = (
    <RegistrarCliente
      ref={form}
      stand={stand}
      vez={vez}
      pessoas={pessoas}
      midias={midias}
      agora={agora}
      tela={pc ? "pc" : "celular"}
      onRegistrado={aoRegistrar}
      onVezMudou={recarregarVez}
      onCancelar={pc ? undefined : () => setCadastrando(false)}
    />
  );
  const lista = clientes ? (
    <ClientesDeHoje clientes={clientes} midias={midias} standNome={stand.nome} tela={pc ? "pc" : "celular"} onMudou={recarregarClientes} />
  ) : (
    <p className="text-concrete">{erroClientes ? `✕ ${erroClientes}` : "Carregando…"}</p>
  );
  const anuncie = registrado && <Anuncie registrado={registrado} onDesfazer={desfazerRegistro} />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">
            Recepção · Stand {stand.nome}{" "}
            <button type="button" className="focus-ring ml-1 normal-case tracking-normal text-brand-dark underline" onClick={onTrocar}>
              Trocar stand
            </button>
          </span>
          <p className="mt-1 font-display text-[20px] font-extrabold md:text-[24px]">
            Hoje, <span className="num">{diaDaTela(agora)}</span>
          </p>
        </div>
        {pc && (
          <div className="text-right text-[12px] text-concrete">
            Agora <b className="num text-ink">{hora(agora)}</b>
            <span className="block">Atalhos: Alt+N, C, P, R tipo · Alt+V Pôr na vez · Alt+K cliente</span>
            {pode("plantoes.gerenciar") && (
              <Link href="/recepcao/stands/" className="link-acao mt-1 inline-block">
                Stands e especialistas
              </Link>
            )}
          </div>
        )}
      </div>

      {erro && (
        <p role="alert" className="aviso-erro">
          ✕ {erro}
        </p>
      )}

      {pc ? (
        <div className="grid grid-cols-[minmax(0,500px)_minmax(0,1fr)] items-start gap-4">
          <div className="grid gap-4">{cartoesVez}</div>
          <div className="grid gap-4">
            {anuncie}
            <section className="card" aria-labelledby="t-registrar">
              <span className="eyebrow">Clientes de hoje</span>
              <h2 id="t-registrar" className="titulo-card mb-3 mt-1">
                Registrar cliente
              </h2>
              {formulario}
            </section>
            {lista}
          </div>
        </div>
      ) : cadastrando ? (
        <section className="card" aria-labelledby="t-registrar-cel">
          <span className="eyebrow">Novo cliente</span>
          <h2 id="t-registrar-cel" className="titulo-card mb-3 mt-1">
            Registrar cliente
          </h2>
          {formulario}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-control" role="tablist">
            {(["stand", "clientes"] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={aba === a}
                className={clsx("focus-ring py-[10px] text-[14px] font-semibold", aba === a ? "bg-ink text-surface" : "bg-surface")}
                onClick={() => setAba(a)}
              >
                {a === "stand" ? "No stand" : (
                  <>
                    Clientes · <span className="num">{clientes?.filter((c) => c.status === "ativo").length ?? 0}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          {aba === "stand" ? (
            <div className="grid gap-4">{cartoesVez}</div>
          ) : (
            <div className="grid gap-4">
              {anuncie}
              {lista}
            </div>
          )}
          <div className="sticky bottom-0 -mx-5 border-t border-line bg-paper px-5 py-3">
            <button type="button" className="btn btn-red btn-lg focus-ring w-full" onClick={() => setCadastrando(true)}>
              + Cliente
            </button>
          </div>
        </>
      )}

      {desfazerVez && <AvisoDesfazer texto={desfazerVez.texto} onDesfazer={desfazerUltimaVez} onFim={fimDesfazer} />}
    </div>
  );
}
