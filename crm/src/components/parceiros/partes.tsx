"use client";

import clsx from "clsx";
import { useSessao } from "@/lib/sessao";
import {
  agruparRegioes,
  ATALHOS_PROXIMO,
  diaLocal,
  ESTAGIOS,
  estadoProximoContato,
  FAIXAS,
  formatarDia,
  LIMITE_DIAS,
  somarDias,
  type CamposParceiro,
  type Estagio,
  type Faixa,
  type Regiao,
} from "@/lib/parceiros";

/** A Casca só aceita uma permissão: as telas de parceiros valem para quem cadastra OU vê todos. */
export function ComPermissao({ children }: { children: React.ReactNode }) {
  const { pode } = useSessao();
  if (pode("parceiros.cadastrar") || pode("parceiros.ver_todos")) return <>{children}</>;
  return (
    <div className="card max-w-[520px]">
      <p>! Seu perfil não tem acesso a esta página.</p>
    </div>
  );
}

/** Selo do prazo de 90 dias: "✓ 21 dias", "! 36 dias", "✕ 84 dias". */
export function SeloPrazo({ faixa, dias, estagio }: { faixa: Faixa; dias: number; estagio?: Estagio }) {
  if (estagio === "novo" && faixa === "ok") return <span className="selo">Novo</span>;
  const f = FAIXAS[faixa];
  return (
    <span className={clsx("selo", f.classe)}>
      <span aria-hidden>{f.sinal}</span>
      <span className="num">{dias}</span> {dias === 1 ? "dia" : "dias"}
    </span>
  );
}

/**
 * Estágio no funil. O atual é o único preenchido (não depende só da cor); os já passados ficam em ink,
 * os seguintes em concrete. Indicou e Vendeu chegam na etapa 5: aparecem com "–" e "em breve" para o leitor de tela.
 */
export function TrilhaEstagio({ estagio }: { estagio: Estagio }) {
  const atual = ESTAGIOS.findIndex((e) => e.slug === estagio);
  return (
    <ol
      className="mt-2 inline-flex max-w-full divide-x divide-line overflow-hidden rounded-sm border border-line text-[11px] leading-[1.5]"
      aria-label={`Estágio: ${ESTAGIOS[atual]?.nome}`}
    >
      {ESTAGIOS.map((e, i) => (
        <li
          key={e.slug}
          aria-current={i === atual ? "step" : undefined}
          title={e.ativo ? undefined : "Em breve"}
          className={clsx(
            "whitespace-nowrap px-1 py-[1px] font-semibold",
            i === atual ? "bg-ink text-surface" : i < atual ? "text-ink" : "text-concrete",
          )}
        >
          {e.nome}
          {!e.ativo && (
            <>
              <span aria-hidden className="ml-0.5">–</span>
              <span className="sr-only"> (em breve)</span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Próximo contato com o estado: "✕ vencido, 02/11/2026", "! hoje" ou a data. */
export function ProximoContatoParceiro({ dia, agora }: { dia: string | null; agora: Date }) {
  const estado = estadoProximoContato(dia, agora);
  if (!dia || !estado) return <span className="text-ink-soft">Sem próximo contato</span>;
  if (estado === "vencido")
    return (
      <span className="font-semibold text-brand">
        ✕ Vencido, <span className="num">{formatarDia(dia)}</span>
      </span>
    );
  if (estado === "hoje") return <span className="font-semibold text-wa">! Hoje</span>;
  return <span className="num text-ink">{formatarDia(dia)}</span>;
}

/** Linha do prazo para a ficha: "! 36 dias sem interação · limite 90". */
export function TextoPrazo({ faixa, dias, comecou }: { faixa: Faixa; dias: number; comecou: boolean }) {
  const f = FAIXAS[faixa];
  return (
    <span className={clsx("font-semibold", f.classe)}>
      <span aria-hidden>{f.sinal} </span>
      <span className="num">{dias}</span> {dias === 1 ? "dia" : "dias"} {comecou ? "sem interação" : "desde que recebeu"}
      <span className="font-normal text-concrete">
        {" "}
        · limite <span className="num">{LIMITE_DIAS}</span>
      </span>
    </span>
  );
}

/** Botões de escolha (tipo, filtro). */
export function Opcao({
  marcado,
  onClick,
  children,
  className,
}: {
  marcado: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={onClick}
      className={clsx(
        "opcao focus-ring rounded-sm border py-2 text-[13px] font-semibold transition-colors",
        /\bpx-/.test(className ?? "") ? null : "px-3",
        marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Próximo contato (só o dia, opcional): atalhos de 7, 15 e 30 dias e o campo de data. */
export function CampoDiaContato({
  valor,
  onChange,
  id,
}: {
  valor: string;
  onChange: (v: string) => void;
  id: string;
}) {
  const hoje = diaLocal(new Date());
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-2">
        {ATALHOS_PROXIMO.map((n) => {
          const dia = somarDias(hoje, n);
          return (
            <Opcao key={n} marcado={valor === dia} onClick={() => onChange(valor === dia ? "" : dia)} className="px-1">
              <span className="num">{n}</span> dias
            </Opcao>
          );
        })}
        <Opcao marcado={!valor} onClick={() => onChange("")} className="px-1">
          Sem data
        </Opcao>
      </div>
      <label className="sr-only" htmlFor={id}>
        Dia do próximo contato
      </label>
      <input id={id} type="date" className="input num" min={hoje} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Os campos do cadastro (novo e edição). Regiões em lista fechada, por cidade, mais "Outra". */
export function CamposCadastro({
  campos,
  setCampos,
  regioes,
  idBase,
}: {
  campos: CamposParceiro;
  setCampos: React.Dispatch<React.SetStateAction<CamposParceiro>>;
  regioes: Regiao[];
  idBase: string;
}) {
  const muda = (k: keyof CamposParceiro) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCampos((c) => ({ ...c, [k]: v }));
  };
  // Funcional: dois toques rápidos não se perdem (armadilha do CLAUDE.md).
  const alternar = (codigo: string) =>
    setCampos((c) => ({
      ...c,
      regioes: c.regioes.includes(codigo) ? c.regioes.filter((x) => x !== codigo) : [...c.regioes, codigo],
    }));
  const grupos = agruparRegioes(regioes);
  // Região que já estava no parceiro e foi desativada: continua marcada e visível.
  const inativas = regioes.filter((r) => !r.ativo && campos.regioes.includes(r.codigo));
  return (
    <div className="grid gap-3">
      <div>
        <label className="field-label" htmlFor={`${idBase}-nome`}>
          Nome
        </label>
        <input id={`${idBase}-nome`} className="input" autoComplete="off" value={campos.nome} onChange={muda("nome")} />
      </div>
      <div>
        <label className="field-label" htmlFor={`${idBase}-empresa`}>
          Empresa
        </label>
        <input
          id={`${idBase}-empresa`}
          className="input"
          placeholder="Deixe vazio se for autônomo"
          value={campos.empresa}
          onChange={muda("empresa")}
        />
      </div>
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="mb-2 text-[13px] text-ink-soft md:col-span-2">Informe WhatsApp ou CRECI</legend>
        <div>
          <label className="field-label" htmlFor={`${idBase}-whatsapp`}>
            WhatsApp
          </label>
          <input
            id={`${idBase}-whatsapp`}
            className="input num"
            inputMode="tel"
            placeholder="(11) 90000-0000"
            value={campos.whatsapp}
            onChange={muda("whatsapp")}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idBase}-creci`}>
            CRECI
          </label>
          <input
            id={`${idBase}-creci`}
            className="input"
            value={campos.creci}
            onChange={muda("creci")}
          />
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor={`${idBase}-email`}>
          E-mail
        </label>
        <input
          id={`${idBase}-email`}
          className="input"
          type="email"
          inputMode="email"
          placeholder="nome@exemplo.com.br"
          value={campos.email}
          onChange={muda("email")}
        />
      </div>
      <fieldset>
        <legend className="field-label">Região de atuação</legend>
        <p className="mb-2 text-[13px] text-ink-soft">Marque quantas quiser.</p>
        <div className="grid gap-3">
          {grupos.map((g) => (
            <div key={g.cidade}>
              <span className="eyebrow mb-1">{g.cidade}</span>
              <div className="flex flex-wrap gap-2">
                {g.itens.map((r) => (
                  <Opcao key={r.codigo} marcado={campos.regioes.includes(r.codigo)} onClick={() => alternar(r.codigo)}>
                    {r.nome === g.cidade ? "Cidade toda" : r.nome}
                  </Opcao>
                ))}
              </div>
            </div>
          ))}
          {inativas.length > 0 && (
            <div>
              <span className="eyebrow mb-1">Fora da lista</span>
              <div className="flex flex-wrap gap-2">
                {inativas.map((r) => (
                  <Opcao key={r.codigo} marcado onClick={() => alternar(r.codigo)}>
                    {r.nome} ({r.cidade})
                  </Opcao>
                ))}
              </div>
            </div>
          )}
          <div>
            <Opcao marcado={campos.outra} onClick={() => setCampos((c) => ({ ...c, outra: !c.outra }))}>
              + Outra
            </Opcao>
            {campos.outra && (
              <div className="mt-2">
                <label className="field-label" htmlFor={`${idBase}-outra`}>
                  Outra região
                </label>
                <input
                  id={`${idBase}-outra`}
                  className="input"
                  placeholder="Ex.: Pauliceia, Guarulhos"
                  maxLength={160}
                  value={campos.regiao_outra}
                  onChange={muda("regiao_outra")}
                />
              </div>
            )}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
