// Cópia gerada de crm/src/components/alicerce/barra-superior.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
import Link from "next/link";

/**
 * BarraSuperior do Alicerce (project/components/BarraSuperior): o topo limpo de cada tela no computador,
 * ao lado do MenuLateral. Título da tela, o status do módulo (quando houver), o + Novo do módulo e, na
 * ponta direita, a conta (MenuDaConta, passado em `conta`). Sem sino e sem busca no Vendas: não há fonte
 * de notificações nem busca global, e não fica campo morto na tela. Some abaixo de 768px, onde entra o
 * MenuCelular.
 */
export function BarraSuperior({
  titulo,
  status,
  novo,
  conta,
}: {
  titulo: string;
  /** O status do módulo (.mb-status), com os botões que ele leva. */
  status?: React.ReactNode;
  /** O + do módulo: o objeto que ele cria. Só para quem pode criar. */
  novo?: { href: string; rotulo: string };
  conta: React.ReactNode;
}) {
  return (
    <header className="mb-topo">
      <span className="mb-topo__titulo">{titulo}</span>
      <div className="mb-topo__acoes">
        {status}
        {status && <span className="mb-topo__separador" aria-hidden="true" />}
        {novo && (
          <Link className="mb-botao mb-botao--primario mb-botao--p" href={novo.href}>
            {novo.rotulo}
          </Link>
        )}
        {conta}
      </div>
    </header>
  );
}
