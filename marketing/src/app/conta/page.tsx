"use client";

import { Casca } from "@/components/casca";
import { Aparencia } from "@/components/alicerce/aparencia";
import { Ajustes } from "@/components/alicerce/ajustes";
import { Ajuste } from "@/components/alicerce/ajuste";
import { Cartao } from "@/components/alicerce/cartao";
import { useSessao } from "@/lib/sessao";
import { nomePerfil } from "@/lib/tipos";

/** O índice de Minha conta (fora do componente: o observador do Ajustes depende dele). */
const INDICE = [
  { id: "dados", rotulo: "Seus dados" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "mais", rotulo: "Senha, avisos e app" },
];

/**
 * Minha conta do Marketing, com a estrutura de MinhaConta (guia): índice à esquerda, seções em Cartao.
 * Aparência vale em todos os módulos (mesma origem, mesma escolha). WhatsApp, avisos no celular, senha e
 * instalar ficam no Vendas: o Marketing não os tem (a Aparência é a única seção que salva aqui).
 */
export default function ContaPage() {
  return (
    <Casca titulo="Minha conta">
      <Conta />
    </Casca>
  );
}

function Conta() {
  const { estado } = useSessao();
  if (estado.fase !== "pronto") return null;
  const perfil = estado.perfil;
  return (
    <>
      <h1 className="mb-visualmente-oculto">Minha conta</h1>
      <header className="mb-cabecalho mb-cabecalho--compacto">
        <div className="mb-cabecalho__texto">
          <p className="mb-cabecalho__subtitulo">
            {perfil.nome} · {nomePerfil(perfil.perfil)} · {perfil.email}
          </p>
        </div>
      </header>
      <Ajustes indice={INDICE}>
        <Cartao id="t-dados" secao="dados" titulo="Seus dados" descricao="Para trocar, fale com o gerente geral.">
          <div className="mkt-campos">
          {/* Campo bloqueado (guia MinhaConta, seção 1): o rótulo ganha "· só leitura" pelo CSS do Alicerce. */}
          <label className="mb-campo mb-campo--bloqueado">
            <span className="mb-campo__rotulo">Nome</span>
            <input className="mb-campo__entrada" value={perfil.nome} readOnly />
          </label>
          <label className="mb-campo mb-campo--bloqueado">
            <span className="mb-campo__rotulo">E-mail</span>
            <input className="mb-campo__entrada" value={perfil.email} readOnly />
          </label>
          </div>
        </Cartao>
        <Aparencia />
        <Cartao id="t-mais" secao="mais" titulo="Senha, avisos e app" descricao="Ficam em Minha conta do Base360 Vendas.">
          <Ajuste rotulo="Trocar senha, avisos neste aparelho e instalar no celular">
            {/* <a> comum, não o Link: o Vendas é um site irmão, fora do basePath do Marketing. */}
            <a className="mb-botao mb-botao--secundario mb-botao--p" href="/vendas/conta/">
              Abrir no Vendas
            </a>
          </Ajuste>
        </Cartao>
      </Ajustes>
    </>
  );
}
