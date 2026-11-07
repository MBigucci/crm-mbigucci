"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { subtituloParceiro } from "@/components/parceiros/card";
import { ComPermissao, SeloPrazo } from "@/components/parceiros/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import { novoId } from "@/lib/supabase";
import { lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";
import {
  chaveRascunhoEventoLote,
  criarBuscaParceiro,
  limitesDataEvento,
  ordenarParceiros,
} from "@/lib/parceiros";
import { registrarEventoLote, useCarteira } from "@/lib/parceiros-dados";

export default function EventoLotePage() {
  return (
    <Casca titulo="Registrar evento">
      <ComPermissao>
        <Evento />
      </ComPermissao>
    </Casca>
  );
}

type Rascunho = { resumo: string; dia: string; marcados: string[] };

/**
 * Evento em lote (parceiro_evento_lote): um café no decorado, uma convenção. Grava
 * uma interação "Evento" para cada parceiro marcado, que reinicia os 90 dias de
 * cada um. Só os próprios parceiros aparecem (o banco ignora os outros).
 */
function Evento() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const { lista, erro: erroLista, recarregar } = useCarteira();
  const [agora] = useState(() => new Date());
  const limites = limitesDataEvento(agora);
  const chave = chaveRascunhoEventoLote(eu.id);
  const [resumo, setResumo] = useState("");
  const [dia, setDia] = useState(limites.max);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState<number | null>(null);
  const lote = useRef<string | null>(null);
  const restaurado = useRef(false);

  useEffect(() => {
    const r = lerRascunho<Rascunho>(chave);
    if (r) {
      if (typeof r.resumo === "string") setResumo(r.resumo);
      if (typeof r.dia === "string") setDia(r.dia);
      if (Array.isArray(r.marcados)) setMarcados(r.marcados);
    }
    restaurado.current = true;
  }, [chave]);

  useEffect(() => {
    if (!restaurado.current) return;
    if (!resumo.trim() && !marcados.length) limparRascunho(chave);
    else salvarRascunho(chave, { resumo, dia, marcados } satisfies Rascunho);
  }, [chave, resumo, dia, marcados]);

  const meus = useMemo(
    () => ordenarParceiros((lista ?? []).filter((p) => p.gerente_id === eu.id), agora),
    [lista, eu.id, agora],
  );
  const visiveis = useMemo(() => meus.filter(criarBuscaParceiro(busca)), [meus, busca]);
  // Só conta os que ainda são do gerente (um marcado pode ter mudado de dono desde o rascunho).
  const validos = marcados.filter((id) => meus.some((p) => p.id === id));

  if (!pode("parceiros.cadastrar"))
    return (
      <div className="card max-w-[520px]">
        <p>! Seu perfil vê os parceiros, mas não registra eventos.</p>
      </div>
    );

  // Funcional: toques rápidos seguidos não se perdem.
  const alternar = (id: string) =>
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const todosVisiveis = visiveis.length > 0 && visiveis.every((p) => marcados.includes(p.id));
  const alternarTodos = () =>
    setMarcados((m) =>
      todosVisiveis ? m.filter((id) => !visiveis.some((p) => p.id === id)) : [...new Set([...m, ...visiveis.map((p) => p.id)])],
    );

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setFeito(null);
    if (!resumo.trim()) return setErro("Escreva o que foi o evento.");
    if (!dia || dia < limites.min || dia > limites.max) return setErro("O dia do evento vai de hoje até 30 dias atrás.");
    if (!validos.length) return setErro("Marque pelo menos um parceiro.");
    setSalvando(true);
    lote.current ??= novoId();
    const r = await registrarEventoLote(lote.current, resumo.trim(), dia, validos);
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    lote.current = null;
    limparRascunho(chave);
    setResumo("");
    setMarcados([]);
    setDia(limites.max);
    setFeito(r.registrados);
    // No celular o botão fica no rodapé: volta ao topo para ver a confirmação.
    window.scrollTo({ top: 0 });
    await recarregar();
  }

  return (
    <form onSubmit={salvar} className="grid max-w-[720px] gap-4 pb-24 md:pb-0" noValidate>
      <Link href="/parceiros/" className="focus-ring text-[13px] font-semibold text-ink-soft">
        ← Parceiros
      </Link>
      <p className="text-ink-soft">
        Um registro para cada parceiro que foi ao evento. Reinicia os 90 dias de cada um.
      </p>

      {feito !== null && (
        <div className="card" role="status">
          <p className="titulo-card">
            <span className="text-ok">✓</span> Evento registrado para <span className="num">{feito}</span>{" "}
            {feito === 1 ? "parceiro" : "parceiros"}
          </p>
        </div>
      )}

      <div className="card grid gap-3">
        <div>
          <label className="field-label" htmlFor="evento-resumo">
            O que foi
          </label>
          <textarea
            id="evento-resumo"
            className="input min-h-[72px]"
            placeholder="Ex.: Café no decorado do Residencial Aurora"
            maxLength={2000}
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
        </div>
        <div className="max-w-[240px]">
          <label className="field-label" htmlFor="evento-dia">
            Dia do evento
          </label>
          <input
            id="evento-dia"
            type="date"
            className="input num"
            min={limites.min}
            max={limites.max}
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        </div>
      </div>

      <section className="card" aria-labelledby="quem-foi">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="quem-foi" className="titulo-secao-antigo">
            Quem foi
          </h2>
          <span className="text-[13px] text-ink-soft">
            <span className="num">{validos.length}</span> de <span className="num">{meus.length}</span>
          </span>
        </div>
        {erroLista && <p className="aviso-erro mt-2">✕ {erroLista}</p>}
        {!lista && !erroLista && <p className="mt-2 text-concrete">Carregando…</p>}
        {lista && !meus.length && <p className="mt-2 text-ink-soft">Você ainda não tem parceiros.</p>}
        {meus.length > 0 && (
          <>
            <div className="mt-3">
              <label className="field-label" htmlFor="evento-busca">
                Buscar
              </label>
              <input
                id="evento-busca"
                className="input"
                type="search"
                placeholder="Nome, empresa, WhatsApp ou CRECI"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-ghost focus-ring mt-3" onClick={alternarTodos} disabled={!visiveis.length}>
              {todosVisiveis ? "Desmarcar todos" : busca.trim() ? "Marcar os encontrados" : "Marcar todos"}
            </button>
            <ul className="mt-2 divide-y divide-line">
              {visiveis.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      className="checkbox mt-[2px]"
                      checked={marcados.includes(p.id)}
                      onChange={() => alternar(p.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.nome}</span>
                      <span className="block truncate text-[13px] text-ink-soft">{subtituloParceiro(p)}</span>
                    </span>
                    <SeloPrazo faixa={p.faixa} dias={p.dias_prazo} estagio={p.estagio} />
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {erro && <p className="aviso-erro">✕ {erro}</p>}

      <RodapeAcao>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando
            ? "Salvando…"
            : validos.length
              ? `Registrar para ${validos.length} ${validos.length === 1 ? "parceiro" : "parceiros"}`
              : "Registrar evento"}
        </button>
      </RodapeAcao>
    </form>
  );
}
