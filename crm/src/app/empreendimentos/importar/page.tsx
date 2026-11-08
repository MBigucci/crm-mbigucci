"use client";

// Importar a tabela de preços por IA externa (item 16), como a "Resposta de
// outra IA" do CRM da Bruna: copiar as instruções, colar a resposta, conferir
// a prévia e aplicar. Sem chave de API. Regras em docs/empreendimentos.md, seção 13.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Casca } from "@/components/casca";
import { Cartao } from "@/components/alicerce/cartao";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { Selo } from "@/components/alicerce/selo";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { useToast } from "@/components/alicerce/toast";
import { ConfirmarImportacao } from "@/components/empreendimentos/confirmar-importacao";
import { aplicarImportacao, useCatalogo } from "@/lib/catalogo-dados";
import {
  contarPlano,
  instrucoesImportacao,
  lerImportacao,
  planejarImportacao,
  resumoDoItem,
  type ItemPlano,
  type Leitura,
} from "@/lib/importar-tabela";

export default function ImportarTabelaPage() {
  return (
    <Casca titulo="Importar tabela de preços" exige="empreendimentos.gerenciar" migrada>
      <Importar />
    </Casca>
  );
}

function Importar() {
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const fecharConfirmacao = useCallback(() => setConfirmando(false), []);
  const acao = useRef<HTMLButtonElement>(null);
  const focoAcao = useCallback(() => acao.current, []);
  const [pronto, setPronto] = useState(false);
  const { catalogo, erro: erroCatalogo, recarregar } = useCatalogo();
  const [texto, setTexto] = useState("");
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<{ feitos: string[]; erros: string[] } | null>(null);

  useEffect(() => { try { setTexto(sessionStorage.getItem("importacao-tabela-rascunho") ?? ""); } catch { } setPronto(true); }, []);
  useEffect(() => { if (pronto) try { sessionStorage.setItem("importacao-tabela-rascunho", texto); } catch { } }, [texto, pronto]);
  const instrucoes = useMemo(() => (catalogo ? instrucoesImportacao(catalogo, new Date()) : ""), [catalogo]);
  const plano = useMemo(() => (leitura?.ok && catalogo ? planejarImportacao(leitura.dados, catalogo) : null), [leitura, catalogo]);
  const conta = plano ? contarPlano(plano) : null;
  const aAplicar = conta ? conta.atualiza + conta.novos : 0;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(instrucoes);
      setCopiado(true);
    } catch {
      baixar();
    }
  }

  function baixar() {
    const url = URL.createObjectURL(new Blob([instrucoes], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabela-de-precos-mbigucci.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function conferir(t = texto) {
    setResultado(null);
    setLeitura(lerImportacao(t));
  }

  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    const t = await arquivo.text();
    setTexto(t);
    conferir(t);
  }

  async function aplicar() {
    if (!plano) return;
    setAplicando(true);
    let r: { feitos: string[]; erros: string[] };
    try { r = await aplicarImportacao(plano); } finally { setAplicando(false); }
    if (r.feitos.length) toast.mostrar(`${r.feitos.length} empreendimentos atualizados.`, { tipo: "sucesso" });
    setResultado(r);
    setLeitura(null);
    if (!r.erros.length) setTexto("");
    recarregar();
  }

  if (erroCatalogo) return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar o catálogo" texto="Tente de novo para conferir a tabela." acoes={<button className="mb-botao mb-botao--primario" onClick={recarregar}>Tentar de novo</button>} />;
  if (!catalogo) return <CarregandoTabela texto="Carregando catálogo…" />;
  const passo = resultado || confirmando ? 3 : plano ? 2 : 1;
  const nomes = ["Enviar a resposta", "Conferir a prévia", "Aplicar no catálogo"];
  return <div className="pagina-alicerce programa-pilha">
    <nav aria-label="Caminho">
      <ol className="mb-trilha">
        <li>
          <Link href="/empreendimentos/">Empreendimentos</Link>
        </li>
        <li aria-current="page">Importar tabela de preços</li>
      </ol>
    </nav>
    <header className="mb-cabecalho">
      <div className="mb-cabecalho__texto">
        <h1 className="titulo-tela">Importar tabela de preços</h1>
        <p className="mb-cabecalho__subtitulo">Use a resposta da IA para atualizar a tabela do mês.</p>
      </div>
    </header>
    <Cartao id="importacao-tabela" titulo="Tabela de preços">
      <div className="mb-etapas-bloco">
        <p className="mb-etapas-bloco__passo" aria-hidden="true">Etapa {passo} de 3 · <strong>{resultado && !resultado.erros.length ? "Concluída" : nomes[passo - 1]}</strong>
        </p>
        <div className="mb-etapas-bloco__trilho" aria-hidden="true">
          <span style={{ width: `${passo / 3 * 100}%` }} />
        </div>
        <ol className="mb-etapas mb-etapas--compacta" aria-label="Etapas da importação">{nomes.map((n, i) => <li key={n} className={`mb-etapa${i + 1 < passo || (resultado && !resultado.erros.length) ? " mb-etapa--concluida" : i + 1 === passo ? (resultado?.erros.length ? " mb-etapa--bloqueada" : " mb-etapa--atual") : ""}`} aria-current={(!resultado || resultado.erros.length > 0) && i + 1 === passo ? "step" : undefined}>
          <span className="mb-etapa__marcador" />
          <span className="mb-etapa__texto">
            <span className="mb-etapa__nome">{n}</span>{i + 1 === passo && !!resultado?.erros.length && <span className="mb-etapa__detalhe">{`Bloqueada: ${resultado.erros.length} itens não foram atualizados. Confira o resultado.`}</span>}</span>
        </li>)}</ol>
      </div>
      <div className="programa-pilha">
        {!plano && <>
          <section className="mb-form-secao">
            <h2 className="mb-form-secao__titulo">Prepare a resposta</h2>
            <p>Copie as instruções e cole no ChatGPT, no Gemini ou no Claude, junto com o PDF (ou a foto) da tabela do mês. As instruções trazem os {catalogo.filter(e => e.ativo).length} empreendimentos ativos do catálogo, para a IA usar os mesmos nomes.</p>
            <div className="mb-grupo-botoes">
              <button className="mb-botao mb-botao--secundario" onClick={copiar}>{copiado ? "Instruções copiadas" : "Copiar instruções"}</button>
              <button className="mb-botao mb-botao--discreto" onClick={baixar}>Baixar instruções .md</button>
            </div>
          </section>
          <Campo rotulo="Resposta da IA (bloco JSON)" ajuda="O texto fica guardado neste aparelho. Nada é gravado no catálogo antes de aplicar.">
            <textarea id="resposta" className="mb-campo__entrada importacao-resposta" spellCheck={false} value={texto} onChange={e => { setTexto(e.target.value); setLeitura(null); setResultado(null); }} placeholder='{ "formato": "mbigucci-empreendimentos/1", ... }' />
          </Campo>
          <Campo rotulo="Ou escolha o arquivo JSON">
            <input type="file" className="mb-campo__entrada" accept=".json,application/json,text/plain" onChange={e => void lerArquivo(e.target.files?.[0])} />
          </Campo>
          {leitura && !leitura.ok && <div role="alert" className="programa-pilha">{leitura.erros.map(e => <Aviso key={e} tom="erro" titulo={e} texto="Peça à IA para corrigir e cole a resposta de novo." />)}</div>}
          {!texto.trim() && <p className="mb-campo__ajuda">Cole a resposta ou escolha um arquivo para conferir.</p>}
          <div>
            <button className="mb-botao mb-botao--primario" disabled={!texto.trim()} onClick={() => conferir()}>Conferir prévia</button>
          </div>
        </>}
        {plano && conta && <>
          <Aviso tom={conta.erros ? "alerta" : "info"} titulo={`${plano.length} empreendimentos lidos · ${aAplicar} prontos · ${conta.erros} com erro`} texto={`${conta.atualiza} para atualizar · ${conta.novos} novos · ${conta.iguais} sem mudança. Nada foi gravado ainda.`} />
          <div className="mb-tabela-envoltorio importacao-previa">
            <table className="mb-tabela mb-tabela--densa mb-tabela--registros">
              <thead>
                <tr>
                  <th scope="col">Empreendimento</th>
                  <th scope="col">Leitura</th>
                  <th scope="col">O que muda</th>
                </tr>
              </thead>
              <tbody>{plano.map((i, n) => ({ i, n })).sort((a, b) => Number(b.i.acao === "erro") - Number(a.i.acao === "erro")).map(({ i, n }) => <ItemDaPrevia key={n} item={i} />)}</tbody>
            </table>
          </div>
          {leitura?.ok && leitura.avisos.map((a, n) => <Aviso key={n} tom="alerta" titulo="Aviso da leitura" texto={a} />)}
          <p className="mb-campo__ajuda">Dos empreendimentos que já existem, mudam só os preços, as tipologias, a fase, o mês da tabela, a entrega e a restrição de renda. Endereço, links e textos continuam na tela de edição. Tipologias ausentes na resposta ficam como estão.</p>
          <div className="mb-barra-acoes mb-barra-acoes--unica importacao-acoes">
            <div className="mb-barra-acoes__resumo">
              <span className="mb-barra-acoes__valor">{aAplicar} mudanças</span>
              <span className="mb-barra-acoes__estado">{aAplicar ? "Confira os itens antes de aplicar" : "Nenhuma mudança pronta para aplicar"}</span>
            </div>
            <div className="mb-grupo-botoes">
              <button className="mb-botao mb-botao--discreto" onClick={() => setLeitura(null)}>Voltar à resposta</button>
              <button ref={acao} className="mb-botao mb-botao--primario" disabled={!aAplicar || aplicando} onClick={() => setConfirmando(true)}>Aplicar {aAplicar} {aAplicar === 1 ? "mudança" : "mudanças"}</button>
            </div>
          </div>
        </>}
        {resultado && <section className="programa-pilha" aria-label="Resultado da importação">{!!resultado.feitos.length && <Aviso tom="sucesso" titulo={`${resultado.feitos.length} empreendimentos atualizados`} texto={resultado.feitos.join(", ")} />}{resultado.erros.map(e => <Aviso key={e} tom="erro" titulo={e} texto="Confira o item na resposta e tente de novo. Os demais resultados foram preservados." />)}<Link href="/empreendimentos/" className="mb-botao mb-botao--secundario justify-self-start">Ver catálogo</Link>
        </section>}
      </div>
    </Cartao>
    {confirmando && <ConfirmarImportacao quantidade={aAplicar} fechar={fecharConfirmacao} confirmar={aplicar} foco={focoAcao} />}
  </div>;
}

function ItemDaPrevia({ item }: { item: ItemPlano }) {
  const detalhes =
    item.acao === "atualiza"
      ? [
        ...item.alteradas.map((a) => `${a.rotulo}: ${a.resumo.join(", ")}`),
        ...item.novas.map((t) => `+ ${t.rotulo}${t.preco_a_partir_de ? ` · ${reais(t.preco_a_partir_de)}` : ""}`),
        ...(item.naoVieram.length ? [`Não vieram na tabela (ficam como estão): ${item.naoVieram.join(", ")}`] : []),
      ]
      : item.acao === "novo"
        ? item.novas.map((t) => `+ ${t.rotulo}${t.preco_a_partir_de ? ` · ${reais(t.preco_a_partir_de)}` : ""}`)
        : [];
  return <tr>
    <td>{item.nome}</td>
    <td data-rotulo="Leitura">
      <Selo tom={item.acao === "erro" ? "erro" : item.acao === "igual" ? undefined : "sucesso"}>{item.acao === "erro" ? "Não entra" : item.acao === "igual" ? "Sem mudança" : "Pronta"}</Selo>
    </td>
    <td data-rotulo="O que muda">
      <div className="min-w-0">
        <p>{formatarResumo(resumoDoItem(item).replace(/^[→✓✕+]\s*/, ""))}</p>{detalhes.length > 0 && <ul className="grid gap-1">{detalhes.map((d, n) => <li key={n}>{formatarResumo(d)}</li>)}</ul>}</div>
    </td>
  </tr>;
}
const reais = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function formatarResumo(texto: string) { return texto.replace(/R\$\s*[\d.]+(?:,\d+)?/g, v => reais(Number(v.replace(/R\$\s*/, "").replace(/\./g, "").replace(",", ".")))); }
