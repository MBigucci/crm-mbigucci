"use client";

// Tela Direcionador (Base360 Marketing), só do gerente geral, no Alicerce (bloco 7 da fase 2). As regras de
// negócio são as de docs/direcionador/direcionador.md; o que muda é a apresentação, mais as duas mudanças
// aceitas pelo Felipe em 06/11/2026: o Dialogo ao desligar uma regra que distribui e o simulador com Cartao,
// Campo/Seletor/DataHora e Lista. Nenhum nome de destino no código: os nomes vêm do banco (cfg_ler).

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { Dialogo } from "@/components/dialogo";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { CopiarDetalhes, EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Interruptor } from "@/components/alicerce/interruptor";
import { useToast } from "@/components/alicerce/toast";
import { useSessao } from "@/lib/sessao";
import { excluirRegra, lerConfig, lerProdutos, ligarRegra, ordenarRegras, salvarChaveGeral } from "@/lib/direcionador-dados";
import { totalEnviado, type ConfigTela, type DestinoTela, type ProdutoTela, type RegraTela } from "@/lib/telas";
import { Destinos } from "./destinos";
import { EditorDestino } from "./editor-destino";
import { EditorRegra } from "./editor-regra";
import { Regras } from "./regras";
import { Simulador } from "./simulador";

/** O endereço do + Nova regra do topo: a BarraSuperior só aceita um link, então ele abre a tela com o pedido. */
const NOVA_REGRA_HREF = "/direcionador/?nova=1";

export default function Direcionador() {
  return (
    <Casca titulo="Direcionador de leads" soGerenteGeral novo={{ href: NOVA_REGRA_HREF, rotulo: "+ Nova regra" }}>
      <Conteudo />
    </Casca>
  );
}

function Conteudo() {
  const { ehGerenteGeral } = useSessao();
  const toast = useToast();
  const [config, setConfig] = useState<ConfigTela | null>(null);
  const [produtos, setProdutos] = useState<ProdutoTela[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [regraAberta, setRegraAberta] = useState<RegraTela | "nova" | null>(null);
  const [destinoAberto, setDestinoAberto] = useState<DestinoTela | "novo" | null>(null);
  // Cada abertura monta o editor de novo (key): o formulário nasce com os dados da regra ou do destino de agora.
  const [aberturas, setAberturas] = useState({ regra: 0, destino: 0 });
  const abrirRegra = useCallback((r: RegraTela | "nova") => {
    setAberturas((a) => ({ ...a, regra: a.regra + 1 }));
    setRegraAberta(r);
  }, []);
  const abrirDestino = (d: DestinoTela | "novo") => {
    setAberturas((a) => ({ ...a, destino: a.destino + 1 }));
    setDestinoAberto(d);
  };
  /** A regra que a pessoa quer desligar e que já distribuiu leads: espera a confirmação do Dialogo. */
  const [desligando, setDesligando] = useState<{ regra: RegraTela; posicao: number } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([lerConfig(), lerProdutos()]);
      setConfig(c);
      setProdutos(p);
      setErro(c ? null : "Seu perfil não tem acesso a esta página.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // Só o gerente geral chega a pedir: para os outros, o banco devolveria zero linhas.
    if (ehGerenteGeral) void recarregar();
  }, [ehGerenteGeral, recarregar]);

  /** Grava, recarrega e avisa com o Toast; erro vira Toast de erro (fica até fechar). */
  const fazer = useCallback(
    async (acao: () => Promise<unknown>, ok: string, tipo: "sucesso" | "info" = "sucesso") => {
      setOcupado(true);
      try {
        await acao();
        await recarregar();
        toast.mostrar(ok, { tipo });
      } catch (e) {
        toast.mostrar(e instanceof Error ? e.message : String(e), { tipo: "erro" });
      } finally {
        setOcupado(false);
      }
    },
    [recarregar, toast],
  );

  const ligarOuDesligar = (r: RegraTela, k: number) => {
    // Desligar uma regra que já mandou leads muda para onde os próximos vão: pede o Dialogo (guia Interruptor e
    // ConstrutorDeCondicoes). Ligar, ou desligar uma regra que nunca distribuiu, vale na hora.
    if (r.ativa && totalEnviado(r) > 0) return setDesligando({ regra: r, posicao: k + 1 });
    void fazer(() => ligarRegra(r.id, !r.ativa), r.ativa ? `Regra ${k + 1} desligada.` : `Regra ${k + 1} ligada.`, r.ativa ? "info" : "sucesso");
  };

  return (
    <>
      <h1 className="mb-visualmente-oculto">Direcionador de leads</h1>
      <header className="mb-cabecalho mb-cabecalho--compacto">
        <div className="mb-cabecalho__texto">
          <p className="mb-cabecalho__subtitulo">A primeira regra ligada que casar decide para onde vai o lead. Sem regra, ele vai para o Base360 Vendas.</p>
        </div>
      </header>

      <Suspense fallback={null}>
        <PedidoDeNovaRegra disponivel={!!config} onPedido={() => abrirRegra("nova")} />
      </Suspense>

      {erro && (
        <EstadoDePagina
          tipo="erro-de-carga"
          titulo="Não foi possível carregar o Direcionador"
          texto="Pode ser a internet ou o sistema. O que você já salvou continua salvo."
          acoes={
            <button type="button" className="mb-botao mb-botao--primario" onClick={() => void recarregar()}>
              Tentar de novo
            </button>
          }
          detalhe={<CopiarDetalhes codigo={erro} />}
        />
      )}
      {!config && !erro && <CarregandoTabela texto="Carregando o Direcionador…" />}

      {config && (
        <div className="mkt-direcionador">
          <div className="mkt-coluna">
            {/* Um Cartao só com o cabeçalho (título, descrição e a ação à direita): a chave vale na hora, não há corpo. */}
            <section className="mb-cartao" aria-labelledby="t-geral">
              <header className="mb-cartao__cabecalho">
                <div>
                  <h2 className="mb-cartao__titulo" id="t-geral">
                    Chave geral
                  </h2>
                  <p className="mb-cartao__descricao">{config.ativo ? "As regras abaixo valem a cada lead que chega." : "Tudo vai para o Base360 Vendas. As regras ficam guardadas, sem valer."}</p>
                </div>
                <Interruptor
                  ligado={config.ativo}
                  rotulo="Direcionador, chave geral"
                  desativado={ocupado}
                  onAlternar={(v) => void fazer(() => salvarChaveGeral(v), v ? "Direcionador ligado." : "Direcionador desligado. Tudo vai para o Vendas.", v ? "sucesso" : "info")}
                />
              </header>
            </section>
            <Regras
              config={config}
              produtos={produtos}
              ocupado={ocupado}
              onEditar={abrirRegra}
              onNova={() => abrirRegra("nova")}
              onLigar={ligarOuDesligar}
              onMover={(k, para) => {
                const ids = config.regras.map((r) => r.id);
                [ids[k], ids[para]] = [ids[para], ids[k]];
                return fazer(() => ordenarRegras(ids), `Regra agora na posição ${para + 1}.`);
              }}
            />
          </div>
          <div className="mkt-coluna">
            <Simulador config={config} produtos={produtos} />
            <Destinos config={config} onEditar={abrirDestino} />
          </div>
        </div>
      )}

      {config && (
        <EditorRegra
          key={`regra-${aberturas.regra}`}
          aberto={regraAberta !== null}
          config={config}
          produtos={produtos}
          regra={regraAberta === "nova" || regraAberta === null ? null : regraAberta}
          posicao={regraAberta === "nova" || regraAberta === null ? config.regras.length + 1 : config.regras.indexOf(regraAberta) + 1}
          onFechar={() => setRegraAberta(null)}
          onSalvo={async (msg) => {
            setRegraAberta(null);
            await recarregar();
            toast.mostrar(msg, { tipo: "sucesso" });
          }}
          onExcluir={(r) => {
            setRegraAberta(null);
            void fazer(() => excluirRegra(r.id), `Regra excluída: ${r.nome}.`);
          }}
        />
      )}
      {config && (
        <EditorDestino
          key={`destino-${aberturas.destino}`}
          aberto={destinoAberto !== null}
          destino={destinoAberto === "novo" || destinoAberto === null ? null : destinoAberto}
          usado={destinoAberto !== "novo" && destinoAberto !== null && config.regras.some((r) => r.partes.some((p) => p.destino_id === destinoAberto.id))}
          onFechar={() => setDestinoAberto(null)}
          onSalvo={async (msg) => {
            setDestinoAberto(null);
            await recarregar();
            toast.mostrar(msg, { tipo: "sucesso" });
          }}
        />
      )}

      {desligando && (
        <Dialogo
          id="desligar-regra"
          titulo={`Desligar a regra ${desligando.posicao}, ${desligando.regra.nome}?`}
          texto={
            <>
              Os leads que esta regra mandaria passam para a próxima regra ou para o Base360 Vendas. Ela já mandou {totalEnviado(desligando.regra)}{" "}
              {totalEnviado(desligando.regra) === 1 ? "lead" : "leads"} desde que foi salva. Para voltar a valer, é só ligar de novo.
            </>
          }
          rotuloSeguro="Manter ligada"
          rotuloAcao="Desligar regra"
          ocupado={ocupado}
          onFechar={() => setDesligando(null)}
          onConfirmar={() => {
            const { regra, posicao } = desligando;
            setDesligando(null);
            void fazer(() => ligarRegra(regra.id, false), `Regra ${posicao} desligada.`, "info");
          }}
        />
      )}
    </>
  );
}

/**
 * O + Nova regra da BarraSuperior e do MenuCelular é um link (as peças do Alicerce só aceitam href). Ele chega
 * aqui como ?nova=1: abre o painel e tira o pedido do endereço. useSearchParams, na exportação estática, pede o
 * Suspense de fora.
 */
function PedidoDeNovaRegra({ disponivel, onPedido }: { disponivel: boolean; onPedido: () => void }) {
  const parametros = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const pediu = parametros.get("nova") === "1";
  const tratado = useRef(false);
  useEffect(() => {
    if (!pediu) tratado.current = false;
    if (!pediu || !disponivel || tratado.current) return;
    tratado.current = true;
    onPedido();
    router.replace(caminho ?? "/direcionador/");
  }, [pediu, disponivel, onPedido, router, caminho]);
  return null;
}
