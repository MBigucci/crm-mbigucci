"use client";

import { useRef, useState } from "react";
import { PainelLateral } from "./painel-lateral";

export type FiltroDaBarra = {
  /** O rótulo do campo e o nome do filtro ativo (“Origem”). */
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  /** As escolhas; a primeira (valor `padrao`) é “Todos os corretores”, “Todas as origens”. */
  opcoes: { valor: string; rotulo: string }[];
  /** O valor que não filtra nada (padrão: vazio). Ativo é o que difere dele. */
  padrao?: string;
};

/**
 * BarraDeFiltros do Alicerce (project/components/BarraDeFiltros): a busca e até quatro filtros em `select`
 * acima de uma lista, com os filtros ativos à vista (cada um tira com um toque) e “Limpar filtros”.
 * O filtro vale ao escolher: não há botão Filtrar. Abaixo de 768px ficam a busca e o botão “Filtros · N”,
 * que abre os mesmos campos no PainelLateral. O estado é do React; quem usa guarda os valores
 * (busca e filtros no endereço da página ficam fora da fase 1).
 */
export function BarraDeFiltros({
  escopo,
  busca,
  filtros,
  contagem,
  ordenar,
  tituloDoPainel = "Filtrar",
}: {
  /** O Ordenar por, na linha da contagem: a contagem à esquerda e ele à direita, com o rótulo ao lado do campo. */
  ordenar?: { valor: string; onChange: (valor: string) => void; opcoes: { valor: string; rotulo: string }[] };
  /** De quem são os dados (“Sua equipe”, “Empresa toda”, “Só os seus”). */
  escopo?: string;
  busca: { valor: string; onChange: (valor: string) => void; placeholder: string };
  filtros: FiltroDaBarra[];
  /** “18 leads”: quantos resultados; some enquanto carrega. */
  contagem?: string;
  tituloDoPainel?: string;
}) {
  const [painel, setPainel] = useState(false);
  const botaoDoPainel = useRef<HTMLButtonElement>(null);
  const ativos = [
    ...(busca.valor.trim() ? [{ chave: "busca", texto: `Busca: ${busca.valor.trim()}`, tirar: () => busca.onChange("") }] : []),
    ...filtros
      .filter((f) => f.valor !== (f.padrao ?? ""))
      .map((f) => ({
        chave: f.rotulo,
        texto: `${f.rotulo}: ${f.opcoes.find((o) => o.valor === f.valor)?.rotulo ?? f.valor}`,
        tirar: () => f.onChange(f.padrao ?? ""),
      })),
  ];
  const limpar = () => {
    busca.onChange("");
    for (const f of filtros) f.onChange(f.padrao ?? "");
  };
  const campo = (f: FiltroDaBarra) => (
    <label key={f.rotulo} className="mb-campo">
      <span className="mb-campo__rotulo">{f.rotulo}</span>
      <span className="mb-campo__selecao">
        <select className="mb-campo__entrada" value={f.valor} onChange={(e) => f.onChange(e.target.value)}>
          {f.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
  return (
    <>
      {escopo && <span className="mb-escopo">{escopo}</span>}
      <form className="mb-filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="mb-campo mb-filtros__busca">
          <span className="mb-campo__rotulo">Buscar</span>
          <input className="mb-campo__entrada" type="search" placeholder={busca.placeholder} value={busca.valor} onChange={(e) => busca.onChange(e.target.value)} />
        </label>
        {filtros.map(campo)}
        <button ref={botaoDoPainel} className="mb-botao mb-botao--secundario mb-filtros__celular" type="button" aria-haspopup="dialog" onClick={() => setPainel(true)}>
          Filtros{ativos.length > 0 ? ` · ${ativos.length}` : ""}
        </button>
        {(contagem || ativos.length > 0 || ordenar) && (
          <div className="mb-filtros__ativos">
            {contagem && <span>{contagem}</span>}
            {contagem && ativos.length > 0 && <span>·</span>}
            {ativos.map((a) => (
              <button key={a.chave} className="mb-opcao mb-opcao--p" type="button" aria-label={`Tirar o filtro ${a.texto}`} onClick={a.tirar}>
                {a.texto}
              </button>
            ))}
            {ativos.length > 0 && (
              <button className="mb-botao mb-botao--discreto mb-botao--p" type="button" onClick={limpar}>
                Limpar filtros
              </button>
            )}
            {ordenar && (
              <label className="pagina-alicerce__ordem">
                <span className="mb-campo__rotulo">Ordenar por</span>
                <span className="mb-campo__selecao">
                  <select className="mb-campo__entrada" value={ordenar.valor} onChange={(e) => ordenar.onChange(e.target.value)}>
                    {ordenar.opcoes.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.rotulo}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}
          </div>
        )}
      </form>
      <PainelLateral
        aberto={painel}
        onFechar={() => setPainel(false)}
        titulo={tituloDoPainel}
        descricao={contagem}
        foco={() => botaoDoPainel.current}
        rodape={
          <div className="mb-lateral__rodape">
            <button className="mb-botao mb-botao--discreto" type="button" onClick={limpar}>
              Limpar filtros
            </button>
            <button className="mb-botao mb-botao--primario" type="button" onClick={() => setPainel(false)}>
              {contagem ? `Ver ${contagem}` : "Ver resultados"}
            </button>
          </div>
        }
      >
        <div className="mb-lateral__corpo">{filtros.map(campo)}</div>
      </PainelLateral>
    </>
  );
}
