import { Icone } from "./icone";

/**
 * Aviso do Alicerce (project/components/Aviso): a mensagem dentro da página, no ponto onde importa, sem
 * pop-up. Título como fato, texto como próximo passo. `role="alert"` só para o erro; os outros, `status`.
 * `tom="info"` gera `mb-aviso--info` como no preview (o Duplicado usa); sem tom, o aviso neutro.
 * `acoes` vai em `.mb-aviso__acoes` (os botões do Duplicado).
 */
export function Aviso({ tom, titulo, texto, acoes }: { tom?: "info" | "sucesso" | "alerta" | "erro"; titulo: string; texto?: string; acoes?: React.ReactNode }) {
  return (
    <div className={`mb-aviso${tom ? ` mb-aviso--${tom}` : ""}`} role={tom === "erro" ? "alert" : "status"}>
      <Icone nome={tom ?? "info"} />
      <div className="mb-aviso__conteudo">
        <span className="mb-aviso__titulo">{titulo}</span>
        {texto && <span className="mb-aviso__texto">{texto}</span>}
        {acoes && <div className="mb-aviso__acoes">{acoes}</div>}
      </div>
    </div>
  );
}
