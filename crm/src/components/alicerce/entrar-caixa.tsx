import { MarcaBase360 } from "./marca-base360";
import { LogoMBigucci } from "./logo-mbigucci";

/**
 * A moldura de Entrar do Alicerce (project/components/Entrar): a página inteira no fundo, centralizada
 * (`.mb-entrar`), com o lockup do módulo, o cartão (`children`) e o rodapé com o logo MBigucci e a frase de
 * quem procurar. Sem menu nem topo: o título da tela é o do cartão.
 */
export function EntrarCaixa({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-entrar">
      <div className="mb-entrar__caixa">
        <div className="mb-entrar__marca">
          <MarcaBase360 modulo={modulo} />
        </div>
        {children}
        <div className="mb-entrar__rodape">
          <LogoMBigucci />
          <span>Não tem acesso ou esqueceu a senha? Fale com o gerente geral.</span>
        </div>
      </div>
    </div>
  );
}
