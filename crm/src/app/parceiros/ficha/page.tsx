"use client";

import Link from "next/link";
import clsx from "clsx";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { subtituloParceiro } from "@/components/parceiros/card";
import { CamposCadastro, ComPermissao, ProximoContatoParceiro, TextoPrazo, TrilhaEstagio } from "@/components/parceiros/partes";
import { RegistrarInteracao } from "@/components/parceiros/registrar-interacao";
import { usePerfil, useSessao } from "@/lib/sessao";
import {
  camposDoParceiro,
  formatarDia,
  formatarDataHora,
  formatarWhatsapp,
  linkWhatsapp,
  textoRegioes,
  validarParceiro,
  type CamposParceiro,
  type ParceiroComSituacao,
} from "@/lib/parceiros";
import {
  editarParceiro,
  lerLinhaDoTempo,
  useCarteira,
  useGerentes,
  useRegioes,
  type ItemLinhaDoTempo,
} from "@/lib/parceiros-dados";

export default function FichaParceiroPage() {
  return (
    <Casca titulo="Parceiro">
      <ComPermissao>
        <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
          <Ficha />
        </Suspense>
      </ComPermissao>
    </Casca>
  );
}

function Ficha() {
  const id = useSearchParams().get("id");
  const eu = usePerfil();
  const { pode } = useSessao();
  const veTodos = pode("parceiros.ver_todos");
  // A ficha lê a carteira toda (a RLS já filtra): é a mesma junção da lista, com a situação.
  const { lista, erro, recarregar } = useCarteira();
  const regioes = useRegioes();
  const gerentes = useGerentes(veTodos);
  const [linha, setLinha] = useState<ItemLinhaDoTempo[] | null>(null);
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const [aviso, setAviso] = useState<string | null>(null);

  const carregarLinha = useCallback(async () => {
    if (!id) return;
    const r = await lerLinhaDoTempo(id);
    setLinha(r.itens);
    setErroLinha(r.erro);
  }, [id]);

  useEffect(() => {
    carregarLinha();
  }, [carregarLinha]);

  const p = lista?.find((x) => x.id === id) ?? null;

  // Os contatos do dia abrem a ficha em Registrar interação (o formulário só existe depois de carregar).
  const temParceiro = !!p;
  useEffect(() => {
    if (temParceiro && window.location.hash === "#registrar")
      document.getElementById("registrar")?.scrollIntoView({ block: "start" });
  }, [temParceiro]);

  if (!id) return <p className="text-ink-soft">Parceiro não informado. Volte para a lista.</p>;
  if (erro) return <p className="aviso-erro">✕ {erro}</p>;
  if (!lista) return <p className="text-concrete">Carregando…</p>;
  if (!p)
    return (
      <div className="card max-w-[560px]">
        <p className="titulo-card">Parceiro não encontrado</p>
        <p className="mt-1 text-ink-soft">
          O parceiro pode ter passado para outro gerente pela regra dos 90 dias, ou o link está errado.
        </p>
        <Link href="/parceiros/" className="link-acao mt-3 inline-block text-[14px]">
          Voltar para Parceiros
        </Link>
      </div>
    );

  const meu = p.gerente_id === eu.id;
  const nomeDono = p.gerente_id ? gerentes.find((g) => g.id === p.gerente_id)?.nome : null;
  const wa = linkWhatsapp(p.whatsapp_norm);
  const depoisDeSalvar = async () => {
    setAgora(new Date());
    await Promise.all([recarregar(), carregarLinha()]);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:pb-0">
      <div className="grid gap-4">
        <div>
          <Link href="/parceiros/" className="focus-ring text-[13px] font-semibold text-ink-soft">
            ← Parceiros
          </Link>
          <span className="eyebrow mt-3">{p.empresa ? "Parceiro · Imobiliária" : "Parceiro · Autônomo"}</span>
          <h2 className="titulo-pagina mt-1">{p.nome}</h2>
          <p className="mt-1 text-[14px] text-ink-soft">{subtituloParceiro(p)}</p>
          {veTodos && (
            <p className="mt-1 text-[13px] text-ink-soft">
              Gerente: {meu ? "você" : (nomeDono ?? (p.gerente_id ? "outro gerente" : "sem gerente"))}
            </p>
          )}
          <TrilhaEstagio estagio={p.estagio} />
        </div>

        {p.reentrada_em && (
          <div className="card bar-brand">
            <span className="eyebrow">Atenção</span>
            <p className="mt-1">
              <span className="font-semibold text-wa">!</span> {primeiroNome(p.nome)} procurou a MBigucci de novo em{" "}
              <span className="num">{formatarDataHora(p.reentrada_em)}</span>.{" "}
              {meu
                ? "Continua com você. Registre uma interação para reiniciar os 90 dias."
                : "Continua com o gerente atual, que recebeu o aviso."}
            </p>
          </div>
        )}

        <Prazo p={p} />

        {aviso && <p className="aviso-ok">✓ {aviso}</p>}

        {editando ? (
          <Editar
            p={p}
            regioes={regioes}
            onCancelar={() => setEditando(false)}
            onSalvo={async () => {
              setEditando(false);
              setAviso("Cadastro salvo. O prazo dos 90 dias não mudou.");
              await depoisDeSalvar();
            }}
          />
        ) : (
          <section className="card" aria-labelledby="contato">
            <h3 id="contato" className="eyebrow">
              Contato
            </h3>
            <dl className="mt-2 grid gap-1 text-[14px]">
              <Item rotulo="WhatsApp">
                {p.whatsapp_norm ? <span className="num">{formatarWhatsapp(p.whatsapp_norm)}</span> : "Não informado"}
              </Item>
              <Item rotulo="CRECI">{p.creci || "Não informado"}</Item>
              <Item rotulo="E-mail">
                {p.email ? (
                  <a className="focus-ring underline decoration-line underline-offset-2" href={`mailto:${p.email}`}>
                    {p.email}
                  </a>
                ) : (
                  "Não informado"
                )}
              </Item>
              <Item rotulo="Empresa">{p.empresa || "Autônomo"}</Item>
              <Item rotulo="Região">{textoRegioes(p.regioes, regioes, p.regiao_outra) || "Não informada"}</Item>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost focus-ring">
                  Abrir WhatsApp
                </a>
              )}
              {meu && (
                <button
                  type="button"
                  className="btn btn-ghost focus-ring"
                  onClick={() => {
                    setAviso(null);
                    setEditando(true);
                  }}
                >
                  Editar
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="grid gap-4">
        {meu && !editando && (
          <section id="registrar" className="card scroll-mt-[72px]" aria-labelledby="titulo-registrar">
            <h3 id="titulo-registrar" className="titulo-secao-antigo mb-3">
              Registrar interação
            </h3>
            <RegistrarInteracao
              parceiroId={p.id}
              idBase="ficha"
              onSalvo={async () => {
                setAviso("Interação registrada. O prazo dos 90 dias recomeçou.");
                await depoisDeSalvar();
              }}
            />
          </section>
        )}

        <section className="card" aria-labelledby="linha-do-tempo">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="linha-do-tempo" className="eyebrow">
              Linha do tempo
            </h3>
            {linha && (
              <span className="text-[12px] text-concrete">
                <span className="num">{linha.length}</span> {linha.length === 1 ? "registro" : "registros"}
              </span>
            )}
          </div>
          {erroLinha && <p className="aviso-erro mt-2">✕ {erroLinha}</p>}
          {!linha && !erroLinha && <p className="mt-2 text-concrete">Carregando…</p>}
          <LinhaDoTempo itens={linha ?? []} proximo={p.proximo_contato} agora={agora} eu={eu.nome} />
        </section>

        <p className="text-[12px] text-concrete">
          Indicações e clientes indicados aparecem aqui quando o lead tiver a origem Parceiro.
        </p>
      </div>
    </div>
  );
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-ink-soft">{rotulo}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function Prazo({ p }: { p: ParceiroComSituacao }) {
  return (
    <section className="card" aria-labelledby="prazo">
      <h3 id="prazo" className="eyebrow">
        Prazo
      </h3>
      <p className="mt-1 text-[16px]">
        <TextoPrazo faixa={p.faixa} dias={p.dias_prazo} comecou={!!p.ultima_interacao_em} />
      </p>
      <div className="mt-2 h-[6px] w-full rounded-sm bg-line" aria-hidden>
        <div
          className={clsx(
            "h-full rounded-sm",
            p.faixa === "ok" ? "bg-ok" : p.faixa === "atencao" ? "bg-wa" : "bg-brand",
          )}
          style={{ width: `${Math.min(100, Math.round((p.dias_prazo / 90) * 100))}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-ink-soft">
        {p.dias_restantes > 0 ? (
          <>
            Faltam <span className="num">{p.dias_restantes}</span> {p.dias_restantes === 1 ? "dia" : "dias"} para o
            parceiro passar a outro gerente.
          </>
        ) : (
          "Passou dos 90 dias: o parceiro vai para outro gerente na próxima rotina."
        )}
      </p>
      <p className="mt-1 text-[12px] text-concrete">Editar o cadastro não reinicia o prazo. Só registrar interação.</p>
    </section>
  );
}

function LinhaDoTempo({
  itens,
  proximo,
  agora,
  eu,
}: {
  itens: ItemLinhaDoTempo[];
  proximo: string | null;
  agora: Date;
  eu: string;
}) {
  if (!itens.length && !proximo) return null;
  return (
    <ol className="mt-3 grid">
      {proximo && (
        <ItemTempo marca="brand" titulo="Próximo contato" data={<ProximoContatoParceiro dia={proximo} agora={agora} />} />
      )}
      {itens.map((i, n) => (
        <ItemTempo
          key={`${i.quando}-${n}`}
          marca={i.fonte === "interacao" ? "ink" : "neutra"}
          titulo={i.titulo}
          data={<span className="num">{formatarDataHora(i.quando)}</span>}
        >
          {i.resumo && <span className="block">{i.resumo}</span>}
          {i.data_evento && (
            <span className="block">
              Dia do evento: <span className="num">{formatarDia(i.data_evento)}</span>
            </span>
          )}
          {i.proximo_contato && (
            <span className="block">
              Próximo contato marcado: <span className="num">{formatarDia(i.proximo_contato)}</span>
            </span>
          )}
          {i.fonte === "historico" && (i.de_gerente_nome || i.para_gerente_nome) && (
            <span className="block">
              {i.de_gerente_nome && <>De {i.de_gerente_nome}</>}
              {i.de_gerente_nome && i.para_gerente_nome && " "}
              {i.para_gerente_nome && <>{i.de_gerente_nome ? "para" : "Para"} {i.para_gerente_nome === eu ? "você" : i.para_gerente_nome}</>}
            </span>
          )}
          {i.fonte === "interacao" && i.autor_nome && i.autor_nome !== eu && (
            <span className="block text-concrete">Por {i.autor_nome}</span>
          )}
        </ItemTempo>
      ))}
    </ol>
  );
}

function ItemTempo({
  marca,
  titulo,
  data,
  children,
}: {
  marca: "brand" | "ink" | "neutra";
  titulo: string;
  data: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative ml-1 border-l border-control pb-3 pl-3 last:pb-0">
      <span
        aria-hidden
        className={clsx(
          "absolute -left-[4px] top-[6px] h-[7px] w-[7px]",
          marca === "brand" ? "bg-brand" : marca === "ink" ? "bg-ink" : "bg-neutral-mark",
        )}
      />
      <p className="text-[14px]">
        <span className="font-semibold">{titulo}</span> · {data}
      </p>
      {children && <p className="text-[13px] text-ink-soft">{children}</p>}
    </li>
  );
}

function Editar({
  p,
  regioes,
  onCancelar,
  onSalvo,
}: {
  p: ParceiroComSituacao;
  regioes: ReturnType<typeof useRegioes>;
  onCancelar: () => void;
  onSalvo: () => Promise<void>;
}) {
  const [campos, setCampos] = useState<CamposParceiro>(() => camposDoParceiro(p));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const invalido = validarParceiro(campos);
    if (invalido) return setErro(invalido);
    setSalvando(true);
    const falha = await editarParceiro(p.id, campos);
    setSalvando(false);
    if (falha) return setErro(falha);
    await onSalvo();
  }

  return (
    <form onSubmit={salvar} className="card grid gap-3" noValidate aria-labelledby="titulo-editar">
      <h3 id="titulo-editar" className="titulo-secao-antigo">
        Editar cadastro
      </h3>
      <p className="text-[13px] text-ink-soft">Editar não reinicia os 90 dias.</p>
      <CamposCadastro campos={campos} setCampos={setCampos} regioes={regioes} idBase="editar" />
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      <div className="flex flex-wrap gap-2 [&>*]:flex-1">
        <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
