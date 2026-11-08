"use client";

import Link from "next/link";
import { Fragment, useId } from "react";
import { usePopup } from "@/components/alicerce/usar-popup";
import { EstadoDePagina, CopiarDetalhes } from "@/components/alicerce/estado-de-pagina";
import { Tabela } from "@/components/alicerce/tabela";
import { somarStand, standZerado, type NumerosStand } from "@/lib/recepcao";

export function ErroPainel({ erro }: { erro: string }) {
  return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar os dados" texto="Tente carregar esta página novamente." acoes={<button type="button" className="mb-botao mb-botao--primario" onClick={() => window.location.reload()}>Tentar novamente</button>} detalhe={<CopiarDetalhes codigo={erro} />} />;
}

/** Indicador.md:5-10: valores e contexto escritos, sem gráfico decorativo. */
export function Indicadores({ itens }: { itens: { rotulo: string; valor: React.ReactNode; nota?: string }[] }) {
  return <div className="mb-indicadores">{itens.map((t) => <div className="mb-indicador" key={t.rotulo}>
    <div className="mb-indicador__cabecalho"><span className="mb-indicador__rotulo">{t.rotulo}</span></div>
    <span className="mb-indicador__valor">{t.valor}</span>
    {t.nota && <span className="mb-indicador__meta">{t.nota}</span>}
  </div>)}</div>;
}

/** Exportar.md:3-12. Excel lê SpreadsheetML nativo (.xml), sem dependência nova. */
export function Exportar({ titulo, colunas, linhas, nome, imprimir = () => window.print() }: { titulo: string; colunas: string[]; linhas: (string | number)[][]; nome: string; imprimir?: () => void }) {
  const popup = usePopup(titulo);
  const id = useId();
  function baixar(formato: "excel" | "csv") {
    const xml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const celulas = [colunas, ...linhas];
    const seguro = (v: string | number) => typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
    const texto = formato === "csv" ? "\ufeff" + celulas.map((r) => r.map((v) => `"${seguro(v).replaceAll('"', '""')}"`).join(";")).join("\r\n") :
      '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Registros"><Table>' + celulas.map((r) => "<Row>" + r.map((v) => `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${xml(String(v))}</Data></Cell>`).join("") + "</Row>").join("") + '</Table></Worksheet></Workbook>';
    const url = URL.createObjectURL(new Blob([texto], { type: formato === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.${formato === "csv" ? "csv" : "xml"}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    popup.fechar(true);
  }
  return <div className="mb-ancora sem-impressao" ref={popup.raiz}>
    <button ref={popup.botao} type="button" className="mb-botao mb-botao--secundario mb-botao--p" aria-haspopup="menu" aria-controls={id} aria-expanded={popup.aberto} onClick={popup.alternar}>Exportar</button>
    <div className="mb-popup mb-popup--abaixo" id={id} role="menu" hidden={!popup.aberto}>
      <div className="mb-popup__titulo">{titulo}</div>
      <button className="mb-popup__item" type="button" role="menuitem" onClick={() => baixar("excel")}>Planilha (Excel)</button>
      <button className="mb-popup__item" type="button" role="menuitem" onClick={() => baixar("csv")}>CSV</button>
      <button className="mb-popup__item" type="button" role="menuitem" onClick={() => { popup.fechar(true); imprimir(); }}>PDF <span className="pmr-nota">Salvar na impressão</span></button>
      <div className="mb-popup__divisor" />
      <button className="mb-popup__item" type="button" role="menuitem" onClick={() => { popup.fechar(true); imprimir(); }}>Imprimir</button>
    </div>
  </div>;
}

const COLUNAS_STAND: { chave: keyof NumerosStand; rotulo: string }[] = [
  { chave: "clientes", rotulo: "Clientes no stand" }, { chave: "novos", rotulo: "Novos da vez" }, { chave: "indicacoes", rotulo: "Indicações" }, { chave: "retornos", rotulo: "Retornos" }, { chave: "atendeuDeOutro", rotulo: "Atendeu por colega" },
];
/** Mesmos dados da Recepção; uma tabela numérica, inclusive no celular (TabelaNoCelular.md:7). */
export function TabelaStand({ linhas, numeros, nomes }: { linhas: string[]; numeros: Map<string, NumerosStand>; nomes: Map<string, string> }) {
  const total = somarStand(linhas.map((id) => numeros.get(id) ?? standZerado()));
  const celulas = (x: NumerosStand) => COLUNAS_STAND.map((c) => <td className="mb-tabela__num" key={c.chave}>{x[c.chave]}</td>);
  return <section className="pmr-pilha" aria-labelledby="t-stand">
    <h2 id="t-stand" className="mb-grafico__titulo">Clientes no stand, por corretor · pela recepção</h2>
    <Tabela tipo="numeros" rotulo="Clientes no stand por corretor"><thead><tr><th scope="col">Corretor</th>{COLUNAS_STAND.map((c) => <th scope="col" className="mb-tabela__num" key={c.chave}>{c.rotulo}</th>)}</tr></thead>
      <tbody>{linhas.map((id) => <tr key={id}><th scope="row">{nomes.get(id) ?? "Corretor"}</th>{celulas(numeros.get(id) ?? standZerado())}</tr>)}</tbody>
      <tfoot><tr><th scope="row">Equipe</th>{celulas(total)}</tr></tfoot>
    </Tabela>
    <p className="mb-grafico__nota">O cliente conta para o corretor do vínculo (o da vez, quem indicou ou o do retorno). Cliente de parceiro fica com o gerente do parceiro.</p>
    <Link href="/recepcao/relatorio/" className="mb-link sem-impressao">Relatório do stand</Link>
  </section>;
}
export function StandDoCorretor({ numeros }: { numeros: NumerosStand }) {
  return <section className="pmr-pilha" aria-labelledby="r-stand"><h2 id="r-stand" className="mb-grafico__titulo">Clientes no stand no período · pela recepção</h2>
    <dl className="mb-pares">{COLUNAS_STAND.map((c) => <Fragment key={c.chave}><dt>{c.rotulo}</dt><dd className="mb-pares__num">{numeros[c.chave]}</dd></Fragment>)}</dl>
  </section>;
}
