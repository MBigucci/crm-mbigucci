"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { slugDoNome, STATUS_EMPREENDIMENTO, TIPOS_TIPOLOGIA, type Empreendimento, type StatusEmpreendimento, type TipoTipologia } from "@/lib/catalogo";
import { salvarEmpreendimento, salvarTipologias, useCatalogo, type CamposEmpreendimento } from "@/lib/catalogo-dados";
import { lerReais } from "@/lib/vendas";

export default function EditarEmpreendimentoPage() {
  return (
    <Casca titulo="Empreendimento" exige="empreendimentos.gerenciar">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <PeloEndereco />
      </Suspense>
    </Casca>
  );
}

function PeloEndereco() {
  const slug = useSearchParams().get("slug");
  const { catalogo } = useCatalogo();
  if (!catalogo) return <p className="text-concrete">Carregando…</p>;
  const e = slug ? catalogo.find((x) => x.slug === slug) : undefined;
  if (slug && !e) return <p className="text-ink-soft">! Empreendimento não encontrado.</p>;
  return <Formulario e={e} />;
}

const LINKS = [
  { k: "link_apresentacao", rotulo: "Apresentação (vai para o cliente)" },
  { k: "link_tabela", rotulo: "Tabela de preços" },
  { k: "link_pagina", rotulo: "Página no site" },
  { k: "link_maps", rotulo: "Google Maps" },
  { k: "link_book", rotulo: "Book" },
  { k: "link_tour", rotulo: "Tour virtual" },
  { k: "link_fotos", rotulo: "Fotos" },
  { k: "link_ficha", rotulo: "Ficha técnica" },
  { k: "link_memorial", rotulo: "Memorial descritivo" },
] as const;
type ChaveLink = (typeof LINKS)[number]["k"];

type LinhaTipologia = {
  id?: string;
  rotulo: string;
  tipo: TipoTipologia;
  dormitorios: string;
  suites: string;
  vagas_min: string;
  vagas_max: string;
  area_m2: string;
  preco: string;
  preco_nota: string;
  condominio_valor: string;
  esgotada: boolean;
};

const txt = (n: number | null | undefined) => (n == null ? "" : String(n));
const reais = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const inteiro = (s: string) => (s.trim() === "" ? null : Number(s));
const decimal = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));
const vazio = (s: string) => s.trim() || null;

function Formulario({ e }: { e?: Empreendimento }) {
  const router = useRouter();
  const [f, setF] = useState({
    nome: e?.nome ?? "",
    condominio: e?.condominio ?? "",
    status: (e?.status ?? "breve_lancamento") as StatusEmpreendimento,
    tipo: e?.tipo ?? "residencial",
    marca: e?.marca ?? "MBigucci",
    ativo: e?.ativo ?? true,
    endereco: e?.endereco ?? "",
    bairro: e?.bairro ?? "",
    cidade: e?.cidade ?? "",
    entrega: e?.entrega_prevista?.slice(0, 7) ?? "",
    entrega_texto: e?.entrega_texto ?? "",
    chamada: e?.chamada ?? "",
    tabela_mes: e?.tabela_mes?.slice(0, 7) ?? "",
    restricao_renda: e?.restricao_renda ?? "",
    variacoes: (e?.variacoes ?? []).join(", "),
    pede_contexto: e?.pede_contexto ?? false,
    observacao: e?.observacao ?? "",
    ...(Object.fromEntries(LINKS.map((l) => [l.k, e?.[l.k] ?? ""])) as Record<ChaveLink, string>),
  });
  const [tips, setTips] = useState<LinhaTipologia[]>(
    (e?.tipologias ?? []).map((t) => ({
      id: t.id,
      rotulo: t.rotulo,
      tipo: t.tipo,
      dormitorios: txt(t.dormitorios),
      suites: txt(t.suites),
      vagas_min: txt(t.vagas_min),
      vagas_max: txt(t.vagas_max),
      area_m2: reais(t.area_m2),
      preco: reais(t.preco_a_partir_de),
      preco_nota: t.preco_nota ?? "",
      condominio_valor: reais(t.condominio_valor),
      esgotada: t.esgotada,
    })),
  );
  const [retiradas, setRetiradas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const campo = (k: keyof typeof f) => ({
    id: `e-${k}`,
    value: f[k] as string,
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((a) => ({ ...a, [k]: ev.target.value })),
  });
  const mudarTip = (i: number, x: Partial<LinhaTipologia>) => setTips((ts) => ts.map((t, j) => (j === i ? { ...t, ...x } : t)));
  const retirar = (i: number) => {
    const t = tips[i];
    if (t.id) setRetiradas((r) => [...r, t.id!]);
    setTips((ts) => ts.filter((_, j) => j !== i));
  };
  const nova = (): LinhaTipologia => ({
    rotulo: "", tipo: "apartamento", dormitorios: "", suites: "", vagas_min: "", vagas_max: "", area_m2: "", preco: "", preco_nota: "", condominio_valor: "", esgotada: false,
  });

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (!f.nome.trim()) return setErro("Preencha o nome.");
    const linhas = [];
    for (const [i, t] of tips.entries()) {
      if (!t.rotulo.trim()) return setErro(`Preencha o nome da tipologia ${i + 1}.`);
      const preco = t.preco.trim() ? lerReais(t.preco) : null;
      if (t.preco.trim() && !preco) return setErro(`Confira o preço da tipologia ${i + 1}: só números, como 344.800.`);
      const nums = [t.dormitorios, t.suites, t.vagas_min, t.vagas_max].map(inteiro);
      if (nums.some((n) => n != null && (!Number.isInteger(n) || n < 0)))
        return setErro(`Confira dormitórios, suítes e vagas da tipologia ${i + 1}: números inteiros.`);
      const area = decimal(t.area_m2), cond = decimal(t.condominio_valor);
      if ((area != null && !(area > 0)) || (cond != null && !(cond >= 0))) return setErro(`Confira a área e o condomínio da tipologia ${i + 1}.`);
      linhas.push({
        id: t.id, rotulo: t.rotulo.trim(), tipo: t.tipo, dormitorios: nums[0], suites: nums[1], vagas_min: nums[2], vagas_max: nums[3],
        area_m2: area, deposito: null, preco_a_partir_de: preco, preco_nota: vazio(t.preco_nota), condominio_valor: cond,
        iptu_valor: e?.tipologias.find((x) => x.id === t.id)?.iptu_valor ?? null, esgotada: t.esgotada, ordem: i + 1,
      });
    }
    const campos: CamposEmpreendimento = {
      slug: e?.slug ?? slugDoNome(f.nome),
      nome: f.nome.trim(),
      condominio: vazio(f.condominio),
      variacoes: f.variacoes.split(",").map((v) => v.trim()).filter(Boolean),
      pede_contexto: f.pede_contexto,
      marca: f.marca.trim() || "MBigucci",
      tipo: f.tipo,
      status: f.status,
      ativo: f.ativo,
      endereco: vazio(f.endereco),
      bairro: vazio(f.bairro),
      cidade: vazio(f.cidade),
      uf: e?.uf ?? "SP",
      entrega_prevista: f.entrega ? `${f.entrega}-01` : null,
      entrega_texto: vazio(f.entrega_texto),
      chamada: vazio(f.chamada),
      lazer: e?.lazer ?? [],
      tabela_mes: f.tabela_mes ? `${f.tabela_mes}-01` : null,
      restricao_renda: vazio(f.restricao_renda),
      observacao: vazio(f.observacao),
      avisos: e?.avisos ?? [],
      ordem: e?.ordem ?? 0,
      ...(Object.fromEntries(LINKS.map((l) => [l.k, vazio(f[l.k])])) as Record<ChaveLink, string | null>),
    };
    setSalvando(true);
    const r = await salvarEmpreendimento(campos, e?.id);
    if (r.erro || !r.id) {
      setSalvando(false);
      return setErro(r.erro);
    }
    const t = await salvarTipologias(r.id, linhas, retiradas);
    setSalvando(false);
    if (t.erro) return setErro(`O empreendimento foi salvo, mas as tipologias não: ${t.erro}`);
    router.push(`/empreendimentos/ver/?slug=${campos.slug}`);
  }

  return (
    <form onSubmit={salvar} className="grid max-w-[760px] gap-5 pb-24 md:pb-0">
      <Link href={e ? `/empreendimentos/ver/?slug=${e.slug}` : "/empreendimentos/"} className="focus-ring text-[13px] font-semibold text-ink-soft hover:text-ink">
        ← {e ? e.nome : "Catálogo"}
      </Link>

      <section className="card grid gap-3">
        <span className="eyebrow">{e ? "Editar empreendimento" : "Novo empreendimento"}</span>
        <div>
          <label className="field-label" htmlFor="e-nome">Nome</label>
          <input className="input" {...campo("nome")} placeholder="Mundi - Lucca" />
          {!e && f.nome.trim() && <p className="mt-1 text-[12px] text-concrete">Endereço da página: {slugDoNome(f.nome)}</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="e-condominio">Condomínio (torres com nome próprio)</label>
            <input className="input" {...campo("condominio")} placeholder="Mundi" />
          </div>
          <div>
            <label className="field-label" htmlFor="e-status">Fase</label>
            <select className="input" {...campo("status")}>
              {STATUS_EMPREENDIMENTO.map((s) => <option key={s.slug} value={s.slug}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="e-tipo">Tipo</label>
            <select className="input" {...campo("tipo")}>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="e-marca">Marca</label>
            <input className="input" {...campo("marca")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="checkbox" checked={f.ativo} onChange={(ev) => setF((a) => ({ ...a, ativo: ev.target.checked }))} />
          À venda (desmarque para tirar das listas sem apagar)
        </label>
      </section>

      <section className="card grid gap-3">
        <span className="eyebrow">Endereço e entrega</span>
        <div>
          <label className="field-label" htmlFor="e-endereco">Endereço (o do Linktree)</label>
          <input className="input" {...campo("endereco")} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="e-bairro">Bairro</label>
            <input className="input" {...campo("bairro")} />
          </div>
          <div>
            <label className="field-label" htmlFor="e-cidade">Cidade</label>
            <input className="input" {...campo("cidade")} />
          </div>
          <div>
            <label className="field-label" htmlFor="e-entrega">Entrega prevista (mês)</label>
            <input className="input" type="month" {...campo("entrega")} />
          </div>
          <div>
            <label className="field-label" htmlFor="e-entrega_texto">Entrega em texto (opcional)</label>
            <input className="input" {...campo("entrega_texto")} placeholder="36 meses após a assinatura" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="e-chamada">Chamada</label>
          <input className="input" {...campo("chamada")} />
        </div>
      </section>

      <section className="card grid gap-3">
        <span className="eyebrow">Links</span>
        <div className="grid gap-3 md:grid-cols-2">
          {LINKS.map((l) => (
            <div key={l.k}>
              <label className="field-label" htmlFor={`e-${l.k}`}>{l.rotulo}</label>
              <input className="input" type="url" inputMode="url" placeholder="https://" {...campo(l.k)} />
            </div>
          ))}
        </div>
      </section>

      <section className="card grid gap-3" aria-labelledby="tip-titulo">
        <span id="tip-titulo" className="eyebrow">Tipologias e preços</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="e-tabela_mes">Mês da tabela de preços</label>
            <input className="input" type="month" {...campo("tabela_mes")} />
          </div>
          <div>
            <label className="field-label" htmlFor="e-restricao_renda">Restrição de renda (opcional)</label>
            <input className="input" {...campo("restricao_renda")} placeholder="Renda familiar até 10 salários mínimos" />
          </div>
        </div>
        <p className="text-[12.5px] text-ink-soft">
          O preço é o menor da tabela do Linktree para a tipologia. O &quot;a partir de&quot; do empreendimento é calculado sozinho, sem as esgotadas.
        </p>
        <ol className="grid gap-3">
          {tips.map((t, i) => (
            <li key={t.id ?? `nova-${i}`} className="grid gap-2 rounded-sm border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Tipologia {i + 1}</span>
                <button type="button" className="focus-ring text-[13px] font-semibold text-ink-soft hover:text-brand" onClick={() => retirar(i)}>
                  ✕ Retirar
                </button>
              </div>
              <div>
                <label className="field-label" htmlFor={`t-rotulo-${i}`}>Nome</label>
                <input id={`t-rotulo-${i}`} className="input" value={t.rotulo} onChange={(ev) => mudarTip(i, { rotulo: ev.target.value })} placeholder="2 dorms · 48 m² · 1 vaga" />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="field-label" htmlFor={`t-tipo-${i}`}>Tipo</label>
                  <select id={`t-tipo-${i}`} className="input" value={t.tipo} onChange={(ev) => mudarTip(i, { tipo: ev.target.value as TipoTipologia })}>
                    {TIPOS_TIPOLOGIA.map((x) => <option key={x.slug} value={x.slug}>{x.nome}</option>)}
                  </select>
                </div>
                {([
                  ["dormitorios", "Dorms"],
                  ["suites", "Suítes"],
                  ["vagas_min", "Vagas"],
                  ["vagas_max", "Vagas (máx.)"],
                  ["area_m2", "Área m²"],
                  ["condominio_valor", "Condomínio R$"],
                ] as const).map(([k, rotulo]) => (
                  <div key={k}>
                    <label className="field-label" htmlFor={`t-${k}-${i}`}>{rotulo}</label>
                    <input id={`t-${k}-${i}`} className="input num" inputMode="decimal" value={t[k]} onChange={(ev) => mudarTip(i, { [k]: ev.target.value })} />
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor={`t-preco-${i}`}>Preço a partir de (R$)</label>
                  <input id={`t-preco-${i}`} className="input num" inputMode="decimal" value={t.preco} onChange={(ev) => mudarTip(i, { preco: ev.target.value })} placeholder="344.800" />
                </div>
                <div>
                  <label className="field-label" htmlFor={`t-nota-${i}`}>Nota do preço</label>
                  <input id={`t-nota-${i}`} className="input" value={t.preco_nota} onChange={(ev) => mudarTip(i, { preco_nota: ev.target.value })} placeholder="unid. 84 · tabela R$ 515.000" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="checkbox" checked={t.esgotada} onChange={(ev) => mudarTip(i, { esgotada: ev.target.checked })} />
                Esgotada
              </label>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-ghost focus-ring justify-self-start" onClick={() => setTips((ts) => [...ts, nova()])}>
          + Tipologia
        </button>
      </section>

      <section className="card grid gap-3">
        <span className="eyebrow">Cadastro Mágico e observação</span>
        <div>
          <label className="field-label" htmlFor="e-variacoes">Outras formas de escrever (separe por vírgula)</label>
          <input className="input" {...campo("variacoes")} placeholder="Mundi, Mundi Lucca" />
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="checkbox" checked={f.pede_contexto} onChange={(ev) => setF((a) => ({ ...a, pede_contexto: ev.target.checked }))} />
          O nome é palavra comum (como Life ou Dom): só vale com &quot;Residencial&quot; ou &quot;Empreendimento&quot; antes
        </label>
        <div>
          <label className="field-label" htmlFor="e-observacao">Observação interna</label>
          <textarea className="input min-h-[80px]" {...campo("observacao")} />
        </div>
      </section>

      {erro && <p className="aviso-erro" role="alert">✕ {erro}</p>}
      <RodapeAcao>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </RodapeAcao>
    </form>
  );
}
