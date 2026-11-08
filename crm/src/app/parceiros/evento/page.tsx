"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Casca } from "@/components/casca";
import { Cartao } from "@/components/alicerce/cartao";
import { BarraDeAcoes } from "@/components/alicerce/barra-de-acoes";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { useToast } from "@/components/alicerce/toast";
import { EscolherParceiros } from "@/components/parceiros/escolher-parceiros";
import { CabecalhoParceiros, ComPermissao } from "@/components/parceiros/partes";
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
    <Casca titulo="Registrar evento" migrada>
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
  const toast = useToast();
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
      <Aviso titulo="Seu perfil vê os parceiros, mas não registra eventos" texto="Peça o acesso ao gerente geral." />
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
    toast.mostrar(`Evento registrado para ${r.registrados} ${r.registrados === 1 ? "parceiro" : "parceiros"}.`, { tipo: "sucesso" });
    // No celular o botão fica no rodapé: volta ao topo para ver a confirmação.
    window.scrollTo({ top: 0 });
    await recarregar();
  }

  const botaoSalvar = <button type="submit" className="mb-botao mb-botao--primario" disabled={salvando} aria-busy={salvando}>{salvando ? "Registrando…" : validos.length ? `Registrar para ${validos.length} ${validos.length === 1 ? "parceiro" : "parceiros"}` : "Registrar evento"}</button>;
  return <form onSubmit={salvar} className="parcerias-formulario" noValidate>
    <CabecalhoParceiros titulo="Registrar evento" subtitulo="Um registro para cada participante. Reinicia os 90 dias de cada um." />
    <Cartao id="dados-evento" titulo="Dados do evento" rodape={<><Link href="/parceiros/" className="mb-botao mb-botao--discreto">Cancelar</Link>{botaoSalvar}</>} rodapeClasse="mb-so-computador">
      <div className="mb-form-secao parcerias-pilha">
        <Campo rotulo="O que foi" obrigatorio><textarea id="evento-resumo" className="mb-campo__entrada" rows={3} placeholder="Ex.: Café no decorado do Residencial Aurora" maxLength={2000} required value={resumo} onChange={(e) => setResumo(e.target.value)} /></Campo>
        <Campo rotulo="Dia do evento" obrigatorio><input id="evento-dia" type="date" className="mb-campo__entrada" min={limites.min} max={limites.max} required value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
      </div>
      {erroLista ? <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar os parceiros" texto="Tente de novo para escolher os participantes." acoes={<button type="button" className="mb-botao mb-botao--secundario" onClick={() => void recarregar()}>Tentar de novo</button>} /> : !lista ? <CarregandoLeads /> : !meus.length ? <EstadoVazio titulo="Você ainda não tem parceiros" texto="Os seus parceiros aparecerão aqui para registrar a participação." /> : <EscolherParceiros itens={visiveis} total={meus.length} marcados={marcados} validos={validos.length} busca={busca} setBusca={setBusca} alternar={alternar} alternarTodos={alternarTodos} todosVisiveis={todosVisiveis} />}
      {erro && <Aviso tom="erro" titulo="Não foi possível registrar o evento" texto={erro} />}
    </Cartao>
    <BarraDeAcoes>{botaoSalvar}</BarraDeAcoes>
  </form>;
}
