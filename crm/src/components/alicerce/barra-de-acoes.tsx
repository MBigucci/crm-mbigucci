/**
 * BarraDeAcoes do Alicerce (project/components/BarraDeAcoes), a versão de uma ação só para o celular
 * (`.mb-barra-acoes--unica`, botão na largura toda, 44px) e, com `grupo`, a de duas ações (`.mb-grupo-botoes`).
 * Só aparece abaixo de 768px (`.mb-so-celular`); no computador a ação fica no `.mb-cartao__rodape` do formulário
 * (a tela passa o mesmo botão para os dois). Vai como último filho do formulário: a barra é sticky e fica no pé.
 */
export function BarraDeAcoes({ grupo = false, children }: { grupo?: boolean; children: React.ReactNode }) {
  return <div className={`mb-barra-acoes${grupo ? "" : " mb-barra-acoes--unica"} mb-so-celular`}>{grupo ? <div className="mb-grupo-botoes">{children}</div> : children}</div>;
}
