"use client";

// A venda na ficha, no Alicerce (passo f do item 48). As mesmas regras, textos e gravações de `vendas.tsx`;
// muda só o desenho: Cartao, .mb-pares, Selo e, dentro do cartão, sub-seções planas. A tela Vendas segue como está.

import { useState } from "react";
import { diaIso, lerReais, seloVenda, type Venda } from "@/lib/vendas";
import { corrigirVenda } from "@/lib/vendas-dados";
import { Aviso } from "@/components/alicerce/aviso";
import { Campo } from "@/components/alicerce/campo";
import { CampoEmpreendimento } from "@/components/alicerce/campo-empreendimento";
import { Selo } from "@/components/alicerce/selo";

export const reaisParaCampo = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** O estado da venda no Selo: paga em verde, pendente em âmbar, cancelada em vermelho. */
export function SeloDaVenda({ venda }: { venda: Pick<Venda, "status" | "pagamento" | "pago_em"> }) {
  const s = seloVenda(venda);
  return <Selo tom={venda.status === "cancelada" ? "erro" : venda.pagamento === "pago" ? "sucesso" : "alerta"}>{s.texto}</Selo>;
}

function Botoes({ rotulo, onCancelar }: { rotulo: string; onCancelar: () => void }) {
  return (
    <div className="mb-grupo-botoes mb-grupo-botoes--fim">
      <button className="mb-botao mb-botao--discreto" type="button" onClick={onCancelar}>
        Voltar
      </button>
      <button className="mb-botao mb-botao--secundario" type="submit">
        {rotulo}
      </button>
    </div>
  );
}

export type CamposDaVenda = {
  empreendimento: string;
  unidade: string;
  vgv: string;
  assinada_em: string;
  paga: boolean;
  pago_em: string;
  observacao: string;
};

/** O formulário de Registrar venda: o estado e a gravação ficam em `RegistrarVenda`. */
export function RegistrarVendaAlicerce({
  nome,
  f,
  setF,
  setEditado,
  erro,
  salvando,
  hoje,
  onSubmit,
  onCancelar,
}: {
  nome?: string;
  f: CamposDaVenda;
  setF: React.Dispatch<React.SetStateAction<CamposDaVenda>>;
  setEditado: (v: boolean) => void;
  erro: string | null;
  salvando: boolean;
  hoje: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancelar: () => void;
}) {
  const muda = (k: "unidade" | "assinada_em" | "pago_em" | "observacao") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEditado(true);
      setF((x) => ({ ...x, [k]: e.target.value }));
    },
  });
  return (
    <section className="mb-cartao ficha__ancora" aria-label="Registrar venda">
      <form onSubmit={onSubmit} className="mb-cartao__corpo ficha__corpo" noValidate>
        <h3 className="titulo-cartao">{nome ? `Parabéns pela venda para ${nome}.` : "Registrar venda"}</h3>
        <p className="ficha__texto">A venda conta no mês da assinatura. O VGV válido é o das vendas assinadas e pagas.</p>
        <div className="mb-form-grade">
          <CampoEmpreendimento
            valor={f.empreendimento}
            colunas={6}
            onChange={(v) => {
              setEditado(true);
              setF((x) => ({ ...x, empreendimento: v }));
            }}
          />
          <Campo rotulo="Unidade (opcional)" colunas={6}>
            <input className="mb-campo__entrada" placeholder="Apto 52, torre B" autoComplete="off" {...muda("unidade")} />
          </Campo>
          <Campo rotulo="VGV (R$)" colunas={6}>
            <input
              className="mb-campo__entrada"
              inputMode="decimal"
              autoComplete="off"
              placeholder="480.000"
              value={f.vgv}
              onChange={(e) => {
                setEditado(true);
                setF((x) => ({ ...x, vgv: e.target.value }));
              }}
            />
          </Campo>
          <Campo rotulo="Data da assinatura" colunas={6}>
            <input className="mb-campo__entrada" type="date" max={hoje} {...muda("assinada_em")} />
          </Campo>
        </div>
        <label className="mb-marcador">
          <input
            type="checkbox"
            checked={f.paga}
            onChange={(e) => {
              setEditado(true);
              setF((x) => ({ ...x, paga: e.target.checked }));
            }}
          />
          <span>Já está paga</span>
        </label>
        {f.paga && (
          <Campo rotulo="Data do pagamento">
            <input className="mb-campo__entrada" type="date" max={hoje} {...muda("pago_em")} />
          </Campo>
        )}
        <Campo rotulo="Observação (opcional)">
          <textarea className="mb-campo__entrada" {...muda("observacao")} />
        </Campo>
        {erro && <Aviso tom="erro" titulo={erro} />}
        <div className="mb-grupo-botoes mb-grupo-botoes--fim">
          <button className="mb-botao mb-botao--discreto" type="button" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="mb-botao mb-botao--secundario mb-botao--bloco-celular" type="submit" aria-busy={salvando || undefined} disabled={salvando}>
            {salvando ? "Registrando…" : "Registrar venda"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function PagarAlicerce({ onCancelar, onSalvar }: { onCancelar: () => void; onSalvar: (data: string) => Promise<void> }) {
  const hoje = diaIso(new Date());
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <form
      className="mb-subsecao ficha__corpo"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!data || data > hoje) setErro("Confira a data do pagamento: até hoje.");
        else onSalvar(data);
      }}
    >
      <h4 className="mb-subsecao__titulo">Marcar como paga</h4>
      <Campo rotulo="Data do pagamento">
        <input className="mb-campo__entrada" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
      </Campo>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <Botoes rotulo="✓ Confirmar pagamento" onCancelar={onCancelar} />
    </form>
  );
}

/** Pede o motivo (ele vai para o histórico do lead). */
export function MotivoAlicerce({
  titulo,
  texto,
  botao,
  onCancelar,
  onSalvar,
}: {
  titulo: string;
  texto: string;
  botao: string;
  onCancelar: () => void;
  onSalvar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <form
      className="mb-subsecao ficha__corpo"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (motivo.trim().length < 3) setErro("Escreva o motivo.");
        else onSalvar(motivo.trim());
      }}
    >
      <h4 className="mb-subsecao__titulo">{titulo}</h4>
      <p className="ficha__texto">{texto}</p>
      <Campo rotulo="Motivo">
        <textarea className="mb-campo__entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <Botoes rotulo={botao} onCancelar={onCancelar} />
    </form>
  );
}

/** Corrigir os dados da venda. Só o que mudou vai para o banco, com o motivo. */
export function CorrigirAlicerce({
  venda: v,
  onCancelar,
  onSalvar,
}: {
  venda: Venda;
  onCancelar: () => void;
  onSalvar: (campos: Parameters<typeof corrigirVenda>[1], motivo: string) => Promise<void>;
}) {
  const hoje = diaIso(new Date());
  const [f, setF] = useState({
    empreendimento: v.empreendimento,
    unidade: v.unidade ?? "",
    vgv: reaisParaCampo(Number(v.vgv)),
    assinada_em: v.assinada_em,
    paga: v.pagamento === "pago",
    pago_em: v.pago_em ?? hoje,
    observacao: v.observacao ?? "",
    motivo: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const campo = (k: "unidade" | "assinada_em" | "pago_em" | "observacao" | "motivo") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })),
  });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const vgv = lerReais(f.vgv);
    if (!f.empreendimento.trim()) return setErro("Escolha o empreendimento.");
    if (!vgv) return setErro("Confira o VGV: só números, como 480.000.");
    if (!f.assinada_em || f.assinada_em > hoje) return setErro("Confira a data da assinatura: até hoje.");
    if (f.paga && (!f.pago_em || f.pago_em > hoje)) return setErro("Confira a data do pagamento: até hoje.");
    const novo = {
      empreendimento: f.empreendimento.trim(),
      unidade: f.unidade.trim() || null,
      vgv,
      assinada_em: f.assinada_em,
      pagamento: f.paga ? ("pago" as const) : ("pendente" as const),
      pago_em: f.paga ? f.pago_em : null,
      observacao: f.observacao.trim() || null,
    };
    const campos = Object.fromEntries(
      Object.entries(novo).filter(([k, x]) => (k === "vgv" ? Number(v.vgv) !== x : (v[k as keyof Venda] ?? null) !== x)),
    );
    if (!Object.keys(campos).length) return setErro("Nada mudou.");
    if (f.motivo.trim().length < 3) return setErro("Escreva o motivo da correção.");
    setErro(null);
    onSalvar(campos, f.motivo.trim());
  }

  return (
    <form onSubmit={salvar} className="mb-subsecao ficha__corpo" noValidate>
      <h4 className="mb-subsecao__titulo">Corrigir a venda</h4>
      <div className="mb-form-grade">
        <CampoEmpreendimento valor={f.empreendimento} colunas={6} onChange={(emp) => setF((x) => ({ ...x, empreendimento: emp }))} />
        <Campo rotulo="Unidade" colunas={6}>
          <input className="mb-campo__entrada" {...campo("unidade")} />
        </Campo>
        <Campo rotulo="VGV (R$)" colunas={6}>
          <input className="mb-campo__entrada" inputMode="decimal" autoComplete="off" value={f.vgv} onChange={(e) => setF((x) => ({ ...x, vgv: e.target.value }))} />
        </Campo>
        <Campo rotulo="Data da assinatura" colunas={6}>
          <input className="mb-campo__entrada" type="date" max={hoje} {...campo("assinada_em")} />
        </Campo>
      </div>
      <label className="mb-marcador">
        <input type="checkbox" checked={f.paga} onChange={(e) => setF((x) => ({ ...x, paga: e.target.checked }))} />
        <span>Paga</span>
      </label>
      {f.paga && (
        <Campo rotulo="Data do pagamento">
          <input className="mb-campo__entrada" type="date" max={hoje} {...campo("pago_em")} />
        </Campo>
      )}
      <Campo rotulo="Observação">
        <textarea className="mb-campo__entrada" {...campo("observacao")} />
      </Campo>
      <Campo rotulo="Motivo da correção">
        <textarea className="mb-campo__entrada" placeholder="Ex.: Valor do contrato assinado" {...campo("motivo")} />
      </Campo>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <Botoes rotulo="Salvar correção" onCancelar={onCancelar} />
    </form>
  );
}
