"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { CardEmpreendimento } from "@/components/empreendimentos/partes";
import {
  ehLancamento,
  FAIXAS_PRECO,
  filtrarCatalogo,
  FILTROS_VAZIOS,
  opcoesLocal,
  STATUS_EMPREENDIMENTO,
  type FiltrosCatalogo,
  type StatusEmpreendimento,
} from "@/lib/catalogo";
import { useCatalogo, useLeadsDoRadar } from "@/lib/catalogo-dados";
import { clientesCompativeis } from "@/lib/match";
import { useSessao } from "@/lib/sessao";

export default function EmpreendimentosPage() {
  return (
    <Casca titulo="Empreendimentos">
      <Catalogo />
    </Casca>
  );
}

function Catalogo() {
  const { pode } = useSessao();
  const gerencia = pode("empreendimentos.gerenciar");
  const temLeads = pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos");
  const { catalogo, erro } = useCatalogo();
  const leads = useLeadsDoRadar(temLeads);
  const [f, setF] = useState<FiltrosCatalogo>(FILTROS_VAZIOS);
  const mudar = (x: Partial<FiltrosCatalogo>) => setF((a) => ({ ...a, ...x }));
  const agora = useMemo(() => new Date(), []);

  const lista = useMemo(() => filtrarCatalogo(catalogo ?? [], f), [catalogo, f]);
  const locais = useMemo(() => opcoesLocal(catalogo ?? []), [catalogo]);
  // Lançamentos: quantos clientes de quem vê, aguardando lançamento, combinam.
  const aguardando = useMemo(() => {
    const m = new Map<string, number>();
    if (!leads?.length) return m;
    for (const e of catalogo ?? []) {
      if (!e.ativo || !ehLancamento(e)) continue;
      const n = clientesCompativeis(e, leads, agora).filter((c) => c.destaque).length;
      if (n) m.set(e.id, n);
    }
    return m;
  }, [catalogo, leads, agora]);
  const filtrando = JSON.stringify(f) !== JSON.stringify(FILTROS_VAZIOS);

  return (
    <div className="grid gap-5 pb-20 md:pb-0">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full md:w-auto md:min-w-[240px] md:flex-[2]">
          <label className="field-label" htmlFor="busca">
            Buscar
          </label>
          <input
            id="busca"
            className="input"
            type="search"
            placeholder="Nome, bairro ou cidade"
            value={f.busca}
            onChange={(e) => mudar({ busca: e.target.value })}
          />
        </div>
        <div className="min-w-[140px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-status">
            Fase
          </label>
          <select
            id="filtro-status"
            className="input"
            value={f.status}
            onChange={(e) => mudar({ status: e.target.value as StatusEmpreendimento | "" })}
          >
            <option value="">Todas</option>
            {STATUS_EMPREENDIMENTO.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-local">
            Cidade e bairro
          </label>
          <select id="filtro-local" className="input md:max-w-[240px]" value={f.local} onChange={(e) => mudar({ local: e.target.value })}>
            <option value="">Todos</option>
            {locais.map((l) => (
              <optgroup key={l.cidade} label={l.cidade}>
                <option value={l.cidade}>Toda {l.cidade}</option>
                {l.bairros.map((b) => (
                  <option key={b} value={`${l.cidade}|${b}`}>
                    {b}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="min-w-[120px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-dorms">
            Dormitórios
          </label>
          <select id="filtro-dorms" className="input" value={f.dormitorios} onChange={(e) => mudar({ dormitorios: e.target.value })}>
            <option value="">Todos</option>
            <option value="1">1 ou studio</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4 ou mais</option>
          </select>
        </div>
        <div className="min-w-[160px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-faixa">
            Faixa de preço
          </label>
          <select id="filtro-faixa" className="input" value={f.faixa} onChange={(e) => mudar({ faixa: e.target.value })}>
            <option value="">Todas</option>
            {FAIXAS_PRECO.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.nome}
              </option>
            ))}
          </select>
        </div>
        {gerencia && (
          <label className="flex min-h-[44px] items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" className="checkbox" checked={f.inativos} onChange={(e) => mudar({ inativos: e.target.checked })} />
            Mostrar os fora de venda
          </label>
        )}
      </div>

      {erro && <p className="aviso-erro">! Não foi possível carregar o catálogo. {erro}</p>}
      {!catalogo && <p className="text-concrete">Carregando…</p>}
      {catalogo && !erro && catalogo.length === 0 && (
        <div className="card max-w-[560px]">
          <p className="text-ink-soft">
            O catálogo está vazio. {gerencia ? "Cadastre o primeiro empreendimento ou rode a carga inicial no Supabase." : "Fale com o gerente geral."}
          </p>
        </div>
      )}
      {catalogo && catalogo.length > 0 && !lista.length && (
        <p className="text-ink-soft">
          Nenhum empreendimento com esses filtros.{" "}
          <button type="button" className="link-acao focus-ring" onClick={() => setF(FILTROS_VAZIOS)}>
            Limpar filtros
          </button>
        </p>
      )}

      {lista.length > 0 && (
        <section aria-labelledby="lista">
          <h2 id="lista" className="eyebrow mb-2">
            {filtrando ? "Encontrados" : "Todos à venda"} · <span className="num">{lista.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {lista.map((e) => (
              <CardEmpreendimento key={e.id} e={e} agora={agora} aguardando={aguardando.get(e.id)} />
            ))}
          </ul>
        </section>
      )}

      {gerencia && (
        <RodapeAcao>
          <Link href="/empreendimentos/editar/" className="btn btn-red btn-lg focus-ring">
            + Novo empreendimento
          </Link>
        </RodapeAcao>
      )}
    </div>
  );
}
