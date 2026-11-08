// Cópia gerada de crm/src/components/alicerce/logo-mbigucci.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * Logo MBigucci do Alicerce (project/components/MarcaBase360): .mb-logo-mbigucci recorta o
 * mbigucci-logotipo.png pelo retângulo (o arquivo traz um lema em branco embaixo). Vai no rodapé do menu
 * lateral e no fim da folha do celular, nunca ao lado do lockup. O PNG vem junto do Alicerce, em
 * public/alicerce/ (copiado do artifact, sem edição); com o basePath, fica em <base>/alicerce/.
 */
export function LogoMBigucci() {
  return (
    <span className="mb-logo-mbigucci">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/alicerce/mbigucci-logotipo.png`} alt="MBigucci" />
    </span>
  );
}
