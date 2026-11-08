"use client";
import { useEffect, useRef, useState } from "react";
import { Campo, CampoEmGrupo } from "@/components/alicerce/campo";
import { Envio, ItemDeEnvio } from "@/components/alicerce/envio";
import { Seletor } from "@/components/alicerce/seletor";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { usePerfil } from "@/lib/sessao";
import { novoId } from "@/lib/supabase";
import { diaIso } from "@/lib/vendas";
import { enviarAcao, cancelarAcao } from "@/lib/programa-dados";
import { reduzirImagem } from "./imagem";

export function LancarAcao({ mes, lancadas, limite, onSalvo }: { mes: string; lancadas: number; limite: number; onSalvo: () => void }) {
  const eu = usePerfil(); const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"video" | "blitz">("video");
  const [modo, setModo] = useState<"link" | "print">("link");
  const [data, setData] = useState(() => { const hoje = diaIso(new Date()); return hoje.slice(0,7) === mes.slice(0,7) ? hoje : mes; });
  const [link, setLink] = useState("");
  const [arquivo, setArquivo] = useState<{ nome: string; blob: Blob } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [reduzindo, setReduzindo] = useState(false);
  const [online, setOnline] = useState(true);
  const botao = useRef<HTMLButtonElement>(null); const camera = useRef<HTMLInputElement>(null);
  const envio = useRef<string | null>(null); const geracao = useRef(0);
  const hoje = diaIso(new Date());
  const ultimoDia = diaIso(new Date(Number(mes.slice(0,4)), Number(mes.slice(5,7)), 0));
  const maximoDia = hoje < ultimoDia ? hoje : ultimoDia;
  useEffect(() => { const atualizar = () => setOnline(navigator.onLine); atualizar(); window.addEventListener("online", atualizar); window.addEventListener("offline", atualizar); return () => { window.removeEventListener("online", atualizar); window.removeEventListener("offline", atualizar); }; }, []);
  function alterar() { envio.current = null; setErro(null); }
  function limparArquivo() { geracao.current++; setArquivo(null); setReduzindo(false); alterar(); }
  async function escolher(f?: File) {
    if (!f) return;
    const versao = ++geracao.current;
    setArquivo(null); setReduzindo(true); alterar();
    try { const blob = await reduzirImagem(f); if (versao === geracao.current) setArquivo({ nome: f.name, blob }); }
    catch (e) { if (versao === geracao.current) setErro((e as Error).message); }
    finally { if (versao === geracao.current) setReduzindo(false); }
  }
  async function salvar() {
    if (ocupado || reduzindo) return;
    if (!navigator.onLine) return setErro("Sem internet: não foi gravado. Tente de novo quando a conexão voltar.");
    if (!data || data < mes || data > maximoDia) return setErro("Escolha a data da ação dentro do mês selecionado, até hoje.");
    const usaArquivo = tipo === "blitz" || modo === "print";
    if (usaArquivo && !arquivo) return setErro(tipo === "blitz" ? "Adicione a foto da blitz." : "Adicione o print do vídeo.");
    if (!usaArquivo && !/^https:\/\/\S+$/.test(link.trim())) return setErro("Cole o link do vídeo começando com https://.");
    setOcupado(true); setErro(null);
    envio.current ??= novoId();
    try {
      const r = await enviarAcao({ id: envio.current, corretor_id: eu.id, criterio: "video", tipo_acao: tipo, data,
        quantidade: 1, comprovante: usaArquivo ? null : link.trim() }, usaArquivo ? arquivo!.blob : null, eu.id);
      if (r.erro) { setErro(r.erro); return; }
      setAberto(false); setLink(""); limparArquivo(); envio.current = null; onSalvo();
      toast.mostrar("Ação enviada para aprovação.", { tipo: "sucesso", aoDesfazer: async () => {
        const e = await cancelarAcao(r.id); if (e) toast.mostrar(e, { tipo: "erro" }); onSalvo();
      } });
    } catch { setErro("Não foi possível enviar. O que você preencheu continua aqui. Tente de novo."); }
    finally { setOcupado(false); }
  }
  return <>
    <button ref={botao} className="mb-botao mb-botao--primario" type="button" onClick={() => setAberto(true)}>Lançar ação</button>
    <PainelLateral aberto={aberto} onFechar={() => !ocupado && setAberto(false)} foco={() => botao.current} titulo="Lançar ação" descricao="Vídeo ou blitz · uma ação por envio"
      rodape={<div className="mb-lateral__rodape"><button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={() => setAberto(false)}>Cancelar</button><button className="mb-botao mb-botao--primario" aria-busy={ocupado} disabled={ocupado || reduzindo} onClick={salvar}>{ocupado ? "Enviando…" : "Enviar para aprovação"}</button></div>}>
      <div className="mb-lateral__corpo">
        {lancadas >= limite && <Aviso tom="alerta" titulo="Limite de lançamentos atingido" texto={`Você já lançou ${lancadas} ações. Pode enviar outra como reserva se alguma for recusada. Só ${limite} aprovadas somam pontos.`} />}
        <CampoEmGrupo id="acao-tipo" rotulo="Tipo de ação" obrigatorio><Seletor idRotulo="acao-tipo" grade="linha" valor={tipo} onChange={v => { if (!ocupado) { setTipo(v); limparArquivo(); } }} opcoes={[{ valor: "video", rotulo: "Vídeo" },{ valor: "blitz", rotulo: "Blitz" }]} /></CampoEmGrupo>
        <Campo rotulo="Data da ação" obrigatorio><input required className="mb-campo__entrada" type="date" min={mes} max={maximoDia} value={data} disabled={ocupado} onChange={e => { setData(e.target.value); alterar(); }} /></Campo>
        {tipo === "video" && <CampoEmGrupo id="acao-modo" rotulo="Comprovante do vídeo" obrigatorio><Seletor idRotulo="acao-modo" grade="linha" valor={modo} onChange={v => { if (!ocupado) { setModo(v); alterar(); } }} opcoes={[{ valor: "link", rotulo: "Link" },{ valor: "print", rotulo: "Print" }]} /></CampoEmGrupo>}
        {tipo === "video" && modo === "link" ? <Campo rotulo="Link do vídeo" obrigatorio ajuda="O vídeo deve mostrar a marca MBigucci."><input required type="url" className="mb-campo__entrada" placeholder="https://…" value={link} disabled={ocupado} onChange={e => { setLink(e.target.value); alterar(); }} /></Campo> : <div className="grid gap-3" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!ocupado) void escolher(e.dataTransfer.files[0]); }}>
          <span id="acao-imagem" className="mb-campo__rotulo">{tipo === "blitz" ? "Foto da blitz" : "Print do vídeo"} <span className="mb-campo__obrigatorio">*</span></span>
          {tipo === "blitz" && <><button className="mb-botao mb-botao--secundario justify-self-start" type="button" disabled={ocupado || !online} onClick={() => camera.current?.click()}>Tirar foto</button><input hidden type="file" accept="image/*" capture="environment" ref={camera} onChange={e => { void escolher(e.target.files?.[0]); e.target.value = ""; }} /></>}
          <Envio idRotulo="acao-imagem" titulo={<>Arraste a imagem ou <u>escolha no aparelho</u></>} ajuda="A imagem é reduzida automaticamente antes do envio." accept="image/*" desabilitado={ocupado || reduzindo || !online} onEscolher={(f, limpar) => { void escolher(f); limpar(); }} />
          {!online && <p className="mb-campo__ajuda">Sem internet: anexe quando a conexão voltar.</p>}
          {reduzindo && <p role="status">Preparando imagem…</p>}
          {arquivo && <ul className="mb-envio__lista"><ItemDeEnvio nome={arquivo.nome} estado={ocupado ? "Enviando imagem…" : "Imagem preparada para envio"} acoes={<button className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado} onClick={limparArquivo}>Remover</button>} /></ul>}
        </div>}
        <p className="mb-campo__ajuda">{lancadas} ações lançadas no mês. Divida entre vídeo e blitz como preferir.</p>
        {erro ? <Aviso tom="erro" titulo={erro} /> : lancadas < limite && <Aviso titulo="Aguarde a aprovação" texto="A ação só soma pontos depois de aprovada pelo gerente geral. Enquanto aguarda, você pode desfazer." />}
      </div>
    </PainelLateral>
  </>;
}
