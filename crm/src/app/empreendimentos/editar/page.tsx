"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { FASES } from "@/components/empreendimentos/catalogo-alicerce";
import { slugDoNome, STATUS_EMPREENDIMENTO, TIPOS_TIPOLOGIA, type Empreendimento, type StatusEmpreendimento, type TipoTipologia } from "@/lib/catalogo";
import { salvarEmpreendimento, salvarTipologias, useCatalogo, type CamposEmpreendimento } from "@/lib/catalogo-dados";
import { lerReais } from "@/lib/vendas";

export default function EditarEmpreendimentoPage() {
  return (
    <Casca titulo="Empreendimento" exige="empreendimentos.gerenciar" migrada>
      <Suspense fallback={<CarregandoTabela texto="Carregando empreendimento…" />}>
        <PeloEndereco />
      </Suspense>
    </Casca>
  );
}

function PeloEndereco() {
  const slug = useSearchParams().get("slug");
  const { catalogo, erro } = useCatalogo();
  if (erro) return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar o empreendimento" texto="Tente de novo. O que já foi salvo continua salvo." acoes={<button className="mb-botao mb-botao--primario" onClick={() => location.reload()}>Tentar de novo</button>} />;
  if (!catalogo) return <CarregandoTabela texto="Carregando empreendimento…" />;
  const e = slug ? catalogo.find((x) => x.slug === slug) : undefined;
  if (slug && !e) return <EstadoDePagina tipo="nao-encontrado" titulo="Empreendimento não encontrado" texto="Volte ao catálogo e escolha outro empreendimento." acoes={<Link className="mb-botao mb-botao--secundario" href="/empreendimentos/">Voltar ao catálogo</Link>} />;
  return <Formulario key={e?.id ?? "novo"} e={e} />;
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
  const toast = useToast();
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

  // Rascunho local: o envio ao banco continua explícito, como na edição anterior.
  const chave = `empreendimento-rascunho:${e?.slug ?? "novo"}`;
  const [pronto, setPronto] = useState(false);
  const [rascunho, setRascunho] = useState("");
  useEffect(() => { try { const r = JSON.parse(sessionStorage.getItem(chave) ?? "null"); if (r) { setF(r.f); setTips(r.tips); setRetiradas(r.retiradas); } } catch { } setPronto(true); }, [chave]);
  useEffect(() => { if (!pronto) return; try { sessionStorage.setItem(chave, JSON.stringify({ f, tips, retiradas })); setRascunho(`Rascunho guardado neste aparelho às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`); } catch { setRascunho("Não foi possível guardar o rascunho neste aparelho. Mantenha esta página aberta."); } }, [pronto, chave, f, tips, retiradas]);
  function falhar(texto: string, id: string) { setErro(texto); requestAnimationFrame(() => document.getElementById(id)?.focus()); }
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
    toast.mostrar("Tipologia retirada do rascunho. Salve o empreendimento para aplicar.", { tipo: "sucesso", aoDesfazer: () => { setTips(ts => [...ts.slice(0, i), t, ...ts.slice(i)]); if (t.id) setRetiradas(r => r.filter(id => id !== t.id)); } });
  };
  const nova = (): LinhaTipologia => ({
    rotulo: "", tipo: "apartamento", dormitorios: "", suites: "", vagas_min: "", vagas_max: "", area_m2: "", preco: "", preco_nota: "", condominio_valor: "", esgotada: false,
  });

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (!f.nome.trim()) return falhar("Preencha o nome.", "e-nome");
    // O envio manual continua respeitando as validações nativas de URL e mês.
    if (!(ev.currentTarget as HTMLFormElement).reportValidity()) return;
    const linhas = [];
    for (const [i, t] of tips.entries()) {
      if (!t.rotulo.trim()) return falhar(`Preencha o nome da tipologia ${i + 1}.`, `t-rotulo-${i}`);
      const preco = t.preco.trim() ? lerReais(t.preco) : null;
      if (t.preco.trim() && !preco) return falhar(`Confira o preço da tipologia ${i + 1}: só números, como 344.800.`, `t-preco-${i}`);
      const nums = [t.dormitorios, t.suites, t.vagas_min, t.vagas_max].map(inteiro);
      if (nums.some((n) => n != null && (!Number.isInteger(n) || n < 0)))
        return falhar(`Confira dormitórios, suítes e vagas da tipologia ${i + 1}: números inteiros.`, `t-dormitorios-${i}`);
      const area = decimal(t.area_m2), cond = decimal(t.condominio_valor);
      if ((area != null && !(area > 0)) || (cond != null && !(cond >= 0))) return falhar(`Confira a área e o condomínio da tipologia ${i + 1}.`, `t-area_m2-${i}`);
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
    toast.fechar();
    setSalvando(true);
    const r = await salvarEmpreendimento(campos, e?.id);
    if (r.erro || !r.id) {
      setSalvando(false);
      return setErro(r.erro);
    }
    const t = await salvarTipologias(r.id, linhas, retiradas);
    setSalvando(false);
    if (t.erro) return setErro(`O empreendimento foi salvo, mas as tipologias não: ${t.erro}`);
    try { sessionStorage.removeItem(chave); } catch { }
    router.push(`/empreendimentos/ver/?slug=${campos.slug}`);
  }

  return (
    <div className="pagina-alicerce programa-pilha">
      <nav aria-label="Caminho">
        <ol className="mb-trilha">
          <li>
            <Link href="/empreendimentos/">Empreendimentos</Link>
          </li>{e && <>
            <li>
              <Link href={`/empreendimentos/ver/?slug=${e.slug}`}>{e.nome}</Link>
            </li>
          </>}<li aria-current="page">{e ? "Editar" : "Novo empreendimento"}</li>
        </ol>
      </nav>
      <header className="mb-cabecalho">
        <div className="mb-cabecalho__texto">
          <h1 className="titulo-tela">{e ? "Editar empreendimento" : "Novo empreendimento"}</h1>
        </div>
      </header>
      <form noValidate onSubmit={salvar} className="mb-cartao empreendimento-formulario">
        <header className="mb-cartao__cabecalho">
          <h2 className="mb-cartao__titulo">{e?.nome ?? "Dados do empreendimento"}</h2>
          <span className="mb-salvo" role="status">{salvando ? "Salvando…" : erro ? "! Não foi salvo" : rascunho}</span>
        </header>
        <div className="mb-cartao__corpo grid gap-6">
          <section className="mb-form-secao">
            <span className="mb-form-secao__titulo">{e ? "Editar empreendimento" : "Novo empreendimento"}</span>
            <div className="mb-campo">
              <label className="mb-campo__rotulo" htmlFor="e-nome">Nome <span className="mb-campo__obrigatorio" aria-hidden="true">*</span>
              </label>
              <input required className="mb-campo__entrada" {...campo("nome")} placeholder="Mundi - Lucca" />
              {!e && f.nome.trim() && <p className="mb-campo__ajuda">Endereço da página: {slugDoNome(f.nome)}</p>}
            </div>
            <div className="mb-form-grade mb-form-grade--3">
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-condominio">Condomínio (torres com nome próprio)</label>
                <input className="mb-campo__entrada" {...campo("condominio")} placeholder="Mundi" />
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-status">Fase</label>
                <span className="mb-campo__selecao">
                  <select className="mb-campo__entrada" {...campo("status")}>
                    {STATUS_EMPREENDIMENTO.map((s) => <option key={s.slug} value={s.slug}>{FASES[s.slug].nome}</option>)}
                  </select>
                </span>
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-tipo">Tipo</label>
                <span className="mb-campo__selecao">
                  <select className="mb-campo__entrada" {...campo("tipo")}>
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                  </select>
                </span>
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-marca">Marca</label>
                <input className="mb-campo__entrada" {...campo("marca")} />
              </div>
            </div>
            <label className="mb-marcador">
              <input type="checkbox" checked={f.ativo} onChange={(ev) => setF((a) => ({ ...a, ativo: ev.target.checked }))} />
              À venda (desmarque para tirar das listas sem apagar)
            </label>
          </section>

          <section className="mb-form-secao">
            <span className="mb-form-secao__titulo">Endereço e entrega</span>
            <div className="mb-campo">
              <label className="mb-campo__rotulo" htmlFor="e-endereco">Endereço</label>
              <input className="mb-campo__entrada" {...campo("endereco")} />
            </div>
            <div className="mb-form-grade mb-form-grade--3">
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-bairro">Bairro</label>
                <input className="mb-campo__entrada" {...campo("bairro")} />
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-cidade">Cidade</label>
                <input className="mb-campo__entrada" {...campo("cidade")} />
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-entrega">Entrega prevista (mês)</label>
                <input className="mb-campo__entrada" type="month" {...campo("entrega")} />
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-entrega_texto">Entrega em texto (opcional)</label>
                <input className="mb-campo__entrada" {...campo("entrega_texto")} placeholder="36 meses após a assinatura" />
              </div>
            </div>
            <div className="mb-campo">
              <label className="mb-campo__rotulo" htmlFor="e-chamada">Chamada</label>
              <input className="mb-campo__entrada" {...campo("chamada")} />
            </div>
          </section>

          <section className="mb-form-secao">
            <span className="mb-form-secao__titulo">Links</span>
            <div className="mb-form-grade mb-form-grade--3">
              {LINKS.map((l) => (
                <div key={l.k} className="mb-campo">
                  <label className="mb-campo__rotulo" htmlFor={`e-${l.k}`}>{l.rotulo}</label>
                  <input className="mb-campo__entrada" type="url" inputMode="url" placeholder="https://" {...campo(l.k)} />
                </div>
              ))}
            </div>
          </section>

          <section className="mb-form-secao" aria-labelledby="tip-titulo">
            <span id="tip-titulo" className="mb-form-secao__titulo">Tipologias e preços</span>
            <div className="mb-form-grade mb-form-grade--3">
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-tabela_mes">Mês da tabela de preços</label>
                <input className="mb-campo__entrada" type="month" {...campo("tabela_mes")} />
              </div>
              <div className="mb-campo">
                <label className="mb-campo__rotulo" htmlFor="e-restricao_renda">Restrição de renda (opcional)</label>
                <input className="mb-campo__entrada" {...campo("restricao_renda")} placeholder="Renda familiar até 10 salários mínimos" />
              </div>
            </div>
            <p className="mb-campo__ajuda">
              O preço é o menor da tabela do Linktree para a tipologia. O &quot;a partir de&quot; do empreendimento é calculado sozinho, sem as esgotadas.
            </p>
            <ol className="grid gap-3">
              {tips.map((t, i) => (
                <li key={t.id ?? `nova-${i}`} className="mb-form-secao">
                  <div className="flex items-center justify-between gap-2">
                    <span className="mb-form-secao__titulo">Tipologia {i + 1}</span>
                    <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={() => retirar(i)}>
                      Retirar tipologia
                    </button>
                  </div>
                  <div className="mb-campo">
                    <label className="mb-campo__rotulo" htmlFor={`t-rotulo-${i}`}>Nome</label>
                    <input id={`t-rotulo-${i}`} className="mb-campo__entrada" value={t.rotulo} onChange={(ev) => mudarTip(i, { rotulo: ev.target.value })} placeholder="2 dorms · 48 m² · 1 vaga" />
                  </div>
                  <div className="mb-form-grade mb-form-grade--3">
                    <div className="mb-campo">
                      <label className="mb-campo__rotulo" htmlFor={`t-tipo-${i}`}>Tipo</label>
                      <span className="mb-campo__selecao">
                        <select id={`t-tipo-${i}`} className="mb-campo__entrada" value={t.tipo} onChange={(ev) => mudarTip(i, { tipo: ev.target.value as TipoTipologia })}>
                          {TIPOS_TIPOLOGIA.map((x) => <option key={x.slug} value={x.slug}>{x.nome}</option>)}
                        </select>
                      </span>
                    </div>
                    {([
                      ["dormitorios", "Dormitórios"],
                      ["suites", "Suítes"],
                      ["vagas_min", "Vagas"],
                      ["vagas_max", "Vagas (máx.)"],
                      ["area_m2", "Área m²"],
                      ["condominio_valor", "Condomínio (R$)"],
                    ] as const).map(([k, rotulo]) => (
                      <div key={k} className="mb-campo">
                        <label className="mb-campo__rotulo" htmlFor={`t-${k}-${i}`}>{rotulo}</label>
                        <input id={`t-${k}-${i}`} className="mb-campo__entrada mb-campo__entrada--num" inputMode="decimal" value={t[k]} onChange={(ev) => mudarTip(i, { [k]: ev.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div className="mb-form-grade mb-form-grade--3">
                    <div className="mb-campo">
                      <label className="mb-campo__rotulo" htmlFor={`t-preco-${i}`}>Preço a partir de (R$)</label>
                      <input id={`t-preco-${i}`} className="mb-campo__entrada mb-campo__entrada--num" inputMode="decimal" value={t.preco} onChange={(ev) => mudarTip(i, { preco: ev.target.value })} placeholder="344.800" />
                    </div>
                    <div className="mb-campo">
                      <label className="mb-campo__rotulo" htmlFor={`t-nota-${i}`}>Nota do preço</label>
                      <input id={`t-nota-${i}`} className="mb-campo__entrada" value={t.preco_nota} onChange={(ev) => mudarTip(i, { preco_nota: ev.target.value })} placeholder="unid. 84 · tabela R$ 515.000" />
                    </div>
                  </div>
                  <label className="mb-marcador">
                    <input type="checkbox" checked={t.esgotada} onChange={(ev) => mudarTip(i, { esgotada: ev.target.checked })} />
                    Esgotada
                  </label>
                </li>
              ))}
            </ol>
            <button type="button" className="mb-botao mb-botao--secundario justify-self-start" onClick={() => setTips((ts) => [...ts, nova()])}>
              Adicionar tipologia
            </button>
          </section>

          <section className="mb-form-secao">
            <span className="mb-form-secao__titulo">Cadastro Mágico e observação</span>
            <div className="mb-campo">
              <label className="mb-campo__rotulo" htmlFor="e-variacoes">Outras formas de escrever (separe por vírgula)</label>
              <input className="mb-campo__entrada" {...campo("variacoes")} placeholder="Mundi, Mundi Lucca" />
            </div>
            <label className="mb-marcador">
              <input type="checkbox" checked={f.pede_contexto} onChange={(ev) => setF((a) => ({ ...a, pede_contexto: ev.target.checked }))} />
              O nome é palavra comum (como Life ou Dom): só vale com &quot;Residencial&quot; ou &quot;Empreendimento&quot; antes
            </label>
            <div className="mb-campo">
              <label className="mb-campo__rotulo" htmlFor="e-observacao">Observação interna</label>
              <textarea className="mb-campo__entrada" {...campo("observacao")} />
            </div>
          </section>

          {erro && <Aviso tom="erro" titulo={erro} texto="O rascunho continua neste aparelho. Confira os campos e tente salvar de novo." />}
        </div>
        <footer className="mb-barra-acoes mb-barra-acoes--unica">
          <div className="mb-barra-acoes__resumo">
            <span className="mb-barra-acoes__rotulo">{tips.length} tipologias · {retiradas.length} retiradas</span>
            <span className="mb-barra-acoes__estado">{salvando ? "Salvando…" : erro ? "! Não foi salvo" : "Envie para atualizar o catálogo"}</span>
          </div>
          <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar empreendimento"}
          </button>
        </footer>
      </form>
    </div>
  );
}
