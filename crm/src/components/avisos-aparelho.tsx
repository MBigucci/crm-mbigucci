"use client";

// Card "Avisos neste aparelho" de Minha conta: liga e desliga os avisos no
// celular e escolhe os tipos. Adaptado de PushSettings, no CRM da Bruna
// (ref/CRM Bruna/src/components/account-dialog.tsx). Regras em docs/notificacoes.md.

import { useEffect, useRef, useState } from "react";
import {
  desligarAvisos,
  disponibilidade,
  ehIphone,
  enviarTeste,
  esteAparelho,
  ligarAvisos,
  salvarTipos,
  type Disponibilidade,
  type TipoAviso,
} from "@/lib/push";
import { tiposDoAparelho } from "@/lib/avisos";
import { useSessao } from "@/lib/sessao";
import { Ajuste } from "@/components/alicerce/ajuste";
import { Aviso } from "@/components/alicerce/aviso";
import { Cartao } from "@/components/alicerce/cartao";
import { Interruptor } from "@/components/alicerce/interruptor";

type Nota = { ok: boolean; texto: string };

function comoDesbloquear() {
  if (ehIphone())
    return "Os avisos estão bloqueados. No iPhone: Ajustes > Notificações > Base360 > Permitir Notificações. Depois tente de novo.";
  if (/Android/.test(navigator.userAgent)) {
    return "Os avisos estão bloqueados. Segure o ícone do Base360 > Informações do app > Notificações > Permitir. Depois tente de novo.";
  }
  return "Os avisos estão bloqueados para este site. Toque no cadeado ao lado do endereço > Permissões > Notificações > Permitir. Depois tente de novo.";
}

export function AvisosNesteAparelho() {
  const { pode } = useSessao();
  // "Equipe" só para quem vê a equipe (item 28) e "Parceiros" só para quem cadastra
  // parceiros (05/11/2026); quem não vê nunca grava esses tipos.
  const visiveis = tiposDoAparelho(pode);
  const soVisiveis = (ts: TipoAviso[]) => ts.filter((t) => visiveis.some((v) => v.slug === t));
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ligado, setLigado] = useState(false);
  const [tipos, setTipos] = useState<TipoAviso[]>(() => visiveis.map((t) => t.slug));
  // Os tipos atuais num ref: dois toques rápidos não se perdem (a versão com closure perde).
  const tiposRef = useRef(tipos);
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState<Nota | null>(null);

  useEffect(() => {
    const d = disponibilidade();
    setDisp(d);
    if (d !== "ok") return;
    esteAparelho()
      .then((a) => {
        setLigado(a.ligado);
        tiposRef.current = a.tipos;
        setTipos(a.tipos);
      })
      .catch(() => setLigado(false));
  }, []);

  async function rodar(fn: () => Promise<Nota | void>) {
    setOcupado(true);
    setNota(null);
    try {
      const n = await fn();
      if (n) setNota(n);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setNota({ ok: false, texto: m === "bloqueado" ? comoDesbloquear() : m });
    } finally {
      setOcupado(false);
    }
  }

  function alternar(slug: TipoAviso, marcado: boolean) {
    const novo = marcado ? [...new Set([...tiposRef.current, slug])] : tiposRef.current.filter((t) => t !== slug);
    tiposRef.current = novo;
    setTipos(novo);
    if (ligado) {
      void rodar(async () => {
        await salvarTipos(soVisiveis(novo));
      });
    }
  }

  const rodape = disp === "ok" && (
    <>
      {ligado ? (
        <>
          <button
            type="button"
            className="mb-botao mb-botao--discreto"
            disabled={ocupado}
            onClick={() =>
              rodar(async () => {
                await desligarAvisos();
                setLigado(false);
                return { ok: true, texto: "Avisos desligados neste aparelho." };
              })
            }
          >
            Desligar neste aparelho
          </button>
          <button
            type="button"
            className="mb-botao mb-botao--secundario"
            disabled={ocupado}
            onClick={() =>
              rodar(async () => {
                const r = await enviarTeste();
                if (r === "enviado")
                  return {
                    ok: true,
                    texto: "Teste enviado. Ele chega em alguns segundos.",
                  };
                if (r === "removido") {
                  setLigado(false);
                  return {
                    ok: false,
                    texto: "Este aparelho saiu da lista de avisos. Ligue de novo.",
                  };
                }
                return {
                  ok: false,
                  texto: "O serviço de avisos recusou o envio. Desligue e ligue de novo.",
                };
              })
            }
          >
            Enviar um aviso de teste
          </button>
        </>
      ) : (
        <button
          type="button"
          className="mb-botao mb-botao--secundario"
          aria-busy={ocupado || undefined}
          disabled={ocupado || tipos.length === 0}
          onClick={() =>
            rodar(async () => {
              await ligarAvisos(soVisiveis(tipos));
              setLigado(true);
              return {
                ok: true,
                texto: "Avisos ligados. Use Enviar um aviso de teste para conferir.",
              };
            })
          }
        >
          {ocupado ? "Ligando…" : "Ligar avisos neste aparelho"}
        </button>
      )}
    </>
  );

  return (
    <Cartao
      id="t-avisos"
      secao="avisos"
      titulo="Avisos neste aparelho"
      descricao="O Base360 Vendas avisa no celular, mesmo fechado, na hora de cada contato e de cada visita. Escolha o que quer receber. Vale só para este aparelho."
      rodape={rodape || undefined}
    >
      <div className="avisos-corpo">
        {ehIphone() && disp !== null && (
          <p className="mb-ajuste__ajuda">
            <span className="font-semibold">iPhone:</span> os avisos só funcionam com o Base360 instalado na Tela de Início (Safari &gt;
            Compartilhar &gt; Adicionar à Tela de Início), no iOS 16.4 ou mais novo. Depois, abra o Base360 pelo ícone e ligue aqui.
          </p>
        )}
        {disp === null && (
          <p className="mb-ajuste__ajuda" aria-busy="true">
            Carregando…
          </p>
        )}
        {disp === "iphone-instalar" && <Aviso tom="alerta" titulo="Abra o Base360 pelo ícone da Tela de Início para ligar os avisos." />}
        {disp === "sem-suporte" && (
          <Aviso
            tom="alerta"
            titulo={
              ehIphone() ? "Atualize o iPhone para o iOS 16.4 ou mais novo." : "Este navegador não aceita avisos. No celular, use o Chrome."
            }
          />
        )}
        {disp === "sem-chave" && <Aviso tom="alerta" titulo="Os avisos ainda não foram configurados no Base360 Vendas." />}

        {disp === "ok" && (
          <>
            <span className={ligado ? "mb-salvo mb-salvo--ok" : "mb-salvo"}>
              {ligado ? "✓ Ligados neste aparelho" : "– Desligados neste aparelho"}
            </span>
            <div role="group" aria-label="O que avisar">
              {visiveis.map((t) => (
                <Ajuste key={t.slug} rotulo={t.nome} ajuda={t.explica}>
                  <Interruptor
                    ligado={tipos.includes(t.slug)}
                    rotulo={t.nome}
                    desativado={ocupado}
                    onAlternar={(novo) => alternar(t.slug, novo)}
                  />
                </Ajuste>
              ))}
            </div>
            {nota && <Aviso tom={nota.ok ? "sucesso" : "erro"} titulo={nota.texto} />}
          </>
        )}
      </div>
    </Cartao>
  );
}
