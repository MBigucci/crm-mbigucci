import Link from "next/link";
import { Aviso } from "./aviso";

/**
 * Duplicado do Alicerce (project/components/Duplicado): o aviso de que o WhatsApp já está num lead ativo, logo acima da
 * ação final. Duas formas, como no Alicerce (decisão do Felipe, 07/11/2026; a regra está em lib/duplicado.ts):
 * - `visivel`: a pessoa vê o lead (`--alerta`, com o nome e, para o gerente, o dono); “Abrir o existente” e “Cadastrar
 *   assim mesmo” (`--discreto --p`), o único botão que grava;
 * - `outra-carteira`: existe, mas fora da vista dela (`--info`, sem nome nem telefone do outro registro) e sem botão: o
 *   cadastro não segue; o texto diz o que fazer.
 * A forma “Proibido” (`--erro`) é a de contrato e CPF, que o Vendas não tem.
 */
export type DadosDoDuplicado = { forma: "visivel"; id: string; nome: string; deOutro?: string } | { forma: "outra-carteira"; atribui: boolean };

export function Duplicado({ dados, desabilitado, onSeguir }: { dados: DadosDoDuplicado; desabilitado?: boolean; onSeguir: () => void }) {
  if (dados.forma === "visivel")
    return (
      <Aviso
        tom="alerta"
        titulo="Já existe um lead ativo com este WhatsApp"
        texto={`${dados.nome}${dados.deOutro ? ` · na carteira de ${dados.deOutro}` : ""}`}
        acoes={
          <>
            <Link className="mb-botao mb-botao--secundario mb-botao--p" href={`/leads/ficha/?id=${dados.id}`}>
              Abrir o existente
            </Link>
            <button className="mb-botao mb-botao--discreto mb-botao--p" type="button" disabled={desabilitado} onClick={onSeguir}>
              Cadastrar assim mesmo
            </button>
          </>
        }
      />
    );
  return (
    <Aviso
      tom="info"
      titulo={dados.atribui ? "Este WhatsApp já está num lead ativo de outra equipe" : "Este WhatsApp já está num lead ativo de outro corretor"}
      texto={dados.atribui ? "Confira com a outra equipe antes de cadastrar." : "Confira com seu gerente."}
    />
  );
}
