// Cópia gerada de crm/src/components/alicerce/aparencia.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useEffect, useState } from "react";
import { mb, type NomePreferencia } from "./mb";

/**
 * Aparencia do Alicerce (project/components/Aparencia): o mesmo HTML e as mesmas classes do preview,
 * com o estado no React e a troca pelo MB.preferencias. A escolha fica neste aparelho; salvar na conta
 * está fora do item 48 (pede coluna nova no banco).
 */
const LINHAS: { nome: NomePreferencia; id: string; rotulo: string; ajuda: string; opcoes: [string, string][] }[] = [
  {
    nome: "tema",
    id: "ap-tema",
    rotulo: "Tema",
    ajuda: "Automático segue o claro ou escuro do aparelho. Grafite para pouca luz ou para o dia inteiro na tela.",
    opcoes: [["auto", "Automático"], ["papel", "Papel"], ["grafite", "Grafite"]],
  },
  { nome: "menu", id: "ap-menu", rotulo: "Menu", ajuda: "A cor do fundo da barra lateral.", opcoes: [["claro", "Claro"], ["escuro", "Grafite"]] },
  {
    nome: "acao",
    id: "ap-acao",
    rotulo: "Botão principal",
    ajuda: "Com vermelho, excluir e cancelar ficam em grafite.",
    opcoes: [["grafite", "Grafite"], ["marca", "Vermelho"]],
  },
  {
    nome: "movimento",
    id: "ap-mov",
    rotulo: "Movimento",
    ajuda: "Reduzido tira a entrada dos cards e o hover que sobe.",
    opcoes: [["normal", "Normal"], ["reduzido", "Reduzido"]],
  },
];

type Valores = Partial<Record<NomePreferencia, string>>;

function lerValores(): Valores {
  const m = mb();
  if (!m) return {};
  return Object.fromEntries(LINHAS.map((l) => [l.nome, m.preferencias.atual(l.nome)]));
}

export function Aparencia() {
  const [valores, setValores] = useState<Valores>({});

  useEffect(() => {
    const atualizar = () => setValores(lerValores());
    atualizar();
    document.addEventListener("mb-preferencias", atualizar);
    return () => document.removeEventListener("mb-preferencias", atualizar);
  }, []);

  return (
    <section className="mb-cartao" id="aparencia" aria-labelledby="t-aparencia">
      <header className="mb-cartao__cabecalho">
        <div>
          <h2 className="mb-cartao__titulo" id="t-aparencia">Aparência</h2>
          <p className="mb-cartao__descricao">Vale para você, em todos os módulos do Base360.</p>
        </div>
      </header>
      <div className="mb-cartao__corpo">
        <div className="mb-aparencia">
          {LINHAS.map((l) => (
            <div className="mb-aparencia__linha" key={l.nome}>
              <div className="mb-aparencia__texto">
                <span className="mb-aparencia__rotulo" id={l.id}>{l.rotulo}</span>
                <span className="mb-aparencia__ajuda">{l.ajuda}</span>
              </div>
              <div className="mb-segmentado" role="group" aria-labelledby={l.id} data-mb-preferencia={l.nome}>
                {l.opcoes.map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    value={valor}
                    aria-pressed={valores[l.nome] === valor}
                    onClick={() => mb()?.preferencias.aplicar(l.nome, valor)}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <footer className="mb-cartao__rodape">
        <span className="mb-aparencia__padrao">Padrão do Base360 Vendas: tema automático, menu claro e botão grafite.</span>
        <button className="mb-botao mb-botao--discreto mb-botao--p" type="button" data-mb-padrao onClick={() => mb()?.preferencias.voltarAoPadrao()}>
          Voltar ao padrão
        </button>
      </footer>
    </section>
  );
}
