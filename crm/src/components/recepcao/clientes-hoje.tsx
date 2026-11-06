"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { normalizarWhatsapp } from "@/lib/leads";
import { horaCheia, nomeTipo, type ClienteHoje, type Midia } from "@/lib/recepcao";
import { corrigirCliente } from "@/lib/recepcao-dados";

/** A lista do stand no dia, a mais nova primeiro, com Corrigir em cada linha. */
export function ClientesDeHoje({
  clientes,
  midias,
  standNome,
  tela,
  onMudou,
}: {
  clientes: ClienteHoje[];
  midias: Midia[];
  standNome: string;
  tela: "pc" | "celular";
  onMudou: () => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  // A tabela só cabe com folga: abaixo de 600px de coluna (o PC a 900–1200px),
  // ficam as linhas compactas do celular, com Corrigir junto do nome.
  const caixa = useRef<HTMLElement>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const comoTabela = tela === "pc" && largura >= 600;
  const ativos = clientes.filter((c) => c.status === "ativo");
  const nomeMidia = (s: string) => midias.find((m) => m.slug === s)?.nome ?? s;
  const atendeu = (c: ClienteHoje) =>
    c.parceiro ? `Parceiro ${c.parceiro}` : c.anunciado && c.anunciado !== c.corretor ? `${c.anunciado} · indicou ${c.corretor}` : c.corretor ?? "–";

  return (
    <section ref={caixa} className="card" aria-labelledby="t-clientes">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="eyebrow">Clientes de hoje · {standNome}</span>
          <h2 id="t-clientes" className="titulo-card mt-1">
            <span className="num">{ativos.length}</span> {ativos.length === 1 ? "cliente" : "clientes"}
          </h2>
        </div>
        <span className="text-[12px] text-concrete">Os dias anteriores só pela busca do Retorno</span>
      </div>

      {!clientes.length && <p className="mt-3 text-[13px] text-ink-soft">Nenhum cliente ainda. O primeiro que chegar aparece aqui.</p>}

      {comoTabela && clientes.length > 0 && (
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              {["Hora", "Tipo", "Cliente", "Atendeu", "Especialista", "Como conheceu", ""].map((t) => (
                <th key={t} className="text-[11px] font-semibold uppercase tracking-eyebrow text-concrete border-b border-line py-2 pr-2">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) =>
              editando === c.id ? (
                <tr key={c.id}>
                  <td colSpan={7} className="border-b border-line py-2">
                    <Corrigir cliente={c} midias={midias} onFechar={() => setEditando(null)} onSalvo={onMudou} />
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className={clsx(c.status === "cancelado" && "text-concrete line-through")}>
                  <td className="num whitespace-nowrap border-b border-line py-2 pr-2 align-top">{horaCheia(c.registrado_em)}</td>
                  <td className="border-b border-line py-2 pr-2 align-top">
                    <span className="selo">{nomeTipo(c.tipo)}</span>
                    {c.antes_da_vez && <span className="mt-1 block text-[11px] text-concrete">antes da vez</span>}
                  </td>
                  <td className="border-b border-line py-2 pr-2 align-top">
                    <b>{c.cliente_nome}</b>
                    <span className="block text-[12px] text-concrete">
                      {[c.final_telefone ? `final ${c.final_telefone}` : "sem telefone", c.veio_sozinho ? "veio sozinho" : `com ${c.acompanhante}`].join(" · ")}
                    </span>
                  </td>
                  <td className="border-b border-line py-2 pr-2 align-top">
                    {atendeu(c)}
                    {c.parceiro && c.gerente && <span className="block text-[12px] text-concrete">gerente {c.gerente}</span>}
                    {c.encontrado_na_carteira === true && <span className="block text-[12px] font-semibold text-ok">✓ Já estava na carteira</span>}
                    {c.encontrado_na_carteira === false && <span className="block text-[12px] font-semibold text-wa">! Lead criado</span>}
                  </td>
                  <td className="border-b border-line py-2 pr-2 align-top">{c.especialista ?? "–"}</td>
                  <td className="border-b border-line py-2 pr-2 align-top text-ink-soft">{c.midias.map(nomeMidia).join(", ") || "–"}</td>
                  <td className="whitespace-nowrap border-b border-line py-2 text-right align-top">
                    {c.status === "cancelado" ? (
                      <span className="text-[12px] no-underline">– Desfeito</span>
                    ) : (
                      <button type="button" className="btn btn-ghost focus-ring px-2 py-[5px] text-[12px]" onClick={() => setEditando(c.id)}>
                        Corrigir
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      {!comoTabela && clientes.length > 0 && (
        <ul className="mt-2">
          {clientes.map((c) => (
            <li key={c.id} className="border-t border-line py-3 first:border-t-0">
              {editando === c.id ? (
                <Corrigir cliente={c} midias={midias} onFechar={() => setEditando(null)} onSalvo={onMudou} />
              ) : (
                <div className={clsx("flex items-start justify-between gap-2", c.status === "cancelado" && "text-concrete line-through")}>
                  <div className="min-w-0">
                    <p className="text-[12px]">
                      <span className="num text-ink-soft">{horaCheia(c.registrado_em)}</span> <span className="selo">{nomeTipo(c.tipo)}</span>
                    </p>
                    <p className="mt-1 font-bold">{c.cliente_nome}</p>
                    <p className="text-[12px] text-concrete">
                      {[atendeu(c), c.especialista, c.midias.map(nomeMidia).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {c.status === "ativo" && (
                    <button type="button" className="btn btn-ghost focus-ring shrink-0" onClick={() => setEditando(c.id)}>
                      Corrigir
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[12px] text-concrete">Corrigir sem motivo até 30 min depois; depois, com motivo. Para trocar o tipo ou quem atendeu, use Desfazer e registre de novo.</p>
    </section>
  );
}

function Corrigir({ cliente, midias, onFechar, onSalvo }: { cliente: ClienteHoje; midias: Midia[]; onFechar: () => void; onSalvo: () => void }) {
  const [marcadas, setMarcadas] = useState<string[]>(cliente.midias);
  const [nome, setNome] = useState(cliente.cliente_nome);
  const [telefone, setTelefone] = useState("");
  const [sozinho, setSozinho] = useState(cliente.veio_sozinho);
  const [acompanhante, setAcompanhante] = useState(cliente.acompanhante ?? "");
  const [empreendimento, setEmpreendimento] = useState(cliente.empreendimento ?? "");
  const [observacao, setObservacao] = useState(cliente.observacao ?? "");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pedeMotivo = !cliente.pode_corrigir_sem_motivo;
  const inp = "input md:py-[8px] md:text-[14px]";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const numero = telefone.trim() ? normalizarWhatsapp(telefone) : null;
    if (telefone.trim() && !numero) return setErro("Confira o telefone.");
    if (!sozinho && !acompanhante.trim()) return setErro("Digite o nome do acompanhante ou marque Veio sozinho.");
    if (pedeMotivo && !motivo.trim()) return setErro("Escreva o motivo da correção.");
    setSalvando(true);
    const r = await corrigirCliente(
      cliente.id,
      {
        midias: marcadas,
        nome: nome.trim(),
        ...(numero ? { whatsapp: numero } : {}),
        veio_sozinho: sozinho,
        acompanhante: sozinho ? null : acompanhante.trim(),
        empreendimento: empreendimento.trim(),
        observacao: observacao.trim(),
      },
      motivo.trim() || null,
    );
    setSalvando(false);
    if (r.erro !== undefined) return setErro(r.erro);
    onFechar();
    onSalvo();
  }

  return (
    <form className="grid gap-3 rounded-sm border border-control bg-paper p-3" onSubmit={salvar} noValidate>
      <p className="font-semibold">Corrigir · {cliente.cliente_nome}</p>
      <div className="flex flex-wrap gap-2">
        {midias
          .filter((m) => m.ativo || marcadas.includes(m.slug))
          .map((m) => (
            <button
              key={m.slug}
              type="button"
              aria-pressed={marcadas.includes(m.slug)}
              className={clsx(
                "opcao focus-ring rounded-sm border px-2 py-[5px] text-[12px] font-semibold",
                marcadas.includes(m.slug) ? "border-ink bg-ink text-surface" : "border-control bg-surface",
              )}
              onClick={() => setMarcadas((x) => (x.includes(m.slug) ? x.filter((y) => y !== m.slug) : [...x, m.slug]))}
            >
              {marcadas.includes(m.slug) ? "✓ " : ""}
              {m.nome}
            </button>
          ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="field-label" htmlFor={`k-nome-${cliente.id}`}>Cliente</label>
          <input id={`k-nome-${cliente.id}`} className={inp} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`k-tel-${cliente.id}`}>
            Telefone{cliente.final_telefone ? ` · hoje final ${cliente.final_telefone}` : ""}
          </label>
          <input
            id={`k-tel-${cliente.id}`}
            className={clsx(inp, "num")}
            type="tel"
            inputMode="tel"
            placeholder="Só se for trocar"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`k-acomp-${cliente.id}`}>Acompanhante</label>
          <div className="flex gap-2">
            <input
              id={`k-acomp-${cliente.id}`}
              className={inp}
              disabled={sozinho}
              value={sozinho ? "" : acompanhante}
              onChange={(e) => setAcompanhante(e.target.value)}
            />
            <button
              type="button"
              aria-pressed={sozinho}
              className={clsx("focus-ring shrink-0 rounded-sm border px-2 text-[12px] font-semibold", sozinho ? "border-ink bg-ink text-surface" : "border-control bg-surface")}
              onClick={() => setSozinho((s) => !s)}
            >
              Sozinho
            </button>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor={`k-emp-${cliente.id}`}>Empreendimento</label>
          <input id={`k-emp-${cliente.id}`} className={inp} list="lista-emp" value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`k-obs-${cliente.id}`}>Observação</label>
          <input id={`k-obs-${cliente.id}`} className={inp} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>
      {pedeMotivo && (
        <div>
          <label className="field-label" htmlFor={`k-mot-${cliente.id}`}>Motivo da correção · passou de 30 min</label>
          <input id={`k-mot-${cliente.id}`} className={inp} maxLength={280} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
      )}
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-ghost focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar correção"}
        </button>
        <button type="button" className="btn btn-ghost focus-ring border-transparent" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
