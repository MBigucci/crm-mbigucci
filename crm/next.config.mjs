/**
 * Exportação estática: `npm run build` gera a pasta `out/`, que vai por FTP para o
 * servidor. O módulo de Vendas do Base360 fica em base360.mbigucci.com.br/vendas: um site
 * estático próprio (fora do WordPress), com o portal na raiz. A origem fica isolada do site
 * institucional, cujos scripts não alcançam a sessão do Supabase.
 * Não há servidor: login e dados vêm do Supabase pelo navegador, protegidos por RLS.
 * @type {import('next').NextConfig}
 */
const basePath = process.env.BASE_PATH ?? "/vendas";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
