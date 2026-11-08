"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Casca } from "@/components/casca";
import { Ajustes } from "@/components/alicerce/ajustes";
import { Cartao } from "@/components/alicerce/cartao";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Seletor } from "@/components/alicerce/seletor";
import { useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { ConfigMensagens } from "@/components/config-mensagens";
import { PermissoesAdmin } from "@/components/administracao/permissoes";
import { ErroAdmin, erroAdmin } from "@/components/administracao/partes";
import { db } from "@/lib/supabase";
import { esquecerHorarioAtendimento } from "@/lib/leads-dados";
import { HORARIO_PADRAO, type HorarioAtendimento } from "@/lib/prazo";
const INDICE = [{ id: "areas", rotulo: "Áreas de administração" }, { id: "horario", rotulo: "Horário de atendimento" }, { id: "mensagens", rotulo: "Mensagens prontas" }, { id: "permissoes", rotulo: "Permissões por perfil" }];
export default function ConfiguracoesPage() {
  return <Casca titulo="Configurações" soGerenteGeral migrada>
    <div className="admin-pilha">
      <header className="mb-cabecalho">
        <div className="mb-cabecalho__texto">
          <h1 className="titulo-tela">Configurações</h1>
        </div>
      </header>
      <Ajustes indice={INDICE}>
        <Areas />
        <Horario />
        <div id="mensagens" className="admin-ancora">
          <ConfigMensagens />
        </div>
        <PermissoesAdmin />
      </Ajustes>
    </div>
  </Casca>;
}
function Areas() {
  const { config } = useDistribuicaoStore();
  // "✓ Ligada · equipe, depois corretor": o modo em rótulo curto, para caber em uma linha no celular.
  const areas = [
    { href: "/usuarios/", titulo: "Usuários", meta: "Contas, perfis e equipe de cada pessoa" },
    { href: "/equipes/", titulo: "Equipes", meta: "Equipes e gerentes" },
    { href: "/faixas/", titulo: "Faixas de VGV", meta: "Faixas da premiação por VGV" },
  ];
  // Distribuição só com a distribuição instalada, a mesma condição do item de menu de antes (ehGG && config).
  if (config) {
    const modo = config.modo === "equipe" ? "equipe, depois corretor" : config.modo === "direto" ? "direto ao corretor" : "só gerentes";
    areas.push({ href: "/distribuicao/", titulo: "Distribuição", meta: `${config.ligada ? "✓ Ligada" : "– Desligada"} · ${modo}` });
  }
  return (
    <section className="mb-cartao" id="areas" aria-labelledby="t-areas">
      <header className="mb-cartao__cabecalho">
        <div>
          <h2 className="mb-cartao__titulo" id="t-areas">
            Áreas de administração
          </h2>
        </div>
      </header>
      <div className="mb-cartao__corpo">
        <ul className="mb-lista">
          {areas.map((a) => (
            <li key={a.href} className="mb-lista__item">
              <span className="mb-lista__conteudo">
                <Link className="mb-lista__titulo mb-lista__alvo" href={a.href}>
                  {a.titulo}
                </Link>
                <span className="mb-lista__meta">{a.meta}</span>
              </span>
              <span className="mb-lista__lateral" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function Horario() {
  const [dias, setDias] = useState<number[] | null>(null), [inicio, setInicio] = useState(""), [fim, setFim] = useState("");
  const [alterado, setAlterado] = useState<string | null>(null), [erro, setErro] = useState<string | null>(null), [salvo, setSalvo] = useState(false), [enviando, setEnviando] = useState(false), [aberto, setAberto] = useState(false);
  const origem = useRef<HTMLButtonElement>(null);
  const carregar = useCallback(async () => { setErro(null); const { data, error } = await db().from("horario_atendimento").select("dias, inicio, fim, updated_at").maybeSingle<HorarioAtendimento & { updated_at: string }>(); if (error) return setErro(erroAdmin(error)); const h = data ?? { ...HORARIO_PADRAO, updated_at: null }; setDias([...h.dias].sort((a, b) => a - b)); setInicio(h.inicio.slice(0, 5)); setFim(h.fim.slice(0, 5)); setAlterado(data?.updated_at ?? null); }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  async function salvar() { setErro(null); setSalvo(false); if (!dias?.length) return setErro("Escolha pelo menos um dia."); if (!inicio || !fim || inicio >= fim) return setErro("O fim precisa ser depois do início."); setEnviando(true); const { data, error } = await db().from("horario_atendimento").update({ dias, inicio, fim }).eq("id", true).select("id"); setEnviando(false); if (error) return setErro(erroAdmin(error)); if (!data?.length) return setErro("Não foi possível salvar o horário. Tente de novo."); esquecerHorarioAtendimento(); setSalvo(true); setAberto(false); await carregar(); }
  return <Cartao id="t-horario" secao="horario" titulo="Horário de atendimento" descricao="O prazo de primeiro contato dos leads da empresa conta só neste horário.">
    {!dias ? erro ? <ErroAdmin tentar={() => void carregar()} /> : <CarregandoTabela texto="Carregando horário…" /> : <div className="admin-pilha">
      <p>{dias.map(d => DIAS_SEMANA[d]).join(" · ")} · {inicio} às {fim}</p>{alterado && <p className="mb-campo__ajuda">Alterado em {new Date(alterado).toLocaleString("pt-BR")}</p>}{salvo && <Aviso tom="sucesso" titulo="Horário salvo" texto="Vale no próximo acesso de cada corretor." />}<button ref={origem} className="mb-botao mb-botao--secundario justify-self-start" onClick={() => setAberto(true)}>Editar horário</button>
    </div>}
    <PainelLateral aberto={aberto} onFechar={() => !enviando && setAberto(false)} foco={() => origem.current} titulo="Editar horário de atendimento" descricao="O que foi digitado continua aqui se não for possível salvar." rodape={<div className="mb-lateral__rodape">
      <button className="mb-botao mb-botao--discreto" disabled={enviando} onClick={() => setAberto(false)}>Cancelar</button>
      <button className="mb-botao mb-botao--primario" disabled={enviando} onClick={() => void salvar()}>{enviando ? "Salvando…" : "Salvar horário"}</button>
    </div>}>
      <div className="mb-lateral__corpo">
        <span id="horario-dias" className="mb-campo__rotulo">Dias de atendimento</span>
        <Seletor idRotulo="horario-dias" multipla grade="linha" valor={null} marcados={(dias ?? []).map(String)} opcoes={DIAS_SEMANA.map((rotulo, d) => ({ valor: String(d), rotulo }))} onChange={v => { const d = Number(v); setDias(atual => atual?.includes(d) ? atual.filter(x => x !== d) : [...(atual ?? []), d].sort((a, b) => a - b)); setSalvo(false); }} />
        <Campo rotulo="Abre às">
          <input id="horario-inicio" type="time" className="mb-campo__entrada" value={inicio} onChange={e => setInicio(e.target.value)} />
        </Campo>
        <Campo rotulo="Fecha às">
          <input id="horario-fim" type="time" className="mb-campo__entrada" value={fim} onChange={e => setFim(e.target.value)} />
        </Campo>{erro && <Aviso tom="erro" titulo={erro} />}</div>
    </PainelLateral>
  </Cartao>;
}
