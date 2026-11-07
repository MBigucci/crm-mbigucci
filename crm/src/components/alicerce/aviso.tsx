import { Icone } from "./icone";

/**
 * Aviso do Alicerce (project/components/Aviso): a mensagem dentro da página, no ponto onde importa, sem
 * pop-up. Título como fato, texto como próximo passo. `role="alert"` só para o erro; os outros, `status`.
 * (O passo d completa a peça e troca os avisos antigos.)
 */
export function Aviso({ tom, titulo, texto }: { tom?: "sucesso" | "alerta" | "erro"; titulo: string; texto?: string }) {
  return (
    <div className={`mb-aviso${tom ? ` mb-aviso--${tom}` : ""}`} role={tom === "erro" ? "alert" : "status"}>
      <Icone nome={tom ?? "info"} />
      <div className="mb-aviso__conteudo">
        <span className="mb-aviso__titulo">{titulo}</span>
        {texto && <span className="mb-aviso__texto">{texto}</span>}
      </div>
    </div>
  );
}
