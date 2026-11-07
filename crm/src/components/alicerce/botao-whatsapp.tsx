/**
 * WhatsApp do Alicerce (project/components/BotaoExterno): o botão verde, sempre com a palavra “WhatsApp”.
 * No Vendas o toque abre antes a mensagem pronta (o diálogo do app), então é um <button> e não o <a href>
 * do preview. O CSS desenha o ícone de conversa; o rótulo termina em → porque a ação sai do sistema.
 * `rotuloAcessivel` diz de quem é o botão (há um por card).
 */
export function BotaoWhatsapp({
  onClick,
  rotulo = "WhatsApp →",
  rotuloAcessivel,
}: {
  onClick: () => void;
  rotulo?: string;
  rotuloAcessivel?: string;
}) {
  return (
    <button className="mb-botao mb-botao--whatsapp" type="button" aria-haspopup="dialog" aria-label={rotuloAcessivel} onClick={onClick}>
      {rotulo}
    </button>
  );
}
