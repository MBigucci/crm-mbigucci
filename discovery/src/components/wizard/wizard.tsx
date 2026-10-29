"use client";

import { useEffect, useRef, useState } from "react";
import { Cabecalho } from "@/components/cabecalho";
import { OpcaoCard } from "./opcao-card";
import { MockKanban, MockListaDia } from "./mockups";
import { enviarResposta } from "@/lib/envio";
import {
  CONTROLE_ATUAL,
  FORMAS_REGISTRO,
  NUMEROS,
  ORIGENS,
  TEMPOS_CADASTRO,
  VISOES,
  type Opcao,
} from "@/lib/perguntas";

const RASCUNHO = "mb-discovery-rascunho-v2";
const TOTAL = 7;

type Estado = {
  nome: string;
  controleAtual: string[];
  controleComentario: string;
  origens: string[];
  origemOutro: string;
  divulgacaoResultado: string;
  anotaNaHora: string;
  formasRegistro: string[];
  formaOutro: string;
  tempoCadastro: string;
  visao: string;
  visaoPorque: string;
  numeros: string[];
  numerosOutro: string;
  desistencia: string;
  funcaoDesejada: string;
};

const VAZIO: Estado = {
  nome: "",
  controleAtual: [],
  controleComentario: "",
  origens: [],
  origemOutro: "",
  divulgacaoResultado: "",
  anotaNaHora: "",
  formasRegistro: [],
  formaOutro: "",
  tempoCadastro: "",
  visao: "",
  visaoPorque: "",
  numeros: [],
  numerosOutro: "",
  desistencia: "",
  funcaoDesejada: "",
};

function alterna(lista: string[], id: string) {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

export function Wizard() {
  const [etapa, setEtapa] = useState(0);
  const [dx, setDx] = useState(16);
  const [r, setR] = useState<Estado>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const topo = useRef<HTMLDivElement>(null);

  // Rascunho: se o corretor fechar o app no meio, continua de onde parou.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(RASCUNHO);
      if (salvo) {
        const { etapa: e, r: dados } = JSON.parse(salvo);
        setR({ ...VAZIO, ...dados });
        setEtapa(Math.min(Math.max(0, e ?? 0), TOTAL - 1));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (enviado) return;
    try {
      localStorage.setItem(RASCUNHO, JSON.stringify({ etapa, r }));
    } catch {}
  }, [etapa, r, enviado]);

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => {
    setErro("");
    setR((s) => ({ ...s, [k]: v }));
  };

  const podeAvancar = [
    r.nome.trim().length > 0,
    r.controleAtual.length > 0,
    r.origens.length > 0,
    r.formasRegistro.length > 0 && r.tempoCadastro !== "",
    r.visao !== "",
    r.numeros.length > 0,
    true,
  ][etapa];

  function ir(nova: number) {
    setDx(nova > etapa ? 16 : -16);
    setErro("");
    setEtapa(nova);
    topo.current?.scrollIntoView({ block: "start" });
  }

  async function enviar() {
    setEnviando(true);
    setErro("");
    try {
      await enviarResposta(r);
      try {
        localStorage.removeItem(RASCUNHO);
      } catch {}
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  function avancar() {
    if (!podeAvancar) return;
    if (etapa === TOTAL - 1) enviar();
    else ir(etapa + 1);
  }

  /** Lista de opções de múltipla escolha ligada a um campo do estado. */
  const multipla = (campo: "controleAtual" | "origens" | "formasRegistro" | "numeros", opcoes: Opcao[]) => (
    <Lista>
      {opcoes.map((o) => (
        <OpcaoCard
          key={o.id}
          rotulo={o.rotulo}
          apoio={o.apoio}
          multiplo
          marcado={r[campo].includes(o.id)}
          onClick={() => {
            setErro("");
            setR((s) => ({ ...s, [campo]: alterna(s[campo], o.id) }));
          }}
        />
      ))}
    </Lista>
  );

  if (enviado) return <Obrigado nome={r.nome} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho
        titulo="Seu CRM ideal"
        direita={
          <span className="num shrink-0 font-display text-[13px] font-bold text-ink-soft">
            {etapa + 1} de {TOTAL}
          </span>
        }
      />
      {/* Progresso: barra fina em brand sob o cabeçalho */}
      <div
        className="sticky top-[58px] z-10 h-[3px] bg-line"
        role="progressbar"
        aria-label="Progresso da pesquisa"
        aria-valuemin={1}
        aria-valuemax={TOTAL}
        aria-valuenow={etapa + 1}
      >
        <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${((etapa + 1) / TOTAL) * 100}%` }} />
      </div>

      <div ref={topo} className="scroll-mt-[61px]" />
      <main
        key={etapa}
        className="etapa-entra mx-auto w-full max-w-[560px] flex-1 px-5 pb-36 pt-[22px]"
        style={{ "--etapa-dx": `${dx}px` } as React.CSSProperties}
      >
        {etapa === 0 && (
          <Etapa
            eyebrow="Pesquisa com corretores"
            titulo="Como seria o CRM ideal para você?"
            lead="Queremos criar uma ferramenta que ajude você a vender mais e a não perder nenhum cliente, e ela vai ser desenhada a partir do que os corretores responderem. Não tem resposta certa: conte como você trabalha de verdade. Leva uns 4 minutos."
          >
            <div className="card bar-brand">
              <label htmlFor="nome" className="field-label">
                Seu nome ou apelido
              </label>
              <input
                id="nome"
                className="input"
                autoComplete="given-name"
                placeholder="Ex.: Rafa"
                value={r.nome}
                maxLength={80}
                onChange={(e) => set("nome", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && avancar()}
              />
            </div>
          </Etapa>
        )}

        {etapa === 1 && (
          <Etapa
            eyebrow="Como é hoje"
            titulo="Como você organiza seus clientes e retornos hoje?"
            lead="Marque tudo o que usa, mesmo que seja um pouco de cada."
          >
            {multipla("controleAtual", CONTROLE_ATUAL)}
            <Comentario
              id="controleComentario"
              rotulo="O que funciona e o que te irrita nesse jeito?"
              placeholder="Ex.: a planilha é boa, mas no celular não consigo abrir"
              valor={r.controleComentario}
              onChange={(v) => set("controleComentario", v)}
            />
          </Etapa>
        )}

        {etapa === 2 && (
          <Etapa
            eyebrow="Seus clientes"
            titulo="De onde vêm os seus clientes hoje?"
            lead="Marque todas as origens que trazem clientes para você."
          >
            {multipla("origens", ORIGENS)}
            {r.origens.includes("outro") && (
              <Comentario
                id="origemOutro"
                rotulo="Qual outra origem?"
                linhas={1}
                valor={r.origemOutro}
                onChange={(v) => set("origemOutro", v)}
              />
            )}
            <Comentario
              id="divulgacaoResultado"
              rotulo="Quando você divulga um imóvel por conta própria, como sabe se deu resultado?"
              placeholder="Ex.: vejo quantas pessoas chamaram no direct, mas não anoto"
              valor={r.divulgacaoResultado}
              onChange={(v) => set("divulgacaoResultado", v)}
            />
          </Etapa>
        )}

        {etapa === 3 && (
          <Etapa
            eyebrow="Cliente novo"
            titulo="Um cliente acabou de te chamar. O que você precisa anotar na hora?"
            lead="Escreva do seu jeito: o mínimo para não perder esse contato."
          >
            <div className="card bar-brand">
              <label htmlFor="anotaNaHora" className="field-label">
                O que eu anoto na hora
              </label>
              <textarea
                id="anotaNaHora"
                className="input min-h-[96px] resize-y"
                placeholder="Ex.: nome, telefone e qual prédio ele viu"
                value={r.anotaNaHora}
                maxLength={2000}
                onChange={(e) => set("anotaNaHora", e.target.value)}
              />
            </div>

            <h2 className="titulo-card mt-6">Qual o jeito mais fácil de registrar esse cliente?</h2>
            <p className="mb-3 mt-1 text-[13px] text-ink-soft">Pode marcar mais de um.</p>
            {multipla("formasRegistro", FORMAS_REGISTRO)}
            {r.formasRegistro.includes("outro") && (
              <Comentario
                id="formaOutro"
                rotulo="Qual outro jeito?"
                linhas={1}
                valor={r.formaOutro}
                onChange={(v) => set("formaOutro", v)}
              />
            )}

            <h2 className="titulo-card mt-6">Quanto tempo você toparia gastar nesse registro?</h2>
            <div className="mt-3">
              <Lista>
                {TEMPOS_CADASTRO.map((o) => (
                  <OpcaoCard
                    key={o.id}
                    rotulo={o.rotulo}
                    marcado={r.tempoCadastro === o.id}
                    onClick={() => set("tempoCadastro", o.id)}
                  />
                ))}
              </Lista>
            </div>
          </Etapa>
        )}

        {etapa === 4 && (
          <Etapa
            eyebrow="O dia a dia"
            titulo="Qual tela te ajudaria mais a não perder venda?"
            lead="Pense na primeira tela que você abriria de manhã."
          >
            <Lista>
              {VISOES.map((o) => (
                <OpcaoCard
                  key={o.id}
                  rotulo={o.rotulo}
                  apoio={o.apoio}
                  marcado={r.visao === o.id}
                  onClick={() => set("visao", o.id)}
                >
                  {o.id === "kanban" && <MockKanban />}
                  {o.id === "lista_dia" && <MockListaDia />}
                </OpcaoCard>
              ))}
            </Lista>
            <Comentario
              id="visaoPorque"
              rotulo={r.visao === "nenhuma" ? "Como seria a sua tela ideal?" : "Por quê? O que não pode faltar nela?"}
              placeholder="Ex.: quero ver primeiro quem tem visita marcada"
              valor={r.visaoPorque}
              onChange={(v) => set("visaoPorque", v)}
            />
          </Etapa>
        )}

        {etapa === 5 && (
          <Etapa
            eyebrow="Seus resultados"
            titulo="Que números sobre o seu trabalho você gostaria de acompanhar?"
            lead="Marque o que te ajudaria a entender o que está dando certo."
          >
            {multipla("numeros", NUMEROS)}
            <Comentario
              id="numerosOutro"
              rotulo="Algum outro número ou informação?"
              placeholder="Ex.: quantos clientes de cada empreendimento"
              valor={r.numerosOutro}
              onChange={(v) => set("numerosOutro", v)}
            />
          </Etapa>
        )}

        {etapa === 6 && (
          <Etapa
            eyebrow="Última pergunta"
            titulo="Sua opinião sincera"
            lead="É isto que mais vai mudar a ferramenta. Pode escrever à vontade."
          >
            <div className="space-y-4">
              <div className="card">
                <label htmlFor="desistencia" className="field-label">
                  O que faz você desistir de usar um aplicativo ou CRM no dia a dia?
                </label>
                <textarea
                  id="desistencia"
                  className="input min-h-[110px] resize-y"
                  placeholder="Ex.: muito campo para preencher, demora para abrir no celular"
                  value={r.desistencia}
                  maxLength={2000}
                  onChange={(e) => set("desistencia", e.target.value)}
                />
              </div>
              <div className="card bar-brand">
                <label htmlFor="funcao" className="field-label">
                  Se pudesse pedir uma única função para facilitar sua vida, qual seria?
                </label>
                <textarea
                  id="funcao"
                  className="input min-h-[110px] resize-y"
                  placeholder="Ex.: me lembrar de quem eu preciso chamar hoje"
                  value={r.funcaoDesejada}
                  maxLength={2000}
                  onChange={(e) => set("funcaoDesejada", e.target.value)}
                />
              </div>
            </div>
          </Etapa>
        )}
      </main>

      {/* Ações fixas no rodapé, ao alcance do polegar */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-header-glass backdrop-blur-[12px]">
        <div className="mx-auto max-w-[560px] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          {erro && (
            <p
              role="alert"
              className="relative mb-3 rounded-sm border border-brand bg-tint-brand py-2 pl-4 pr-3 text-[13px] text-ink"
            >
              <span className="absolute bottom-0 left-0 top-0 w-[4px] bg-brand" />
              <b className="mr-1 font-semibold">✕</b>
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            {etapa > 0 && (
              <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={() => ir(etapa - 1)}>
                Voltar
              </button>
            )}
            <button
              type="button"
              className="btn btn-red btn-lg focus-ring flex-1"
              disabled={!podeAvancar || enviando}
              onClick={avancar}
            >
              {etapa === 0 ? "Começar" : etapa === TOTAL - 1 ? (enviando ? "Enviando…" : "Enviar respostas") : "Continuar"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Etapa({
  eyebrow,
  titulo,
  lead,
  children,
}: {
  eyebrow: string;
  titulo: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="titulo-pagina mt-[6px]">{titulo}</h1>
      {lead && <p className="mt-3 text-[15px] leading-[1.5] text-ink-soft">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Lista({ children }: { children: React.ReactNode }) {
  return <div className="space-y-[10px]">{children}</div>;
}

/** Campo aberto opcional abaixo das opções: é onde aparecem os argumentos do corretor. */
function Comentario({
  id,
  rotulo,
  placeholder,
  valor,
  onChange,
  linhas = 3,
}: {
  id: string;
  rotulo: string;
  placeholder?: string;
  valor: string;
  onChange: (v: string) => void;
  linhas?: number;
}) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="field-label">
        {rotulo} <span className="normal-case tracking-normal">(opcional)</span>
      </label>
      {linhas > 1 ? (
        <textarea
          id={id}
          className="input min-h-[88px] resize-y"
          placeholder={placeholder}
          value={valor}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input id={id} className="input" placeholder={placeholder} value={valor} maxLength={200} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Obrigado({ nome }: { nome: string }) {
  const primeiro = nome.trim().split(/\s+/)[0];
  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho titulo="Seu CRM ideal" />
      <main className="etapa-entra mx-auto w-full max-w-[560px] px-5 pt-[22px]">
        <div className="relative overflow-hidden rounded-lg bg-ink py-[22px] pl-[26px] pr-[22px] text-on-dark">
          <span className="absolute bottom-0 left-0 top-0 w-[4px] bg-ok" />
          <div className="flex items-center gap-3">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ok font-display text-[15px] font-extrabold text-surface">
              ✓
            </span>
            <span className="font-display text-[21px] font-extrabold leading-[1.05]">Respostas enviadas</span>
          </div>
          <p className="mt-3 text-[15px] text-on-dark-soft">
            Obrigado{primeiro ? `, ${primeiro}` : ""}. Suas respostas vão ajudar a desenhar uma ferramenta feita para o seu
            jeito de trabalhar.
          </p>
        </div>
      </main>
    </div>
  );
}
