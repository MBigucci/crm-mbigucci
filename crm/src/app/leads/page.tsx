"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Casca } from "@/components/casca";
import { CardLeadAlicerce } from "@/components/leads/partes";
import { useLeadsVisiveis } from "@/components/leads/filtros";
import { usePerfil, useSessao } from "@/lib/sessao";
import { grupoDoLead, type Lead, type StatusLead } from "@/lib/leads";
import { criarBusca, ORDENS, ordenarLeads, SEM_EMPREENDIMENTO, type Ordem } from "@/lib/busca";
import { useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { prazoDoLead, type HorarioAtendimento } from "@/lib/prazo";
import { Aviso } from "@/components/alicerce/aviso";
import { BarraDeFiltros } from "@/components/alicerce/barra-de-filtros";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { useMensagemPronta } from "@/components/alicerce/mensagem-do-lead";
import { Prazo } from "@/components/alicerce/prazo";
import { useRegistrarDoLead } from "@/components/alicerce/registrar-do-lead";
import { Tabela } from "@/components/alicerce/tabela";

export default function LeadsPage() {
  const { pode } = useSessao();
  const daEquipe = pode("dados.ver_equipe") && !pode("dados.ver_todos");
  return (
    <Casca titulo={daEquipe ? "Leads da equipe" : "Leads"} migrada>
      <Leads />
    </Casca>
  );
}

/** A ordem escolhida fica guardada neste aparelho. */
const CHAVE_ORDEM = "crm.leads.ordem";
function lerOrdem(): Ordem {
  try {
    const o = localStorage.getItem(CHAVE_ORDEM);
    return ORDENS.some((x) => x.slug === o) ? (o as Ordem) : "proximo_contato";
  } catch {
    return "proximo_contato";
  }
}

/**
 * Leads no Alicerce (item 48, passo e): a BarraDeFiltros com os filtros de sempre (os mesmos valores), a tabela
 * "Por corretor" do gerente em Tabela (no celular rola dentro do quadro) e os leads em CardLead, como na Lista
 * do dia. Nada do que a tela faz mudou: as mesmas leituras, a mesma busca, a mesma ordem e o mesmo filtro.
 * Registrar só no lead do próprio corretor (o mesmo painel da Lista do dia); o WhatsApp abre a mensagem pronta e,
 * aqui, não grava toque (como antes).
 */
function Leads() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const f = useLeadsVisiveis();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("proximo_contato");
  const [agora] = useState(() => new Date());
  const titulo = useRef<HTMLHeadingElement>(null);
  // A entrada acontece só ao abrir a tela: depois dela, os cards que chegam não animam de novo.
  const [entrando, setEntrando] = useState(true);

  useEffect(() => setOrdem(lerOrdem()), []);
  function mudarOrdem(o: Ordem) {
    setOrdem(o);
    try {
      localStorage.setItem(CHAVE_ORDEM, o);
    } catch {}
  }

  const visiveis = useMemo(() => ordenarLeads((f.leads ?? []).filter(criarBusca(busca)), ordem), [f.leads, busca, ordem]);
  const filtrando = !!(busca.trim() || f.origem || f.empreendimento);
  const carregou = !!f.leads;
  useEffect(() => {
    if (!carregou) return;
    const t = setTimeout(() => setEntrando(false), 1200);
    return () => clearTimeout(t);
  }, [carregou]);

  const resumo = useMemo(() => resumoPorCorretor(f.leads ?? [], agora, horario), [f.leads, agora, horario]);
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const mensagem = useMensagemPronta();
  const registrar = useRegistrarDoLead({ leads: f.leads ?? [], agora, nomeEtapa, recarregar: f.recarregar, titulo });

  const escopo = pode("dados.ver_todos") ? "Empresa toda" : pode("dados.ver_equipe") ? "Sua equipe" : "Só os seus";
  const limpar = () => {
    setBusca("");
    f.setCorretor("");
    f.setOrigem("");
    f.setEmpreendimento("");
    f.setStatus("ativo");
  };

  return (
    <div className="pagina-alicerce">
      <h1 ref={titulo} className="mb-visualmente-oculto" tabIndex={-1}>
        {pode("dados.ver_equipe") && !pode("dados.ver_todos") ? "Leads da equipe" : "Leads"}
      </h1>
      <BarraDeFiltros
        escopo={escopo}
        tituloDoPainel="Filtrar leads"
        busca={{ valor: busca, onChange: setBusca, placeholder: "Nome, telefone ou empreendimento" }}
        contagem={f.leads ? `${visiveis.length} ${visiveis.length === 1 ? "lead" : "leads"}` : undefined}
        ordenar={visiveis.length > 0 ? { valor: ordem, onChange: (v) => mudarOrdem(v as Ordem), opcoes: ORDENS.map((o) => ({ valor: o.slug, rotulo: o.nome })) } : undefined}
        filtros={[
          ...(f.veOutros
            ? [
                {
                  rotulo: "Corretor",
                  valor: f.corretor,
                  onChange: f.setCorretor,
                  opcoes: [{ valor: "", rotulo: "Todos os corretores" }, ...f.corretores.map((c) => ({ valor: c.id, rotulo: c.nome }))],
                },
              ]
            : []),
          {
            rotulo: "Origem",
            valor: f.origem,
            onChange: f.setOrigem,
            opcoes: [{ valor: "", rotulo: "Todas as origens" }, ...(catalogos?.origens ?? []).map((o) => ({ valor: o.slug, rotulo: o.nome }))],
          },
          {
            rotulo: "Empreendimento",
            valor: f.empreendimento,
            onChange: f.setEmpreendimento,
            opcoes: [
              { valor: "", rotulo: "Todos os empreendimentos" },
              ...f.empreendimentos.map((e) => ({ valor: e.chave, rotulo: `${e.nome} (${e.total})` })),
              { valor: SEM_EMPREENDIMENTO, rotulo: "Sem empreendimento" },
            ],
          },
          {
            rotulo: "Situação",
            valor: f.status,
            padrao: "ativo",
            onChange: (v) => f.setStatus(v as StatusLead),
            opcoes: [
              { valor: "ativo", rotulo: "Ativos" },
              { valor: "descartado", rotulo: "Descartados" },
            ],
          },
        ]}
      />

      {f.veOutros && f.status === "ativo" && !f.corretor && !f.origem && !f.empreendimento && resumo.length > 0 && (
        <section aria-labelledby="resumo" className="pagina-alicerce__grupo">
          <h2 id="resumo" className="titulo-secao">
            Por corretor
          </h2>
          <Tabela tipo="numeros" rotulo="Leads por corretor">
            <thead>
              <tr>
                <th scope="col">Corretor</th>
                <th scope="col" className="mb-tabela__num">
                  Ativos
                </th>
                <th scope="col" className="mb-tabela__num">
                  Prazo estourado
                </th>
                <th scope="col" className="mb-tabela__num">
                  Atrasados
                </th>
                <th scope="col" className="mb-tabela__num">
                  Sem contato
                </th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button type="button" className="mb-link" aria-label={`Ver só os leads de ${f.nomeDono.get(r.id) ?? "Corretor"}`} onClick={() => f.setCorretor(r.id)}>
                      {f.nomeDono.get(r.id) ?? "Corretor"}
                    </button>
                  </td>
                  <td className="mb-tabela__num">{r.ativos}</td>
                  <td className="mb-tabela__num">{r.estourados ? <Prazo nivel="estourado">! {r.estourados}</Prazo> : "0"}</td>
                  <td className="mb-tabela__num">{r.atrasados ? <Prazo nivel="estourado">! {r.atrasados}</Prazo> : "0"}</td>
                  <td className="mb-tabela__num">{r.semData}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </section>
      )}

      {f.erro && <Aviso tom="erro" titulo="Não foi possível carregar os leads" texto={f.erro} />}
      {!f.leads && !f.erro && <CarregandoLeads />}
      {f.leads && !visiveis.length && (
        <EstadoVazio
          titulo={filtrando ? "Nenhum lead com essa busca ou filtro" : f.status === "ativo" ? "Nenhum lead ativo" : "Nenhum lead descartado"}
          texto={filtrando ? "Tire um filtro ou mude a busca para ver mais leads." : "Os leads aparecem aqui quando houver."}
          acao={
            filtrando ? (
              <button className="mb-botao mb-botao--secundario mb-botao--p" type="button" onClick={limpar}>
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      )}

      {visiveis.length > 0 && (
        <section aria-labelledby="lista" className="pagina-alicerce__grupo">
          <h2 id="lista" className="mb-visualmente-oculto">
            {f.status === "ativo" ? "Leads ativos" : "Leads descartados"}
          </h2>
          <ul className="mb-itens mb-itens--duas">
            {visiveis.map((l, n) => (
              <CardLeadAlicerce
                key={l.id}
                lead={l}
                agora={agora}
                horario={horario}
                etapa={nomeEtapa(l.etapa)}
                dono={f.veOutros ? (l.dono_id ? f.nomeDono.get(l.dono_id) : "A distribuir") : undefined}
                destaque={n === 0}
                indice={entrando ? Math.min(n, 10) : undefined}
                onRegistrar={l.dono_id === eu.id ? registrar.abrir(l) : undefined}
                onWhatsapp={() => mensagem.abrir(l)}
              />
            ))}
          </ul>
        </section>
      )}
      {registrar.elemento}
      {mensagem.elemento}
    </div>
  );
}

function resumoPorCorretor(leads: Lead[], agora: Date, horario: HorarioAtendimento) {
  const m = new Map<string, { id: string; ativos: number; estourados: number; atrasados: number; semData: number }>();
  for (const l of leads) {
    // Sem dono (A distribuir, represado): fica fora do resumo por corretor.
    if (!l.dono_id) continue;
    const r = m.get(l.dono_id) ?? { id: l.dono_id, ativos: 0, estourados: 0, atrasados: 0, semData: 0 };
    r.ativos++;
    if (prazoDoLead(l, agora, horario)?.estado === "estourado") r.estourados++;
    const g = grupoDoLead(l, agora);
    if (g === "atrasados") r.atrasados++;
    if (g === "sem_data") r.semData++;
    m.set(l.dono_id, r);
  }
  return [...m.values()].sort((a, b) => b.estourados - a.estourados || b.atrasados - a.atrasados || b.ativos - a.ativos);
}
