// Cópia gerada de crm/src/components/alicerce/estado-vazio.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
import { Icone } from "./icone";
import type { NomeIcone } from "./icones.gerado.ts";

/**
 * EstadoVazio do Alicerce (project/components/EstadoVazio): no lugar de uma lista sem itens, o motivo e o
 * próximo passo. Título que diz o fato, uma frase e, no máximo, uma ação secundária (`acao`, já com a classe
 * `.mb-botao.mb-botao--secundario.mb-botao--p`). Nunca botão primário.
 */
export function EstadoVazio({
  icone = "caixa-vazia",
  titulo,
  texto,
  acao,
}: {
  icone?: NomeIcone;
  titulo: string;
  texto: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-vazio">
      <Icone nome={icone} />
      <h3 className="mb-vazio__titulo">{titulo}</h3>
      <p className="mb-vazio__texto">{texto}</p>
      {acao}
    </div>
  );
}
