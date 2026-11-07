import { Casca } from "@/components/casca";
import { EstadoDePagina, LinkDoEstado } from "@/components/alicerce/estado-de-pagina";

/**
 * 404 em português (item 48, passo d): EstadosDePagina "Não encontrado" dentro da moldura do Vendas, para quem
 * está logado; quem não está vai para Entrar, como em qualquer página interna.
 */
export default function NaoEncontrado() {
  return (
    <Casca titulo="Página não encontrada" migrada>
      <EstadoDePagina
        tipo="nao-encontrado"
        titulo="Esta página não existe ou mudou de endereço"
        texto="Confira o endereço. Se o link veio de uma mensagem antiga, volte ao início e procure por lá."
        acoes={<LinkDoEstado href="/">Ir para o início</LinkDoEstado>}
      />
    </Casca>
  );
}
