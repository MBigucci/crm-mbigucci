"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { ConfirmarNaLinha } from "@/components/alicerce/confirmar-na-linha";
import { useToast } from "@/components/alicerce/toast";
import { MesPrograma } from "@/components/programa/pecas";
import { CabecalhoAdmin, ErroAdmin, erroAdmin, moedaAdmin as formatarReais } from "@/components/administracao/partes";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_FAIXA, faixasDoMes, mesSeguinte, type Faixa } from "@/lib/faixas";
import { lerReais } from "@/lib/vendas";
import { useNomes, useVendas } from "@/lib/vendas-dados";

/**
 * Faixas de VGV do mês: tela só do gerente geral (regra fixa no banco). O
 * título, a descrição e o nome da coluna vêm de app_settings, que só ele lê.
 */
export default function FaixasPage() {
  return (
    <Casca titulo="Faixas de VGV" soGerenteGeral migrada>
      <Faixas />
    </Casca>
  );
}

type Textos = { rotulo: string; descricao: string; coluna: string };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

function Faixas() {
  const [textos, setTextos] = useState<Textos | null>(null);
  const [faixas, setFaixas] = useState<Faixa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = new Date();
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });

  const carregar = useCallback(async () => {
    setErro(null);
    const [t, f] = await Promise.all([
      db().from("app_settings").select("rotulo, descricao, valor").eq("chave", "faixas_vgv").maybeSingle(),
      db().from("faixas_vgv").select(COLUNAS_FAIXA).order("vgv_minimo"),
    ]);
    if (t.error || f.error) return setErro(mensagemErro(t.error ?? f.error));
    const valor = (t.data?.valor ?? {}) as { coluna?: string };
    setTextos({ rotulo: t.data?.rotulo ?? "Faixas de VGV", descricao: t.data?.descricao ?? "", coluna: valor.coluna ?? "Valor" });
    setFaixas((f.data ?? []) as Faixa[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const prox = mesSeguinte(mes.ano, mes.mes);
  const { vendas, erro: erroVendas } = useVendas(`${mes.ano}-${dd(mes.mes + 1)}-01`, `${prox.ano}-${dd(prox.mes + 1)}-01`);
  const linhas = vendas && faixas ? [...faixasDoMes(vendas, faixas, mes.ano, mes.mes).values()] : null;
  const nomes = useNomes((linhas ?? []).map((l) => l.corretor));
  const ordenadas = (linhas ?? []).sort((a, b) => b.vgvValido - a.vgvValido || (nomes.get(a.corretor) ?? "").localeCompare(nomes.get(b.corretor) ?? "", "pt-BR"));
  const total = ordenadas.reduce((s, l) => s + Number(l.faixa?.valor ?? 0), 0);
  if (erro) return <ErroAdmin tentar={() => void carregar()} />;
  if (!textos || !faixas) return <CarregandoTabela texto="Carregando faixas…" />;
  return <div className="admin-pilha">
    <CabecalhoAdmin titulo={textos.rotulo} descricao={textos.descricao} />
    <MesPrograma valor={mes} onMudar={setMes} permitirFuturo />
    <Cartao id="t-faixas" titulo="Por corretor" descricao={`Vendas assinadas no mês · liberação em ${MESES[prox.mes]} de ${prox.ano}`}>{erroVendas ? <ErroAdmin tentar={() => location.reload()} /> : !linhas ? <CarregandoTabela texto="Carregando vendas…" /> : !ordenadas.length ? <EstadoVazio titulo="Nenhuma venda assinada neste mês" texto="As vendas aparecem pelo mês da assinatura." /> : <div className="mb-tabela-envoltorio" tabIndex={0} role="region" aria-label="Valores por corretor. Role para ver as colunas.">
      <table className="mb-tabela mb-tabela--numeros mb-tabela--primeira-fixa">
        <thead>
          <tr>
            <th scope="col">Corretor</th>
            <th scope="col">Assinado e pago</th>
            <th scope="col">{textos.coluna}</th>
            <th scope="col">Faixa atingida</th>
            <th scope="col">Assinado, com pendentes</th>
          </tr>
        </thead>
        <tbody>{ordenadas.map(l =>
          <tr key={l.corretor}>
            <td>{nomes.get(l.corretor) ?? "Corretor"}</td>
            <td className="mb-tabela__num">{formatarReais(l.vgvValido)}</td>
            <td className="mb-tabela__num">{l.faixa ? formatarReais(Number(l.faixa.valor)) : "–"}</td>
            <td className="mb-tabela__num">{l.faixa ? `A partir de ${formatarReais(Number(l.faixa.vgv_minimo))}` : "Abaixo da primeira"}</td>
            <td className="mb-tabela__num">{formatarReais(l.vgvAssinado)}</td>
          </tr>)}</tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>Total</th>
            <td className="mb-tabela__num">{formatarReais(total)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>}</Cartao>
    <EditarFaixas faixas={faixas} coluna={textos.coluna} onMudou={carregar} />
  </div>;
}

/** A tabela de faixas: cada linha é "a partir de" e o valor. Vale a mais alta atingida. */
function EditarFaixas({ faixas, coluna, onMudou }: { faixas: Faixa[]; coluna: string; onMudou: () => void }) {
  const [nova, setNova] = useState(false);
  return <Cartao id="editar-faixas" titulo="Faixas" descricao="Vale a mais alta atingida; os valores não se acumulam." acao={!nova && <button className="mb-botao mb-botao--secundario" onClick={() => setNova(true)}>Adicionar faixa</button>}>
    {!faixas.length && !nova && <EstadoVazio titulo="Nenhuma faixa cadastrada" texto="Adicione a primeira faixa para começar." />}<ul className="mb-repetivel">{faixas.map(f =>
      <li key={f.id}>
        <LinhaFaixa faixa={f} coluna={coluna} onMudou={onMudou} />
      </li>)}{nova && <li>
        <LinhaFaixa coluna={coluna} onCancelar={() => setNova(false)} onMudou={() => { setNova(false); onMudou(); }} />
      </li>}</ul>
  </Cartao>;
}

function LinhaFaixa({ faixa, coluna, onMudou, onCancelar }: { faixa?: Faixa; coluna: string; onMudou: () => void; onCancelar?: () => void }) {
  const toast = useToast(); const remover = useRef<HTMLButtonElement>(null); const [confirmando, setConfirmando] = useState(false); const [ocupado, setOcupado] = useState(false);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [minimo, setMinimo] = useState(faixa ? fmt(Number(faixa.vgv_minimo)) : "");
  const [valor, setValor] = useState(faixa ? fmt(Number(faixa.valor)) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const id = faixa?.id ?? "nova";

  async function salvar() {
    const m = lerReais(minimo);
    const v = valor.trim() === "0" ? 0 : lerReais(valor);
    if (!m) return setErro("Confira o VGV mínimo: só números, como 1.000.000.");
    if (v === null) return setErro(`Confira o campo ${coluna}: só números, como 2.000.`);
    const campos = { vgv_minimo: m, valor: v };
    setOcupado(true);
    const r = faixa ? await db().from("faixas_vgv").update(campos).eq("id", faixa.id) : await db().from("faixas_vgv").insert(campos);
    setOcupado(false);
    if (r.error) return setErro(r.error.message.includes("vgv_minimo") ? "Já existe uma faixa com esse VGV mínimo." : mensagemErro(r.error));
    setErro(null);
    setOk(true);
    onMudou();
  }
  async function excluir() {
    if (!faixa) return;
    setOcupado(true);
    const { error } = await db().from("faixas_vgv").delete().eq("id", faixa.id);
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    toast.mostrar("Faixa removida.", { tipo: "sucesso" }); onMudou();
  }

  const mudou = !faixa || lerReais(minimo) !== Number(faixa.vgv_minimo) || (valor.trim() === "0" ? 0 : lerReais(valor)) !== Number(faixa.valor);
  return <div className="admin-faixa">
    <div className="mb-repetivel__linha admin-faixa__campos">
      <label className="mb-campo">
        <span className="mb-campo__rotulo">VGV no mês a partir de</span>
        <span className="mb-campo__grupo">
          <span className="mb-campo__afixo">R$</span>
          <input id={`min-${id}`} className="mb-campo__entrada mb-campo__entrada--num" inputMode="decimal" value={minimo} onChange={e => { setMinimo(e.target.value); setOk(false); }} />
        </span>
      </label>
      <label className="mb-campo">
        <span className="mb-campo__rotulo">{coluna}</span>
        <span className="mb-campo__grupo">
          <span className="mb-campo__afixo">R$</span>
          <input id={`val-${id}`} className="mb-campo__entrada mb-campo__entrada--num" inputMode="decimal" value={valor} onChange={e => { setValor(e.target.value); setOk(false); }} />
        </span>
      </label>
      <div className="mb-grupo-botoes">{mudou && <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void salvar()}>{ocupado ? "Salvando…" : faixa ? "Salvar faixa" : "Criar faixa"}</button>}{faixa && !confirmando && <button ref={remover} className="mb-botao mb-botao--discreto" onClick={() => setConfirmando(true)}>Remover faixa</button>}{onCancelar && <button className="mb-botao mb-botao--discreto" onClick={onCancelar}>Cancelar</button>}</div>
    </div>
    {confirmando && <ConfirmarNaLinha pergunta="Remover esta faixa?" efeito="Ela deixa de participar do cálculo por VGV. A remoção não pode ser desfeita." verbo="Remover faixa" ocupado={ocupado} onConfirmar={() => void excluir()} onCancelar={() => { setConfirmando(false); requestAnimationFrame(() => remover.current?.focus()); }} />}
    {ok && <span className="mb-salvo mb-salvo--ok" role="status">✓ Faixa salva</span>}{erro && <Aviso tom="erro" titulo={erroAdmin(erro)} />}
  </div>;
}
