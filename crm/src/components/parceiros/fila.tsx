"use client";

import { formatarDataHora, lerFila, ORIGEM_FILA, type LinhaFila } from "@/lib/parceiros";
import { Recolhivel } from "../alicerce/recolhivel";
import { Lista, ItemDaLista } from "../alicerce/lista";
import { Selo } from "../alicerce/selo";
import { Aviso } from "../alicerce/aviso";

export function LinhaProximoDaVez({ fila, eu }: { fila: LinhaFila[] | null; eu: string }) {
  if (!fila || !lerFila(fila, eu).souProximo) return null;
  return <Aviso tom="info" titulo="Você é o próximo da roleta de parceiros" />;
}

export function VerFila({ fila, eu }: { fila: LinhaFila[] | null; eu: string }) {
  if (!fila || !fila.length) return null;
  const { ordem, ultimo } = lerFila(fila, eu);
  return <Recolhivel titulo="Ver fila da roleta" contagem={`· ${ordem.length}`}>
    <Lista rotulo="Fila da roleta de parceiros">
      {ordem.map((l) => <ItemDaLista key={l.gerente_id} atual={l.gerente_id === eu} ancora={<span className="mb-lista__hora">{l.posicao}.</span>} titulo={l.gerente_id === eu ? "Você" : l.gerente_nome} meta={l.posicao === 1 ? "Próximo da vez" : undefined} />)}
    </Lista>
    {ultimo && <p className="mb-campo__ajuda">Último a receber: {ultimo.gerente_id === eu ? "você" : ultimo.gerente_nome} · {formatarDataHora(ultimo.ultima_vez_em)} {ultimo.ultima_origem && <Selo>{ORIGEM_FILA[ultimo.ultima_origem]}</Selo>}</p>}
    <p className="mb-campo__ajuda">Entram os parceiros do link, do estande e os que trocam de gerente por 90 dias. Cadastro à mão não conta como vez.</p>
  </Recolhivel>;
}
