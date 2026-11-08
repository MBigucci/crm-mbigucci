"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/alicerce/aviso";
import { Campo } from "@/components/alicerce/campo";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Seletor } from "@/components/alicerce/seletor";
import { salvarRegra } from "@/lib/direcionador-dados";
import {
  avisoHorario,
  DIAS,
  partesDoForm,
  somaPcts,
  validarRegra,
  type ConfigTela,
  type ProdutoTela,
  type RegraTela,
} from "@/lib/telas";
import { FraseDaRegra } from "./regras";

const QUALQUER = "__qualquer";
/** O "✕ " que as mensagens de lib/telas.ts já trazem: o Aviso de erro tem o próprio ícone. */
const semSinal = (t: string) => t.replace(/^✕\s*/, "");

/**
 * Criar ou editar uma regra no PainelLateral (guia PainelLateral: "toda tarefa com mais de dois campos"; o guia do
 * Dialogo manda formulário longo para uma tela, não para o diálogo). O corpo é o ConstrutorDeCondicoes no modo
 * Direcionador (guia ConstrutorDeCondicoes.md:12): "Se o lead chegar com" (as condições) e "Então" (para quem distribuir), e a regra
 * por extenso embaixo. Salvar troca as partes e zera os contadores da regra.
 *
 * A peça existe só como classes (`.mb-condicoes`, `.mb-condicao`, `.mb-condicoes__bloco`); o MB.condicoes.ligar
 * não entra em DOM do React. As linhas são fixas, porque o modelo de dados é fixo (produto, fonte, dias e horário,
 * sempre ligados por "e"): sem "+ Adicionar condição", sem o ✕ e sem a escolha "todas / qualquer uma".
 */
export function EditorRegra({
  aberto,
  config,
  produtos,
  regra,
  posicao,
  onFechar,
  onSalvo,
  onExcluir,
}: {
  aberto: boolean;
  config: ConfigTela;
  produtos: ProdutoTela[];
  regra: RegraTela | null;
  posicao: number;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
  onExcluir: (r: RegraTela) => void;
}) {
  const primeiroExterno = config.destinos.find((d) => d.tipo === "externo" && d.ativo) ?? config.destinos.find((d) => d.tipo === "vendas");
  const [nome, setNome] = useState(regra?.nome ?? "");
  const [ativa, setAtiva] = useState(regra?.ativa ?? true);
  const [prods, setProds] = useState<string[]>(regra?.produtos ?? []);
  const [fontes, setFontes] = useState<string[]>(regra?.fontes ?? []);
  const [dias, setDias] = useState<number[]>(regra?.dias ?? [0, 1, 2, 3, 4, 5, 6]);
  const inteiroInicial = regra ? regra.hora_inicio === regra.hora_fim : false;
  const [diaInteiro, setDiaInteiro] = useState(inteiroInicial);
  const [ini, setIni] = useState(regra && !inteiroInicial ? regra.hora_inicio : "09:00");
  const [fim, setFim] = useState(regra && !inteiroInicial ? regra.hora_fim : "18:00");
  const [pcts, setPcts] = useState<Record<string, number>>(
    regra ? Object.fromEntries(regra.partes.map((p) => [p.destino_id, p.porcentagem])) : primeiroExterno ? { [primeiroExterno.id]: 100 } : {},
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const alerta = useRef<HTMLDivElement>(null);
  // O erro fica no fim do formulário: rola até ele para não passar despercebido.
  useEffect(() => {
    if (erro) alerta.current?.scrollIntoView({ block: "nearest" });
  }, [erro]);

  // Alternar com setState funcional: a versão com closure perde cliques rápidos. "Qualquer" é a lista vazia.
  const alternar = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, v: T) => set((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));
  const varios = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) => (v === QUALQUER ? set([]) : alternar(set, v));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarRegra({ nome, dias, diaInteiro, hora_inicio: ini, hora_fim: fim, pcts });
    if (problema) return setErro(problema);
    setErro(null);
    setSalvando(true);
    try {
      await salvarRegra({
        id: regra?.id,
        nome: nome.trim(),
        ativa,
        produtos: prods,
        fontes,
        dias: [...dias].sort((a, b) => a - b),
        hora_inicio: diaInteiro ? "00:00" : ini,
        hora_fim: diaInteiro ? "00:00" : fim,
        partes: partesDoForm(pcts, config.destinos, regra?.partes.map((p) => p.destino_id)),
      });
      onSalvo(regra ? "Regra salva. Os contadores dela voltaram a zero." : `Regra criada no fim da lista, na posição ${posicao}.`);
    } catch (e) {
      setErro(`✕ ${e instanceof Error ? e.message : String(e)}`);
      setSalvando(false);
    }
  }

  const soma = somaPcts(pcts);
  const previa = {
    produtos: prods,
    fontes,
    dias,
    hora_inicio: diaInteiro ? "00:00" : ini,
    hora_fim: diaInteiro ? "00:00" : fim,
    partes: partesDoForm(pcts, config.destinos, regra?.partes.map((p) => p.destino_id)).map((p) => ({ ...p, enviados: 0 })),
  };

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo={regra ? "Editar regra" : "Criar regra"}
      descricao={regra ? `Regra ${posicao}` : "Nova regra, no fim da lista"}
      rodape={
        <div className="mb-lateral__rodape">
          {regra &&
            (confirmarExclusao ? (
              <button type="button" className="mb-botao mb-botao--perigo mkt-rodape-esquerda" onClick={() => onExcluir(regra)}>
                Excluir de vez
              </button>
            ) : (
              <button type="button" className="mb-botao mb-botao--discreto mkt-rodape-esquerda" onClick={() => setConfirmarExclusao(true)}>
                Excluir regra
              </button>
            ))}
          <button type="button" className="mb-botao mb-botao--secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" form="form-regra" className="mb-botao mb-botao--primario" aria-busy={salvando || undefined} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar regra"}
          </button>
        </div>
      }
    >
      <div className="mb-lateral__corpo mkt-regra">
        <form id="form-regra" className="mkt-form" onSubmit={salvar} noValidate>
          <Campo rotulo="Nome da regra" ajuda="Para achar na lista.">
            <input className="mb-campo__entrada" maxLength={80} placeholder="Ex.: Fim de semana, portais" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <div className="mb-condicoes">
            <div className="mb-condicoes__bloco">
              <span className="mb-condicoes__rotulo">Se o lead chegar com</span>

              <div className="mb-condicao">
                <span className="mb-condicao__conector">Se</span>
                <span className="mkt-condicao__campo" id="c-produto">
                  Produto
                </span>
                <span className="mkt-condicao__comparacao">é um de</span>
                <Seletor
                  idRotulo="c-produto"
                  grade="linha"
                  pequeno
                  multipla
                  valor={null}
                  marcados={prods.length ? prods : [QUALQUER]}
                  onChange={varios(setProds)}
                  opcoes={[{ valor: QUALQUER, rotulo: "Qualquer produto" }, ...produtos.map((p) => ({ valor: p.id, rotulo: p.nome }))]}
                />
              </div>

              <div className="mb-condicao">
                <span className="mb-condicao__conector">e</span>
                <span className="mkt-condicao__campo" id="c-fonte">
                  Fonte
                </span>
                <span className="mkt-condicao__comparacao">é uma de</span>
                <Seletor
                  idRotulo="c-fonte"
                  grade="linha"
                  pequeno
                  multipla
                  valor={null}
                  marcados={fontes.length ? fontes : [QUALQUER]}
                  onChange={varios(setFontes)}
                  opcoes={[{ valor: QUALQUER, rotulo: "Qualquer fonte" }, ...config.fontes.map((f) => ({ valor: f.slug, rotulo: f.nome }))]}
                />
              </div>

              <div className="mb-condicao">
                <span className="mb-condicao__conector">e</span>
                <span className="mkt-condicao__campo" id="c-dias">
                  Dia da semana
                </span>
                <span className="mkt-condicao__comparacao">é um de</span>
                <Seletor
                  idRotulo="c-dias"
                  grade="linha"
                  pequeno
                  multipla
                  valor={null}
                  marcados={dias.map(String)}
                  onChange={(v) => alternar(setDias, Number(v))}
                  opcoes={DIAS.map((d, i) => ({ valor: String(i), rotulo: d }))}
                />
              </div>

              <div className="mb-condicao">
                <span className="mb-condicao__conector">e</span>
                <span className="mkt-condicao__campo" id="c-horario">
                  Horário
                </span>
                <span className="mkt-condicao__comparacao">é</span>
                <div className="mkt-horario">
                  <div className="mb-campo__par">
                    <label className="mb-campo">
                      <span className="mb-campo__rotulo">Das</span>
                      <input className="mb-campo__entrada" type="time" step={60} value={diaInteiro ? "00:00" : ini} disabled={diaInteiro} onChange={(e) => setIni(e.target.value)} />
                    </label>
                    <label className="mb-campo">
                      <span className="mb-campo__rotulo">Até</span>
                      <input className="mb-campo__entrada" type="time" step={60} value={diaInteiro ? "00:00" : fim} disabled={diaInteiro} onChange={(e) => setFim(e.target.value)} />
                    </label>
                  </div>
                  <Seletor idRotulo="c-horario" grade="linha" pequeno multipla valor={null} marcados={diaInteiro ? ["inteiro"] : []} onChange={() => setDiaInteiro((v) => !v)} opcoes={[{ valor: "inteiro", rotulo: "Dia inteiro" }]} />
                  <span className="mb-campo__ajuda">{avisoHorario({ diaInteiro, hora_inicio: ini, hora_fim: fim })}</span>
                </div>
              </div>
            </div>

            <div className="mb-condicoes__bloco">
              <span className="mb-condicoes__rotulo">Então</span>
              {config.destinos.map((d, i) => (
                <div className="mb-condicao" key={d.id}>
                  <span className="mb-condicao__conector">{i === 0 ? "Mande" : "e"}</span>
                  <span className="mkt-condicao__campo">
                    {d.nome}
                    {!d.ativo && <span className="mkt-condicao__comparacao"> (desligado)</span>}
                  </span>
                  <span className="mkt-condicao__comparacao">recebe</span>
                  <div className="mkt-pct">
                    <input
                      className="mb-campo__entrada"
                      aria-label={`Porcentagem para ${d.nome}`}
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      inputMode="numeric"
                      value={pcts[d.id] ?? 0}
                      onChange={(e) => {
                        const v = Math.round(Number(e.target.value) || 0);
                        setPcts((p) => ({ ...p, [d.id]: Math.max(0, Math.min(100, v)) }));
                      }}
                    />
                    <span aria-hidden="true">%</span>
                  </div>
                </div>
              ))}
              {soma === 100 ? <Aviso tom="sucesso" titulo="Soma 100%" /> : <Aviso tom="alerta" titulo={`Soma ${soma}%`} texto="Ajuste para 100%." />}
              {regra && <span className="mb-campo__ajuda">Ao salvar, os contadores desta regra voltam a zero.</span>}
            </div>

            <FraseDaRegra config={config} produtos={produtos} regra={previa} />
          </div>

          <label className="mb-marcador">
            <input type="checkbox" checked={ativa} onChange={() => setAtiva((v) => !v)} />
            Regra ligada
          </label>

          {erro && (
            <div ref={alerta}>
              <Aviso tom="erro" titulo={semSinal(erro)} />
            </div>
          )}
        </form>
      </div>
    </PainelLateral>
  );
}
