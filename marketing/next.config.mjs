/**
 * Exportação estática: `npm run build` gera a pasta de publicação, que vai para
 * base360.mbigucci.com.br/marketing, ao lado do Vendas (/vendas). Mesma origem,
 * então a sessão do Supabase é a mesma: um login só.
 * Não há servidor: login e dados vêm do Supabase pelo navegador. O direcionador
 * só aparece para o gerente geral, por regra fixa no banco (is_gerente_geral).
 * @type {import('next').NextConfig}
 */
const basePath = process.env.BASE_PATH ?? "/marketing";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
