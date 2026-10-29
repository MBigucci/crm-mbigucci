"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePerfil, useSessao } from "@/lib/sessao";
import { EMPREENDIMENTOS } from "@/lib/empreendimentos";
import {
  diaIso,
  formatarDia,
  formatarReais,
  imovelDaVenda,
  lerReais,
  seloVenda,
  type Totais,
  type Venda,
} from "@/lib/vendas";
import { corrigirVenda, marcarPaga, registrarVenda } from "@/lib/vendas-dados";

/** Estado da venda sempre com sinal + palavra + cor. */
export function SeloVenda({ venda }: { venda: Pick<Venda, "status" | "pagamento" | "pago_em"> }) {
  const s = seloVenda(venda);
  return (
    <span className={clsx("selo shrink-0 border-current", s.cor)}>
      <span aria-hidden>{s.sinal}</span> {s.texto}
    </span>
  );
}

/** Campo de dinheiro com "R$" à esquerda; aceita "480.000" ou "480.000,50". */
function CampoReais({ id, valor, onChange }: { id: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
        R$
      </span>
      <input
        id={id}
        className="input num pl-10"
        inputMode="decimal"
        autoComplete="off"
        placeholder="480.000"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Lista de sugestões de empreendimento (texto livre, como no lead). */
function ListaEmpreendimentos({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {EMPREENDIMENTOS.map((e) => (
        <option key={e.nome} value={e.nome} />
      ))}
    </datalist>
  );
}

const reaisParaCampo = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Registrar a venda pela ficha. O banco leva o lead para a etapa Venda e grava o
 * histórico. A venda conta no mês da assinatura; só a paga entra no VGV válido.
 */
export function RegistrarVenda({
  lead,
  onRegistrada,
  onCancelar,
}: {
  lead: { id: string; empreendimento: string | null; valor: number | null };
  onRegistrada: () => void;
  onCancelar: () => void;
}) {
  const hoje = diaIso(new Date());
  const [f, setF] = useState({
    empreendimento: lead.empreendimento ?? "",
    unidade: "",
    vgv: lead.valor ? reaisParaCampo(Number(lead.valor)) : "",
    assinada_em: hoje,
    paga: false,
    pago_em: hoje,
    observacao: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const campo = (k: "empreendimento" | "unidade" | "assinada_em" | "pago_em" | "observacao") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })),
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const vgv = lerReais(f.vgv);
    if (!f.empreendimento.trim()) return setErro("Escolha o empreendimento.");
    if (!vgv) return setErro("Confira o VGV: só números, como 480.000.");
    if (!f.assinada_em || f.assinada_em > hoje) return setErro("Confira a data da assinatura: até hoje.");
    if (f.paga && (!f.pago_em || f.pago_em > hoje)) return setErro("Confira a data do pagamento: até hoje.");
    setErro(null);
    setSalvando(true);
    const r = await registrarVenda({
      lead_id: lead.id,
      empreendimento: f.empreendimento.trim(),
      unidade: f.unidade.trim() || null,
      vgv,
      assinada_em: f.assinada_em,
      pagamento: f.paga ? "pago" : "pendente",
      pago_em: f.paga ? f.pago_em : null,
      observacao: f.observacao.trim() || null,
    });
    setSalvando(false);
    if (r) return setErro(r);
    onRegistrada();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4 border-t border-line pt-4" noValidate>
      <p className="text-[13px] text-ink-soft">
        A venda conta no mês da assinatura. O VGV válido é o das vendas assinadas e pagas.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="v-emp">
            Empreendimento
          </label>
          <input id="v-emp" className="input" list="v-emps" autoComplete="off" {...campo("empreendimento")} />
          <ListaEmpreendimentos id="v-emps" />
        </div>
        <div>
          <label className="field-label" htmlFor="v-uni">
            Unidade (opcional)
          </label>
          <input id="v-uni" className="input" placeholder="Apto 52, torre B" autoComplete="off" {...campo("unidade")} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-vgv">
            VGV
          </label>
          <CampoReais id="v-vgv" valor={f.vgv} onChange={(vgv) => setF((x) => ({ ...x, vgv }))} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-ass">
            Data da assinatura
          </label>
          <input id="v-ass" className="input num" type="date" max={hoje} {...campo("assinada_em")} />
        </div>
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" className="checkbox" checked={f.paga} onChange={(e) => setF((x) => ({ ...x, paga: e.target.checked }))} />
        Já está paga
      </label>
      {f.paga && (
        <div className="max-w-[260px]">
          <label className="field-label" htmlFor="v-pag">
            Data do pagamento
          </label>
          <input id="v-pag" className="input num" type="date" max={hoje} {...campo("pago_em")} />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="v-obs">
          Observação (opcional)
        </label>
        <textarea id="v-obs" className="input min-h-[72px]" {...campo("observacao")} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-red btn-lg focus-ring flex-1 md:flex-none" disabled={salvando}>
          {salvando ? "Registrando…" : "Registrar venda"}
        </button>
        <button type="button" className="btn btn-ghost btn-lg focus-ring flex-1 md:flex-none" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

type Painel = null | "pagar" | "corrigir" | "cancelar";

/**
 * Card da venda: imóvel, VGV, assinatura e pagamento. O corretor marca como
 * paga. Quem corrige a equipe (vendas.corrigir_equipe) corrige, cancela e
 * reativa, sempre com o motivo.
 */
export function CardVenda({
  venda: v,
  lead,
  corretor,
  onMudou,
}: {
  venda: Venda;
  /** Fora da ficha, o nome do cliente com o link. */
  lead?: { id: string; nome: string } | null;
  corretor?: string;
  onMudou: () => void;
}) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const [painel, setPainel] = useState<Painel>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => setPainel(null), [v]);

  const corrige = pode("vendas.corrigir_equipe");
  const paga = (v.corretor_id === eu.id && pode("leads.cadastrar")) || corrige;
  const ativa = v.status === "ativa";
  const quem = lead?.nome ? `${lead.nome}, ${imovelDaVenda(v)}` : imovelDaVenda(v);

  async function depois(e: string | null, aviso: string) {
    setErro(e);
    if (e) return;
    setOk(aviso);
    setPainel(null);
    onMudou();
  }

  return (
    <li className="card">
      <div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="num font-display text-[20px] font-bold leading-tight">{formatarReais(Number(v.vgv))}</p>
            <SeloVenda venda={v} />
          </div>
          {lead && (
            <Link href={`/leads/ficha/?id=${lead.id}`} className="focus-ring titulo-card mt-1 block truncate">
              {lead.nome}
            </Link>
          )}
          <p className="mt-1 text-[13px] text-ink-soft">{imovelDaVenda(v)}</p>
          <p className="num mt-1 text-[13px] text-ink-soft">Assinada em {formatarDia(v.assinada_em)}</p>
          {corretor && <p className="mt-1 truncate text-[12px] text-ink-soft">{corretor}</p>}
        </div>
      </div>
      {v.observacao && <p className="mt-2 whitespace-pre-line break-words text-[13px]">{v.observacao}</p>}
      {v.status === "cancelada" && v.motivo_cancelamento && (
        <p className="mt-2 text-[13px] text-ink-soft">Motivo do cancelamento: {v.motivo_cancelamento}</p>
      )}

      {ok && (
        <p className="aviso-ok mt-2" role="status">
          ✓ {ok}
        </p>
      )}
      {erro && <p className="aviso-erro mt-2">! {erro}</p>}

      {(paga || corrige) && !painel && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {ativa && v.pagamento === "pendente" && paga && (
            <button
              type="button"
              className="btn btn-ghost focus-ring flex-1 md:flex-none"
              aria-label={`Marcar como paga: ${quem}`}
              onClick={() => setPainel("pagar")}
            >
              ✓ Marcar como paga
            </button>
          )}
          {corrige && ativa && (
            <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => setPainel("corrigir")}>
              Corrigir
            </button>
          )}
          {corrige && (
            <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => setPainel("cancelar")}>
              {ativa ? "Cancelar venda" : "Reativar venda"}
            </button>
          )}
        </div>
      )}

      {painel === "pagar" && (
        <Pagar
          onCancelar={() => setPainel(null)}
          onSalvar={async (data) => depois(await marcarPaga(v.id, data), `Venda paga em ${formatarDia(data)}.`)}
        />
      )}
      {painel === "corrigir" && (
        <Corrigir
          venda={v}
          onCancelar={() => setPainel(null)}
          onSalvar={async (campos, motivo) => depois(await corrigirVenda(v.id, campos, motivo), "Venda corrigida.")}
        />
      )}
      {painel === "cancelar" && (
        <Motivo
          titulo={ativa ? "Cancelar a venda" : "Reativar a venda"}
          texto={
            ativa
              ? "A venda fica guardada como cancelada e sai das contas. Se for a única do lead, ele volta para Proposta."
              : "A venda volta a contar e o lead vai para Venda."
          }
          botao={ativa ? "✕ Cancelar venda" : "Reativar venda"}
          onCancelar={() => setPainel(null)}
          onSalvar={async (motivo) =>
            depois(
              await corrigirVenda(v.id, { status: ativa ? "cancelada" : "ativa" }, motivo),
              ativa ? "Venda cancelada." : "Venda reativada.",
            )
          }
        />
      )}
    </li>
  );
}

function Pagar({ onCancelar, onSalvar }: { onCancelar: () => void; onSalvar: (data: string) => Promise<void> }) {
  const hoje = diaIso(new Date());
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      <div className="max-w-[260px]">
        <label className="field-label" htmlFor="pagar-data">
          Data do pagamento
        </label>
        <input id="pagar-data" type="date" className="input num" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-red focus-ring"
          onClick={() => (!data || data > hoje ? setErro("Confira a data do pagamento: até hoje.") : onSalvar(data))}
        >
          ✓ Confirmar pagamento
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/** Pede o motivo (ele vai para o histórico do lead). */
function Motivo({
  titulo,
  texto,
  botao,
  onCancelar,
  onSalvar,
}: {
  titulo: string;
  texto: string;
  botao: string;
  onCancelar: () => void;
  onSalvar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      <p className="font-semibold">{titulo}</p>
      <p className="text-[13px] text-ink-soft">{texto}</p>
      <div>
        <label className="field-label" htmlFor="venda-motivo">
          Motivo
        </label>
        <textarea id="venda-motivo" className="input min-h-[72px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-red focus-ring"
          onClick={() => (motivo.trim().length < 3 ? setErro("Escreva o motivo.") : onSalvar(motivo.trim()))}
        >
          {botao}
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/** Corrigir os dados da venda. Só o que mudou vai para o banco, com o motivo. */
function Corrigir({
  venda: v,
  onCancelar,
  onSalvar,
}: {
  venda: Venda;
  onCancelar: () => void;
  onSalvar: (campos: Parameters<typeof corrigirVenda>[1], motivo: string) => Promise<void>;
}) {
  const hoje = diaIso(new Date());
  const [f, setF] = useState({
    empreendimento: v.empreendimento,
    unidade: v.unidade ?? "",
    vgv: reaisParaCampo(Number(v.vgv)),
    assinada_em: v.assinada_em,
    paga: v.pagamento === "pago",
    pago_em: v.pago_em ?? hoje,
    observacao: v.observacao ?? "",
    motivo: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const campo = (k: "empreendimento" | "unidade" | "assinada_em" | "pago_em" | "observacao" | "motivo") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })),
  });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const vgv = lerReais(f.vgv);
    if (!f.empreendimento.trim()) return setErro("Escolha o empreendimento.");
    if (!vgv) return setErro("Confira o VGV: só números, como 480.000.");
    if (!f.assinada_em || f.assinada_em > hoje) return setErro("Confira a data da assinatura: até hoje.");
    if (f.paga && (!f.pago_em || f.pago_em > hoje)) return setErro("Confira a data do pagamento: até hoje.");
    const novo = {
      empreendimento: f.empreendimento.trim(),
      unidade: f.unidade.trim() || null,
      vgv,
      assinada_em: f.assinada_em,
      pagamento: f.paga ? ("pago" as const) : ("pendente" as const),
      pago_em: f.paga ? f.pago_em : null,
      observacao: f.observacao.trim() || null,
    };
    const campos = Object.fromEntries(
      Object.entries(novo).filter(([k, x]) => (k === "vgv" ? Number(v.vgv) !== x : (v[k as keyof Venda] ?? null) !== x)),
    );
    if (!Object.keys(campos).length) return setErro("Nada mudou.");
    if (f.motivo.trim().length < 3) return setErro("Escreva o motivo da correção.");
    setErro(null);
    onSalvar(campos, f.motivo.trim());
  }

  return (
    <form onSubmit={salvar} className="mt-3 grid gap-3 border-t border-line pt-3" noValidate>
      <p className="font-semibold">Corrigir a venda</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`c-emp-${v.id}`}>
            Empreendimento
          </label>
          <input id={`c-emp-${v.id}`} className="input" list={`c-emps-${v.id}`} {...campo("empreendimento")} />
          <ListaEmpreendimentos id={`c-emps-${v.id}`} />
        </div>
        <div>
          <label className="field-label" htmlFor={`c-uni-${v.id}`}>
            Unidade
          </label>
          <input id={`c-uni-${v.id}`} className="input" {...campo("unidade")} />
        </div>
        <div>
          <label className="field-label" htmlFor={`c-vgv-${v.id}`}>
            VGV
          </label>
          <CampoReais id={`c-vgv-${v.id}`} valor={f.vgv} onChange={(vgv) => setF((x) => ({ ...x, vgv }))} />
        </div>
        <div>
          <label className="field-label" htmlFor={`c-ass-${v.id}`}>
            Data da assinatura
          </label>
          <input id={`c-ass-${v.id}`} className="input num" type="date" max={hoje} {...campo("assinada_em")} />
        </div>
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" className="checkbox" checked={f.paga} onChange={(e) => setF((x) => ({ ...x, paga: e.target.checked }))} />
        Paga
      </label>
      {f.paga && (
        <div className="max-w-[260px]">
          <label className="field-label" htmlFor={`c-pag-${v.id}`}>
            Data do pagamento
          </label>
          <input id={`c-pag-${v.id}`} className="input num" type="date" max={hoje} {...campo("pago_em")} />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor={`c-obs-${v.id}`}>
          Observação
        </label>
        <textarea id={`c-obs-${v.id}`} className="input min-h-[64px]" {...campo("observacao")} />
      </div>
      <div>
        <label className="field-label" htmlFor={`c-mot-${v.id}`}>
          Motivo da correção
        </label>
        <textarea id={`c-mot-${v.id}`} className="input min-h-[64px]" placeholder="Ex.: Valor do contrato assinado" {...campo("motivo")} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-red focus-ring">
          Salvar correção
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

/** As duas visões do VGV: assinado e assinado e pago (o válido). */
export function ResumoVendas({ t }: { t: Totais }) {
  const blocos = [
    { rotulo: "Assinado e pago", n: t.pagas, vgv: t.vgvValido, destaque: true },
    { rotulo: "Assinado, com pendentes", n: t.assinadas, vgv: t.vgvAssinado },
    { rotulo: "Pagamento pendente", n: t.assinadas - t.pagas, vgv: t.vgvAssinado - t.vgvValido },
  ];
  return (
    <section aria-label="Totais do período" className="grid gap-3 md:grid-cols-3">
      {blocos.map((b) => (
        <div key={b.rotulo} className={clsx("card", b.destaque && "bar-brand")}>
          <span className="eyebrow">{b.rotulo}</span>
          <span className="num mt-1 block font-display text-[26px] font-extrabold leading-none">{formatarReais(b.vgv)}</span>
          <span className="num mt-1 block text-[13px] text-ink-soft">
            {b.n} {b.n === 1 ? "venda" : "vendas"}
          </span>
        </div>
      ))}
    </section>
  );
}
