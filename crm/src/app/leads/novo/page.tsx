"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { CampoProximoContato, EscolhaTemperatura, RodapeAcao } from "@/components/leads/partes";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { deCampos, formatarWhatsapp, normalizarWhatsapp, type Temperatura } from "@/lib/leads";
import { gravarUltimaOrigem, lerUltimaOrigem, useCatalogos, useCorretores } from "@/lib/leads-dados";

export default function NovoLeadPage() {
  const { pode } = useSessao();
  return (
    <Casca
      titulo={pode("leads.atribuir") ? "Lead da empresa" : "Novo lead"}
      exige={pode("leads.atribuir") ? "leads.atribuir" : "leads.cadastrar"}
    >
      <NovoLead />
    </Casca>
  );
}

/**
 * Cadastro rápido: só nome, WhatsApp e origem são obrigatórios. A origem é 1
 * toque e já vem com a última usada neste aparelho. O resto fica para a ficha.
 * Quem distribui leads (leads.atribuir) escolhe o corretor que vai receber.
 */
function NovoLead() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const router = useRouter();
  const atribui = pode("leads.atribuir");
  const { catalogos, erro: erroCatalogo } = useCatalogos();
  const corretores = useCorretores(atribui);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState<string | null>(null);
  const [campanha, setCampanha] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [temperatura, setTemperatura] = useState<Temperatura | null>(null);
  const [contato, setContato] = useState({ data: "", hora: "" });
  const [dono, setDono] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const origens = useMemo(
    () => (catalogos?.origens ?? []).filter((o) => o.ativo && (atribui || !o.restrita)),
    [catalogos, atribui],
  );
  const origemAtual = origens.find((o) => o.slug === origem);

  useEffect(() => {
    if (origem || !origens.length) return;
    const ultima = lerUltimaOrigem(eu.id);
    const padrao = atribui ? origens.find((o) => o.restrita) : undefined;
    setOrigem((origens.find((o) => o.slug === ultima) ?? padrao)?.slug ?? null);
  }, [origens, origem, eu.id, atribui]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const numero = normalizarWhatsapp(whatsapp);
    if (!nome.trim()) return setErro("Preencha o nome.");
    if (!numero) return setErro("Confira o WhatsApp: DDD e número, como (11) 98765-4321.");
    if (!origemAtual) return setErro("Escolha a origem.");
    if (atribui && !dono) return setErro("Escolha o corretor que vai receber o lead.");
    const proximo = contato.data ? deCampos(contato.data, contato.hora || "09:00") : null;
    if (contato.data && !proximo) return setErro("Confira o dia e a hora do próximo contato.");

    setSalvando(true);
    if (duplicado !== numero) {
      // Aviso de duplicado entre os leads que a pessoa enxerga; não impede o cadastro.
      const { data } = await db().from("leads").select("nome").eq("whatsapp", numero).eq("status", "ativo").limit(1);
      if (data?.length) {
        setDuplicado(numero);
        setSalvando(false);
        return setErro(
          `Já existe um lead ativo com este WhatsApp: ${data[0].nome}. Toque em Cadastrar de novo para confirmar.`,
        );
      }
    }

    const { data, error } = await db()
      .from("leads")
      .insert({
        dono_id: atribui ? dono : eu.id,
        nome: nome.trim(),
        whatsapp: numero,
        origem: origemAtual.slug,
        campanha: origemAtual.pede_campanha ? campanha.trim() || null : null,
        empreendimento: empreendimento.trim() || null,
        temperatura,
        proximo_contato: proximo,
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    gravarUltimaOrigem(eu.id, origemAtual.slug);
    router.push(atribui ? "/leads/" : `/leads/ficha/?id=${data.id}`);
  }

  return (
    <form onSubmit={salvar} className="grid max-w-[640px] gap-5 pb-24 md:pb-0" noValidate>
      {erroCatalogo && <p className="aviso-erro">! {erroCatalogo}</p>}

      {atribui && (
        <div>
          <label className="field-label" htmlFor="dono">
            Corretor que vai receber
          </label>
          <select id="dono" className="input" value={dono} onChange={(e) => setDono(e.target.value)}>
            <option value="">Escolha</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          className="input"
          autoComplete="off"
          autoCapitalize="words"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="whatsapp">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          className="input num"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 98765-4321"
          value={whatsapp}
          onChange={(e) => {
            setWhatsapp(e.target.value);
            setDuplicado(null);
          }}
          onBlur={() => {
            const n = normalizarWhatsapp(whatsapp);
            if (n) setWhatsapp(formatarWhatsapp(n));
          }}
        />
      </div>

      <fieldset>
        <legend className="field-label">Origem</legend>
        <div className="grid grid-cols-2 gap-2">
          {origens.map((o) => {
            const marcada = origem === o.slug;
            return (
              <button
                key={o.slug}
                type="button"
                aria-pressed={marcada}
                onClick={() => setOrigem(o.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-3 py-3 text-left text-[14px] font-semibold transition-colors",
                  marcada ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {marcada && <span aria-hidden>✓ </span>}
                {o.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      {origemAtual?.pede_campanha && (
        <div>
          <label className="field-label" htmlFor="campanha">
            Campanha
          </label>
          <input
            id="campanha"
            className="input"
            placeholder="Ex.: Instagram, anúncio do Rudge Ramos"
            value={campanha}
            onChange={(e) => setCampanha(e.target.value)}
          />
        </div>
      )}

      <details className="card">
        <summary className="focus-ring cursor-pointer list-none font-semibold">
          <span aria-hidden>+ </span>Mais detalhes (opcional)
        </summary>
        <div className="mt-4 grid gap-4">
          <div>
            <span className="field-label">Temperatura</span>
            <EscolhaTemperatura valor={temperatura} onChange={setTemperatura} podeLimpar />
          </div>
          <div>
            <label className="field-label" htmlFor="empreendimento">
              Empreendimento
            </label>
            <input
              id="empreendimento"
              className="input"
              value={empreendimento}
              onChange={(e) => setEmpreendimento(e.target.value)}
            />
          </div>
          <div>
            <span className="field-label">Próximo contato</span>
            <CampoProximoContato idBase="novo-contato" {...contato} onChange={setContato} />
          </div>
        </div>
      </details>

      {erro && <p className="aviso-erro">! {erro}</p>}

      <RodapeAcao>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Cadastrar"}
        </button>
      </RodapeAcao>
    </form>
  );
}
