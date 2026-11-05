/**
 * Exportação estática: `npm run build` gera a pasta `out/`, que vai por FTP para o
 * servidor. O módulo de Vendas do Base360 fica na raiz do próprio subdomínio
 * (vendas.base360.mbigucci.com.br), então o BASE_PATH padrão é vazio. Subdomínio próprio
 * isola a origem: scripts do site institucional não alcançam a sessão do Supabase.
 * Não há servidor: login e dados vêm do Supabase pelo navegador, protegidos por RLS.
 * @type {import('next').NextConfig}
 */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
