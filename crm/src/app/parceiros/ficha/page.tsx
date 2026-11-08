"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { subtituloParceiro } from "@/components/parceiros/card";
import { CabecalhoParceiros, CamposCadastro, ComPermissao, ProximoContatoParceiro, TextoPrazo, TrilhaEstagio } from "@/components/parceiros/partes";
import { RegistrarInteracao } from "@/components/parceiros/registrar-interacao";
import { Cartao } from "@/components/alicerce/cartao";
import { Pares } from "@/components/alicerce/pares";
import { Aviso } from "@/components/alicerce/aviso";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Historico } from "@/components/alicerce/historico";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoDePagina, CopiarDetalhes } from "@/components/alicerce/estado-de-pagina";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { useToast } from "@/components/alicerce/toast";
import { usePerfil, useSessao } from "@/lib/sessao";
import { camposDoParceiro, formatarDia, formatarDataHora, formatarWhatsapp, linkWhatsapp, textoRegioes, validarParceiro, type CamposParceiro, type ParceiroComSituacao } from "@/lib/parceiros";
import { editarParceiro, lerLinhaDoTempo, useCarteira, useGerentes, useRegioes, type ItemLinhaDoTempo } from "@/lib/parceiros-dados";

export default function FichaParceiroPage() {
  return <Casca titulo="Parceiro" migrada><ComPermissao><Suspense fallback={<CarregandoLeads />}><Ficha /></Suspense></ComPermissao></Casca>;
}

function Ficha() {
  const id = useSearchParams().get("id");
  const eu = usePerfil();
  const { pode } = useSessao();
  const veTodos = pode("parceiros.ver_todos");
  const { lista, erro, recarregar } = useCarteira();
  const regioes = useRegioes();
  const gerentes = useGerentes(veTodos);
  const [linha, setLinha] = useState<ItemLinhaDoTempo[] | null>(null);
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const botaoRegistrar = useRef<HTMLButtonElement>(null);
  const botaoEditar = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const carregarLinha = useCallback(async () => {
    if (!id) return;
    const r = await lerLinhaDoTempo(id);
    setLinha(r.itens);
    setErroLinha(r.erro);
  }, [id]);
  useEffect(() => { void carregarLinha(); }, [carregarLinha]);
  const p = lista?.find((x) => x.id === id) ?? null;
  // Preserva os links dos contatos do dia (#registrar), agora abrindo a tarefa no painel.
  const temParceiro = !!p;
  useEffect(() => {
    if (temParceiro && p?.gerente_id === eu.id && window.location.hash === "#registrar") setRegistrando(true);
  }, [temParceiro, p?.gerente_id, eu.id]);
  const voltar = <Link className="mb-botao mb-botao--secundario" href="/parceiros/">Voltar para Parceiros</Link>;
  if (erro) return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar o parceiro" texto="Tente de novo. O que você já salvou continua salvo." detalhe={<CopiarDetalhes codigo={erro} />} acoes={<button type="button" className="mb-botao mb-botao--primario" onClick={() => void recarregar()}>Tentar de novo</button>} />;
  if (!lista) return <CarregandoLeads />;
  if (!id || !p) return <EstadoDePagina tipo="nao-encontrado" titulo="Este parceiro não está mais aqui" texto="Pode ter passado a outro gerente pela regra dos 90 dias, ou o link está errado." acoes={voltar} />;
  const meu = p.gerente_id === eu.id;
  const nomeDono = p.gerente_id ? gerentes.find((g) => g.id === p.gerente_id)?.nome : null;
  const wa = linkWhatsapp(p.whatsapp_norm);
  const depoisDeSalvar = async () => { setAgora(new Date()); await Promise.all([recarregar(), carregarLinha()]); };
  return <div className="pagina-alicerce parcerias-pilha">
    <CabecalhoParceiros titulo={p.nome} subtitulo={<>{subtituloParceiro(p)}{veTodos && <> · Gerente: {meu ? "você" : (nomeDono ?? (p.gerente_id ? "outro gerente" : "sem gerente"))}</>}</>} acoes={meu && <button ref={botaoRegistrar} id="registrar" type="button" className="mb-botao mb-botao--primario" aria-haspopup="dialog" onClick={() => setRegistrando(true)}>Registrar interação</button>} />
    <TrilhaEstagio estagio={p.estagio} />
    {p.reentrada_em && <Aviso tom="alerta" titulo="O parceiro procurou a MBigucci de novo" texto={`${p.nome} procurou em ${formatarDataHora(p.reentrada_em)}. ${meu ? "Continua com você. Registre uma interação para reiniciar os 90 dias." : "Continua com o gerente atual, que recebeu o aviso."}`} />}
    <div className="parcerias-ficha">
      <div className="parcerias-pilha">
        <Cartao id="prazo-parceiro" titulo="Prazo de 90 dias">
          <p><TextoPrazo faixa={p.faixa} dias={p.dias_prazo} comecou={!!p.ultima_interacao_em} /></p>
          <p>{p.dias_restantes > 0 ? `Faltam ${p.dias_restantes} ${p.dias_restantes === 1 ? "dia" : "dias"} para o parceiro passar a outro gerente.` : "Passou dos 90 dias: o parceiro vai para outro gerente na próxima rotina."}</p>
          <p className="mb-campo__ajuda">Editar o cadastro não reinicia o prazo. Só registrar interação.</p>
        </Cartao>
        <Cartao id="contato-parceiro" titulo="Contato" rodape={<>{meu && <button ref={botaoEditar} type="button" className="mb-botao mb-botao--discreto" aria-haspopup="dialog" onClick={() => setEditando(true)}>Editar cadastro</button>}{wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mb-botao mb-botao--whatsapp">WhatsApp →</a>}</>}>
          <Pares itens={[
            { rotulo: "WhatsApp", valor: p.whatsapp_norm ? formatarWhatsapp(p.whatsapp_norm) : "Não informado" },
            { rotulo: "CRECI", valor: p.creci || "Não informado" },
            { rotulo: "E-mail", valor: p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : "Não informado" },
            { rotulo: "Empresa", valor: p.empresa || "Autônomo" },
            { rotulo: "Região", valor: textoRegioes(p.regioes, regioes, p.regiao_outra) || "Não informada" },
            { rotulo: "Próximo contato", valor: <ProximoContatoParceiro dia={p.proximo_contato} agora={agora} /> },
          ]} />
        </Cartao>
      </div>
      <Cartao id="linha-do-tempo" titulo="Linha do tempo" descricao={linha ? `${linha.length} ${linha.length === 1 ? "registro" : "registros"}` : undefined}>
        {erroLinha ? <EstadoDePagina compacto tipo="erro-de-carga" titulo="Não foi possível carregar o histórico" texto="Tente de novo. Os dados do parceiro continuam disponíveis." acoes={<button className="mb-botao mb-botao--secundario" type="button" onClick={() => void carregarLinha()}>Tentar de novo</button>} detalhe={<CopiarDetalhes codigo={erroLinha} />} /> : !linha ? <CarregandoLeads /> : !linha.length && !p.proximo_contato ? <EstadoVazio titulo="Nenhum registro ainda" texto="As interações e as mudanças do parceiro aparecerão aqui." /> : <LinhaDoTempo itens={linha} proximo={p.proximo_contato} agora={agora} eu={eu.nome} />}
      </Cartao>
    </div>
    <PainelLateral aberto={registrando && meu} onFechar={() => setRegistrando(false)} titulo="Registrar interação" descricao={p.nome} foco={() => botaoRegistrar.current}>
      <RegistrarInteracao parceiroId={p.id} idBase="ficha-interacao" onCancelar={() => setRegistrando(false)} onSalvo={async () => { setRegistrando(false); toast.mostrar("Interação registrada. O prazo dos 90 dias recomeçou.", { tipo: "sucesso" }); await depoisDeSalvar(); }} />
    </PainelLateral>
    <PainelLateral aberto={editando && meu} onFechar={() => setEditando(false)} titulo="Editar cadastro" descricao={p.nome} foco={() => botaoEditar.current}>
      {editando && <Editar p={p} regioes={regioes} onCancelar={() => setEditando(false)} onSalvo={async () => { setEditando(false); toast.mostrar("Cadastro salvo. O prazo dos 90 dias não mudou.", { tipo: "sucesso" }); await depoisDeSalvar(); }} />}
    </PainelLateral>
  </div>;
}

function LinhaDoTempo({ itens, proximo, agora, eu }: { itens: ItemLinhaDoTempo[]; proximo: string | null; agora: Date; eu: string }) {
  return <div className="parcerias-pilha">
    {proximo && <p>Próximo contato: <ProximoContatoParceiro dia={proximo} agora={agora} /></p>}
    <Historico itens={itens.map((i, n) => ({
      chave: `${i.quando}-${n}`, tipo: i.titulo, quando: formatarDataHora(i.quando), automatico: i.fonte === "historico" && !i.autor_nome,
      quem: i.autor_nome || (i.fonte === "historico" ? "automático" : eu),
      texto: <>{i.resumo && <span className="ficha__quebra">{i.resumo}</span>}{i.data_evento && <span className="ficha__apoio">Dia do evento: {formatarDia(i.data_evento)}</span>}{i.fonte === "historico" && (i.de_gerente_nome || i.para_gerente_nome) && <span className="ficha__apoio">{i.de_gerente_nome && `De ${i.de_gerente_nome} `}{i.para_gerente_nome && `${i.de_gerente_nome ? "para" : "Para"} ${i.para_gerente_nome === eu ? "você" : i.para_gerente_nome}`}</span>}</>,
      depois: i.proximo_contato ? `→ Próximo contato marcado: ${formatarDia(i.proximo_contato)}` : undefined,
    }))} />
  </div>;
}

function Editar({ p, regioes, onCancelar, onSalvo }: { p: ParceiroComSituacao; regioes: ReturnType<typeof useRegioes>; onCancelar: () => void; onSalvo: () => Promise<void> }) {
  const [campos, setCampos] = useState<CamposParceiro>(() => camposDoParceiro(p));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(null);
    const invalido = validarParceiro(campos); if (invalido) return setErro(invalido);
    setSalvando(true); const falha = await editarParceiro(p.id, campos); setSalvando(false);
    if (falha) return setErro(falha);
    await onSalvo();
  }
  return <form onSubmit={salvar} className="parcerias-painel-form" noValidate>
    <div className="mb-lateral__corpo">
    <p className="mb-campo__ajuda">Editar não reinicia os 90 dias.</p>
    <CamposCadastro campos={campos} setCampos={setCampos} regioes={regioes} idBase="editar" />
    {erro && <Aviso tom="erro" titulo="Não foi possível salvar o cadastro" texto={erro} />}
    </div>
    <div className="mb-lateral__rodape"><button type="button" className="mb-botao mb-botao--discreto" onClick={onCancelar}>Cancelar</button><button type="submit" className="mb-botao mb-botao--primario" disabled={salvando} aria-busy={salvando}>{salvando ? "Salvando…" : "Salvar cadastro"}</button></div>
  </form>;
}
