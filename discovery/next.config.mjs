/**
 * Exportação estática: `npm run build` gera a pasta `out/`, que vai por FTP para o
 * servidor do WordPress. BASE_PATH é a pasta onde ela fica no site (ex.: /pesquisa).
 * @type {import('next').NextConfig}
 */
const basePath = process.env.BASE_PATH ?? "/pesquisa";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
