import clsx from "clsx";

/**
 * NavegadorDePeriodo do Alicerce (project/components/NavegadorDePeriodo): andar pelo tempo numa agenda ou num
 * painel. “← Anterior · 02/11 a 08/11/2026 · Seguinte →”, sempre com a palavra (nunca só a seta), e “Voltar para
 * hoje”, que só aparece quando o período não é o atual (`aoVoltar`). O rótulo avisa a troca ao leitor de tela
 * (`aria-live`). No celular, as setas e o rótulo ficam numa linha e “Voltar para hoje” embaixo, centralizado
 * (o CSS faz). Os botões são botões: a tela decide o endereço pelo estado dela.
 */
export function NavegadorDePeriodo({
  nome = "Período",
  rotulo,
  aoAnterior,
  aoSeguinte,
  aoVoltar,
}: {
  /** O que o `nav` navega, para o leitor de tela (“Semana”, “Mês”). */
  nome?: string;
  rotulo: string;
  aoAnterior: () => void;
  aoSeguinte: () => void;
  aoVoltar?: () => void;
}) {
  return (
    <nav className="mb-periodo" aria-label={nome}>
      <button className="mb-botao mb-botao--secundario mb-botao--p" type="button" onClick={aoAnterior}>
        ← Anterior
      </button>
      <span className="mb-periodo__rotulo" aria-live="polite">
        {rotulo}
      </span>
      <button className="mb-botao mb-botao--secundario mb-botao--p" type="button" onClick={aoSeguinte}>
        Seguinte →
      </button>
      {aoVoltar && (
        <button className="mb-botao mb-botao--discreto mb-botao--p mb-periodo__hoje" type="button" onClick={aoVoltar}>
          Voltar para hoje
        </button>
      )}
    </nav>
  );
}

/**
 * A semana de 7 dias (`.mb-semana`, também no celular): nome curto, número e quantos compromissos (“–” quando não
 * há). O dia escolhido é tinta (`aria-pressed`); hoje leva contorno e um traço embaixo, sem vermelho. O
 * `rotuloAcessivel` de cada dia diz a data e a contagem por extenso.
 */
export function SemanaDeDias({
  dias,
}: {
  dias: { chave: string; nome: string; numero: string; contagem: number; rotuloAcessivel: string; hoje: boolean; escolhido: boolean; aoEscolher: () => void }[];
}) {
  return (
    <div className="mb-semana" role="group" aria-label="Dias da semana">
      {dias.map((d) => (
        <button
          key={d.chave}
          className={clsx("mb-semana__dia", d.hoje && "mb-semana__dia--hoje")}
          type="button"
          aria-pressed={d.escolhido}
          aria-label={d.rotuloAcessivel}
          onClick={d.aoEscolher}
        >
          <span className="mb-semana__nome">{d.nome}</span>
          <span className="mb-semana__numero">{d.numero}</span>
          <span className="mb-semana__contagem">{d.contagem > 0 ? d.contagem : "–"}</span>
        </button>
      ))}
    </div>
  );
}
