"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { lerPosicao } from "@/lib/distribuicao-dados";
import { distancia } from "@/lib/distribuicao";

type LocalStand = { id: string; nome: string; ativo: boolean; lat: number | null; lng: number | null; raio_m: number };

/**
 * Onde fica cada stand, para o check-in da distribuição. Lê as colunas numa
 * consulta à parte: sem o distribuicao.sql instalado, o card não aparece e o
 * resto da tela de stands segue igual.
 */
export function LocalDosStands() {
  const [stands, setStands] = useState<LocalStand[] | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await db().from("plantoes").select("id, nome, ativo, lat, lng, raio_m").eq("ativo", true).order("ordem").order("nome");
    setStands(error ? null : ((data ?? []) as LocalStand[]));
  }, []);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  if (!stands) return null;
  return (
    <section className="card lg:col-span-2" aria-labelledby="t-local">
      <span className="eyebrow">Check-in da distribuição</span>
      <h2 id="t-local" className="titulo-card mt-1">
        Localização dos stands
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">No stand, toque em Usar minha localização aqui e salve. O raio é a distância que conta como dentro.</p>
      <ul className="mt-3 grid">
        {stands.map((s) => (
          <LinhaLocal key={s.id} stand={s} onSalvo={carregar} />
        ))}
        {!stands.length && <li className="text-ink-soft">Nenhum stand ativo.</li>}
      </ul>
    </section>
  );
}

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function LinhaLocal({ stand, onSalvo }: { stand: LocalStand; onSalvo: () => void }) {
  const [lat, setLat] = useState(stand.lat?.toString() ?? "");
  const [lng, setLng] = useState(stand.lng?.toString() ?? "");
  const [raio, setRaio] = useState(String(stand.raio_m ?? 200));
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = `local-${stand.id}`;

  async function usarAqui() {
    setOcupado(true);
    setAviso(null);
    const p = await lerPosicao();
    setOcupado(false);
    if ("erro" in p)
      return setAviso({ texto: p.erro === 1 ? "! Localização bloqueada. Libere no navegador." : "! Localização imprecisa. Tente num lugar aberto.", ok: false });
    setLat(p.lat.toFixed(6));
    setLng(p.lng.toFixed(6));
    setAviso({
      texto: p.precisao > 100 ? `! Precisão de ${distancia(p.precisao)}. Tente num lugar aberto antes de salvar.` : `✓ Precisão de ${distancia(p.precisao)}. Salve para gravar.`,
      ok: p.precisao <= 100,
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const la = num(lat),
      ln = num(lng),
      r = num(raio);
    if ((la == null) !== (ln == null)) return setAviso({ texto: "✕ Preencha a latitude e a longitude, ou deixe as duas vazias.", ok: false });
    if (la != null && (!Number.isFinite(la) || la < -90 || la > 90 || !Number.isFinite(ln!) || ln! < -180 || ln! > 180))
      return setAviso({ texto: "✕ Confira a latitude e a longitude.", ok: false });
    if (r == null || !Number.isInteger(r) || r < 30 || r > 1000) return setAviso({ texto: "✕ O raio vai de 30 a 1000 m.", ok: false });
    setOcupado(true);
    const { data, error } = await db().from("plantoes").update({ lat: la, lng: ln, raio_m: r }).eq("id", stand.id).select("id");
    setOcupado(false);
    if (error) return setAviso({ texto: `✕ ${mensagemErro(error)}`, ok: false });
    if (!data?.length) return setAviso({ texto: "✕ Não foi salvo. Seu perfil pode não ter permissão.", ok: false });
    setAviso({ texto: "✓ Localização salva.", ok: true });
    onSalvo();
  }

  return (
    <li className="border-t border-line py-3 first:border-t-0">
      <form onSubmit={salvar} className="grid gap-2">
        <p className="font-semibold">
          {stand.nome}
          <span className="ml-2 text-[13px] font-normal text-ink-soft">{stand.lat != null ? "✓ com localização" : "– sem localização"}</span>
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_110px]">
          <div>
            <label className="field-label" htmlFor={`${id}-lat`}>
              Latitude
            </label>
            <input id={`${id}-lat`} inputMode="decimal" className="input md:py-[8px]" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${id}-lng`}>
              Longitude
            </label>
            <input id={`${id}-lng`} inputMode="decimal" className="input md:py-[8px]" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${id}-raio`}>
              Raio (m)
            </label>
            <input id={`${id}-raio`} inputMode="numeric" className="input md:py-[8px]" value={raio} onChange={(e) => setRaio(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={ocupado} className="btn btn-ghost focus-ring" onClick={usarAqui}>
            Usar minha localização aqui
          </button>
          <button type="submit" disabled={ocupado} className="btn btn-ghost focus-ring">
            Salvar
          </button>
        </div>
        {aviso && (
          <p role="status" className={aviso.ok ? "aviso-ok" : "aviso-erro"}>
            {aviso.texto}
          </p>
        )}
      </form>
    </li>
  );
}
