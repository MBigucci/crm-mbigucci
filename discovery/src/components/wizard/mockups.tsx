/** Mini-ilustrações em CSS das duas formas de trabalhar (o DS não tem biblioteca de ícones). */

export function MockKanban() {
  const colunas = [
    { nome: "Novo", n: 3 },
    { nome: "Contato", n: 2 },
    { nome: "Visita", n: 1 },
  ];
  return (
    <div aria-hidden className="mt-3 grid grid-cols-3 gap-[6px]">
      {colunas.map((c) => (
        <div key={c.nome} className="rounded-sm border border-line bg-paper p-[6px]">
          <div className="mb-[5px] text-[9px] font-semibold uppercase tracking-eyebrow text-concrete">{c.nome}</div>
          <div className="space-y-[4px]">
            {Array.from({ length: c.n }).map((_, i) => (
              <div key={i} className="relative h-[16px] rounded-sm border border-line bg-surface">
                <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-ink" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MockListaDia() {
  const itens = [
    { nome: "Ana Souza", nota: "Retornar proposta", hora: "09:30" },
    { nome: "Carlos Lima", nota: "Agendar visita", hora: "11:00" },
    { nome: "Júlia Reis", nota: "Lead novo · 1º contato", hora: "14:00" },
  ];
  return (
    <div aria-hidden className="mt-3 rounded-sm border border-line bg-paper">
      <div className="border-b border-line px-[8px] py-[5px] text-[9px] font-semibold uppercase tracking-eyebrow text-concrete">
        Hoje · 3 contatos
      </div>
      {itens.map((it) => (
        <div key={it.nome} className="flex items-center gap-2 border-b border-line px-[8px] py-[5px] last:border-0">
          <span className="h-[12px] w-[12px] shrink-0 rounded-sm border border-concrete bg-surface" />
          <span className="min-w-0 flex-1 truncate text-[11px]">
            <b className="font-semibold">{it.nome}</b> <span className="text-ink-soft">· {it.nota}</span>
          </span>
          <span className="num font-display text-[11px] font-bold">{it.hora}</span>
        </div>
      ))}
    </div>
  );
}
