"use client";

import Link from "next/link";
import { useSessao } from "@/lib/sessao";
import { agruparRegioes, ATALHOS_PROXIMO, diaLocal, ESTAGIOS, estadoProximoContato, formatarDia, LIMITE_DIAS, somarDias, type CamposParceiro, type Estagio, type Faixa, type Regiao } from "@/lib/parceiros";
import { Campo, CampoEmGrupo } from "../alicerce/campo";
import { Prazo } from "../alicerce/prazo";
import { Seletor } from "../alicerce/seletor";
import { EstadoDePagina, LinkDoEstado } from "../alicerce/estado-de-pagina";

/** CabecalhoDePagina: guia/componentes/CabecalhoDePagina.md:5-10. */
export function CabecalhoParceiros({ titulo, subtitulo, acoes, voltar = true }: { titulo: string; subtitulo?: React.ReactNode; acoes?: React.ReactNode; voltar?: boolean }) {
  return <header className="mb-cabecalho">
    <div className="mb-cabecalho__texto">
      {voltar && <ol className="mb-trilha"><li><Link href="/parceiros/">Parceiros</Link></li><li aria-current="page">{titulo}</li></ol>}
      <h1 className="titulo-tela">{titulo}</h1>
      {subtitulo && <p className="mb-cabecalho__subtitulo">{subtitulo}</p>}
    </div>
    {acoes && <div className="mb-grupo-botoes">{acoes}</div>}
  </header>;
}

/** Mantém o OU das permissões de Parcerias. */
export function ComPermissao({ children }: { children: React.ReactNode }) {
  const { pode } = useSessao();
  if (pode("parceiros.cadastrar") || pode("parceiros.ver_todos")) return <>{children}</>;
  return <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." acoes={<LinkDoEstado href="/">Voltar para o início</LinkDoEstado>} />;
}

/** Prazo: mantém as faixas do domínio; ! pede ação, ✕ é só para perda consumada. */
export function SeloPrazo({ faixa, dias }: { faixa: Faixa; dias: number; estagio?: Estagio }) {
  return <Prazo nivel={faixa === "risco" ? "estourado" : faixa === "atencao" ? "atencao" : "normal"}>
    {faixa === "ok" ? "→" : "!"} {dias} {dias === 1 ? "dia" : "dias"} sem interação
  </Prazo>;
}

/** Etapas.md:31-52: etapas reais e resumo compacto calculado pelo consumidor. */
export function TrilhaEstagio({ estagio, motivoBloqueio }: { estagio: Estagio; motivoBloqueio?: string | null }) {
  const etapas = ESTAGIOS.filter((e) => e.ativo);
  const atual = etapas.findIndex((e) => e.slug === estagio);
  return <div className="mb-etapas-bloco">
    <p className="mb-etapas-bloco__passo" aria-hidden="true">Etapa {atual + 1} de {etapas.length} · <strong>{etapas[atual]?.nome}</strong></p>
    <div className="mb-etapas-bloco__trilho" aria-hidden="true"><span style={{ width: `${((atual + 1) / etapas.length) * 100}%` }} /></div>
    <ol className="mb-etapas mb-etapas--faixa" aria-label="Estágio do parceiro">
    {etapas.map((e, i) => <li key={e.slug} className={`mb-etapa${i === atual ? ` mb-etapa--atual${motivoBloqueio ? " mb-etapa--bloqueada" : ""}` : i < atual ? " mb-etapa--concluida" : ""}`} aria-current={i === atual ? "step" : undefined}>
      <span className="mb-etapa__marcador" aria-hidden="true">{i === atual && motivoBloqueio ? "!" : null}</span>
      <span className="mb-etapa__texto"><span className="mb-etapa__nome">{e.nome}</span>{i === atual && motivoBloqueio && <span className="mb-etapa__detalhe">Bloqueada: {motivoBloqueio}</span>}</span>
    </li>)}
    </ol>
  </div>;
}

export function ProximoContatoParceiro({ dia, agora }: { dia: string | null; agora: Date }) {
  const estado = estadoProximoContato(dia, agora);
  if (!dia || !estado) return <span>Sem próximo contato</span>;
  return <Prazo nivel={estado === "vencido" ? "estourado" : estado === "hoje" ? "atencao" : "normal"}>
    {estado === "vencido" ? "! Vencido, " : estado === "hoje" ? "! Hoje · " : "→ "}{formatarDia(dia)}
  </Prazo>;
}

export function TextoPrazo({ faixa, dias, comecou }: { faixa: Faixa; dias: number; comecou: boolean }) {
  return <Prazo nivel={faixa === "risco" ? "estourado" : faixa === "atencao" ? "atencao" : "normal"}>
    {faixa === "ok" ? "→" : "!"} {dias} {dias === 1 ? "dia" : "dias"} {comecou ? "sem interação" : "desde que recebeu"} · limite {LIMITE_DIAS}
  </Prazo>;
}

export function Opcao({ marcado, onClick, children }: { marcado: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return <button type="button" className="mb-opcao" aria-pressed={marcado} onClick={onClick}>{children}</button>;
}

export function CampoDiaContato({ valor, onChange, id }: { valor: string; onChange: (v: string) => void; id: string }) {
  const hoje = diaLocal(new Date());
  return <CampoEmGrupo id={`${id}-rotulo`} rotulo="Próximo contato" opcional="opcional">
    <Seletor idRotulo={`${id}-rotulo`} grade={4} valor={valor} onChange={(v) => onChange(v === valor ? "" : v)} opcoes={[
      ...ATALHOS_PROXIMO.map((n) => ({ valor: somarDias(hoje, n), rotulo: `Em ${n} dias` })), { valor: "", rotulo: "Sem data" },
    ]} />
    <Campo rotulo="Dia do próximo contato"><input id={id} type="date" className="mb-campo__entrada" min={hoje} value={valor} onChange={(e) => onChange(e.target.value)} /></Campo>
  </CampoEmGrupo>;
}

/** FormularioDenso + Campo; catálogo e seleção funcional permanecem iguais. */
export function CamposCadastro({ campos, setCampos, regioes, idBase }: { campos: CamposParceiro; setCampos: React.Dispatch<React.SetStateAction<CamposParceiro>>; regioes: Regiao[]; idBase: string }) {
  const muda = (k: keyof CamposParceiro) => (e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value; setCampos((c) => ({ ...c, [k]: v })); };
  const alternar = (codigo: string) => setCampos((c) => ({ ...c, regioes: c.regioes.includes(codigo) ? c.regioes.filter((x) => x !== codigo) : [...c.regioes, codigo] }));
  const grupos = agruparRegioes(regioes);
  const inativas = regioes.filter((r) => !r.ativo && campos.regioes.includes(r.codigo));
  return <>
    <section className="mb-form-secao" aria-labelledby={`${idBase}-dados`}>
      <h3 className="mb-form-secao__titulo" id={`${idBase}-dados`}>Dados do parceiro</h3>
      <div className="mb-form-grade">
        <Campo rotulo="Nome" obrigatorio colunas={6}><input id={`${idBase}-nome`} className="mb-campo__entrada" required autoComplete="off" value={campos.nome} onChange={muda("nome")} /></Campo>
        <Campo rotulo="Empresa" ajuda="Deixe vazio se for autônomo." colunas={6}><input id={`${idBase}-empresa`} className="mb-campo__entrada" value={campos.empresa} onChange={muda("empresa")} /></Campo>
        <Campo rotulo="WhatsApp" ajuda="Informe WhatsApp ou CRECI." colunas={6}><input id={`${idBase}-whatsapp`} className="mb-campo__entrada" inputMode="tel" placeholder="(11) 90000-0000" value={campos.whatsapp} onChange={muda("whatsapp")} /></Campo>
        <Campo rotulo="CRECI" colunas={6}><input id={`${idBase}-creci`} className="mb-campo__entrada" value={campos.creci} onChange={muda("creci")} /></Campo>
        <Campo rotulo="E-mail" colunas={12}><input id={`${idBase}-email`} className="mb-campo__entrada" type="email" inputMode="email" placeholder="nome@exemplo.com.br" value={campos.email} onChange={muda("email")} /></Campo>
      </div>
    </section>
    <section className="mb-form-secao" aria-labelledby={`${idBase}-regioes`}>
      <h3 className="mb-form-secao__titulo" id={`${idBase}-regioes`}>Região de atuação</h3>
      <p className="mb-campo__ajuda">Marque quantas regiões quiser.</p>
      {grupos.map((g) => <CampoEmGrupo key={g.cidade} id={`${idBase}-${encodeURIComponent(g.cidade)}`} rotulo={g.cidade}>
        <div className="mb-opcoes mb-opcoes--linha mb-opcoes--multipla" role="group" aria-labelledby={`${idBase}-${encodeURIComponent(g.cidade)}`}>
          {g.itens.map((r) => <Opcao key={r.codigo} marcado={campos.regioes.includes(r.codigo)} onClick={() => alternar(r.codigo)}>{r.nome === g.cidade ? "Cidade toda" : r.nome}</Opcao>)}
        </div>
      </CampoEmGrupo>)}
      {inativas.length > 0 && <CampoEmGrupo id={`${idBase}-inativas`} rotulo="Fora da lista"><div className="mb-opcoes mb-opcoes--linha mb-opcoes--multipla" role="group" aria-labelledby={`${idBase}-inativas`}>
        {inativas.map((r) => <Opcao key={r.codigo} marcado onClick={() => alternar(r.codigo)}>{r.nome} ({r.cidade})</Opcao>)}
      </div></CampoEmGrupo>}
      <div className="mb-opcoes mb-opcoes--linha mb-opcoes--multipla" role="group" aria-label="Outra região"><Opcao marcado={campos.outra} onClick={() => setCampos((c) => ({ ...c, outra: !c.outra }))}>Outra região</Opcao></div>
      {campos.outra && <Campo rotulo="Outra região"><input id={`${idBase}-outra`} className="mb-campo__entrada" placeholder="Ex.: Pauliceia, Guarulhos" maxLength={160} value={campos.regiao_outra} onChange={muda("regiao_outra")} /></Campo>}
    </section>
  </>;
}
