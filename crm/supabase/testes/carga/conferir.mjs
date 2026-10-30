// Conferência depois da carga: o que o app mostrou como salvo existe uma vez
// só, nada ficou sem dono e o histórico bate com o estado dos leads.
// Cada item volta como { nome, ok, detalhe }.

export async function conferir(db, { inicio, confirmados, avisosEnviados }) {
  const out = [];
  const item = (nome, ok, detalhe) => out.push({ nome, ok, detalhe });
  const q = async (sql, p = []) => (await db.query(sql, p)).rows;
  const de = (tipo) => confirmados.filter((c) => c.tipo === tipo);

  /** Cada token confirmado aparece exatamente uma vez na coluna. */
  async function porToken(nome, tipo, tabela, coluna, prefixo) {
    const tokens = de(tipo).map((c) => c.token);
    const rows = await q(
      `select t, (select count(*)::int from ${tabela} where ${coluna} like $2 || t || '%') n from unnest($1::text[]) t`,
      [tokens, prefixo],
    );
    const perdidos = rows.filter((r) => r.n === 0).length;
    const dup = rows.filter((r) => r.n > 1).reduce((s, r) => s + r.n - 1, 0);
    const extras = (await q(`select count(*)::int n from ${tabela} where ${coluna} like $1 || '%'`, [prefixo]))[0].n - (tokens.length - perdidos) - dup;
    item(nome, perdidos === 0 && dup === 0,
      `${tokens.length} confirmados, ${perdidos} perdidos, ${dup} duplicados` + (extras ? `, ${extras} gravados sem o app saber (resposta perdida)` : ""));
  }

  await porToken("Leads cadastrados", "lead", "public.leads", "nome", "Carga ");
  await porToken("Mensagem colada (Cadastro Mágico)", "mensagem", "public.lead_interacoes", "texto", "Msg ");
  await porToken("Interações", "interacao", "public.lead_interacoes", "texto", "Int ");
  await porToken("Visitas agendadas", "visita", "public.visitas", "observacao", "Vis ");
  await porToken("Vendas", "venda", "public.vendas", "observacao", "Ven ");

  // Sem resposta: uma linha por toque que o app mostrou; o toque duplo vira 2.
  {
    const t = de("tentativa");
    const gravados = t.reduce((s, c) => s + c.gravados, 0);
    const dup = t.reduce((s, c) => s + Math.max(0, c.gravados - 1), 0);
    const banco = (await q(`select count(*)::int n from public.lead_interacoes where tipo = 'tentativa' and criado_em >= $1`, [inicio]))[0].n;
    item("Sem resposta (tentativas)", banco === gravados && dup === 0,
      `${t.length} toques confirmados, ${banco} linhas no banco, ${dup} duplicadas por toque duplo`);
  }

  // Nenhum lead sem dono, nem com dono inativo ou que não é corretor.
  {
    const [r] = await q(`select count(*)::int n from public.leads l left join public.profiles p on p.id = l.dono_id
                         where p.id is null or not p.ativo or p.perfil <> 'corretor'`);
    item("Leads sem dono", r.n === 0, `${r.n} leads sem corretor ativo como dono`);
  }

  // Todo lead tem exatamente um evento "criado".
  {
    const [r] = await q(`select count(*)::int n from public.leads l
                         where (select count(*) from public.lead_eventos e where e.lead_id = l.id and e.tipo = 'criado') <> 1`);
    item("Evento criado", r.n === 0, `${r.n} leads sem (ou com mais de um) evento "criado"`);
  }

  // Histórico encadeado: em cada lead, o "para" de um evento é o "de" do
  // seguinte, e o último bate com o lead. Pega update perdido entre requisições.
  for (const [tipo, coluna] of [["etapa", "etapa"], ["temperatura", "temperatura"], ["dono", "dono_id::text"], ["status", "status"]]) {
    const quebras = await q(
      `with ev as (
         select lead_id, de, para, lead(de) over (partition by lead_id order by criado_em, ctid) prox_de,
                row_number() over (partition by lead_id order by criado_em desc, ctid desc) ultimo
         from public.lead_eventos where tipo = $1)
       select
         (select count(*)::int from ev where prox_de is not null and prox_de is distinct from para) elos,
         (select count(*)::int from ev join public.leads l on l.id = ev.lead_id where ev.ultimo = 1 and ev.para is distinct from (l.${coluna})::text) final`,
      [tipo],
    );
    item(`Histórico de ${tipo}`, quebras[0].elos === 0 && quebras[0].final === 0,
      `${quebras[0].elos} elos quebrados, ${quebras[0].final} leads com o último evento diferente do valor atual`);
  }

  // Cada reatribuição confirmada pelo gerente tem o evento "dono".
  {
    const d = de("dono");
    const rows = await q(
      `select count(*)::int n from unnest($1::uuid[], $2::text[]) x(lead, para)
       where not exists (select 1 from public.lead_eventos e where e.lead_id = x.lead and e.tipo = 'dono' and e.para = x.para and e.criado_em >= $3)`,
      [d.map((c) => c.lead), d.map((c) => c.para), inicio],
    );
    item("Reatribuições no histórico", rows[0].n === 0, `${d.length} reatribuições, ${rows[0].n} sem evento`);
  }

  // Tentativas do lead = "Sem resposta" depois da última conversa (ou visita realizada).
  {
    const rows = await q(
      `with marcos as (
         select lead_id, criado_em t, tipo from public.lead_interacoes
         union all select lead_id, baixa_em, 'visita_realizada' from public.visitas where status = 'realizada'
       ),
       ultimo_zero as (
         select lead_id, max(t) t from marcos where tipo in ('whatsapp', 'ligacao', 'email', 'visita', 'visita_realizada') group by lead_id
       ),
       esperado as (
         select l.id, l.tentativas,
                least(99, (select count(*) from marcos m where m.lead_id = l.id and m.tipo = 'tentativa'
                            and m.t >= coalesce((select t from ultimo_zero z where z.lead_id = l.id), '-infinity'))) esp,
                exists (select 1 from marcos m join ultimo_zero z on z.lead_id = m.lead_id
                        where m.lead_id = l.id and m.tipo = 'tentativa' and m.t = z.t) empate
         from public.leads l where l.status = 'ativo')
       select count(*) filter (where tentativas <> esp and not empate)::int n, count(*) filter (where empate)::int empates from esperado`,
    );
    item("Contador de tentativas", rows[0].n === 0, `${rows[0].n} leads com o contador diferente das interações` +
      (rows[0].empates ? ` (${rows[0].empates} com conversa e tentativa no mesmo instante, fora da conta)` : ""));
  }

  // Último contato = a interação mais recente (ou a visita realizada).
  {
    const [r] = await q(
      `select count(*)::int n from public.leads l
       where l.ultima_interacao_em is distinct from greatest(
         (select max(criado_em) from public.lead_interacoes i where i.lead_id = l.id),
         (select max(baixa_em) from public.visitas v where v.lead_id = l.id and v.status = 'realizada'))`,
    );
    item("Último contato", r.n === 0, `${r.n} leads em que o "último contato" não é o mais recente`);
  }

  // Visitas: cada baixa confirmada está no banco; cada realizada tem um lançamento ativo; nenhuma cancelada pontua.
  {
    const b = de("baixa");
    const [r1] = await q(`select count(*)::int n from unnest($1::uuid[]) v where not exists
                          (select 1 from public.visitas x where x.id = v and x.status in ('realizada', 'nao_compareceu'))`, [b.map((c) => c.visita)]);
    item("Baixas de visita", r1.n === 0, `${b.length} baixas confirmadas, ${r1.n} sem baixa no banco`);
    const [r2] = await q(
      `select
         (select count(*)::int from public.visitas v where v.status = 'realizada'
            and (select count(*) from public.lancamentos_pontos p where p.visita_id = v.id and p.status in ('pendente', 'aprovado')) <> 1) sem,
         (select count(*)::int from public.lancamentos_pontos p join public.visitas v on v.id = p.visita_id
            where v.status <> 'realizada' and p.status in ('pendente', 'aprovado')) sobra,
         (select count(*)::int from public.lancamentos_pontos where criterio = 'visita') total`,
    );
    item("Pontos das visitas", r2.sem === 0 && r2.sobra === 0,
      `${r2.total} lançamentos de visita; ${r2.sem} realizadas sem exatamente 1 lançamento; ${r2.sobra} lançamentos de visita não realizada`);
  }

  // Períodos da recepção: os confirmados existem e não há dois ativos no mesmo turno.
  {
    const p = de("periodo");
    const [r] = await q(
      `select (select count(*)::int from unnest($1::uuid[]) i where not exists (select 1 from public.lancamentos_pontos x where x.id = i)) faltam,
              (select count(*)::int from (select corretor_id, data, periodo from public.lancamentos_pontos
                 where criterio = 'periodo' and status in ('pendente', 'aprovado') group by 1, 2, 3 having count(*) > 1) d) dup`,
      [p.map((c) => c.id)],
    );
    item("Períodos da recepção", r.faltam === 0 && r.dup === 0, `${p.length} confirmados, ${r.faltam} perdidos, ${r.dup} turnos duplicados`);
  }

  // Auditoria dos lançamentos: um "criado" por lançamento.
  {
    const [r] = await q(`select count(*)::int n from public.lancamentos_pontos p
                         where (select count(*) from public.lancamentos_pontos_historico h where h.lancamento_id = p.id and h.acao = 'criado') <> 1`);
    item("Auditoria dos lançamentos", r.n === 0, `${r.n} lançamentos sem exatamente 1 registro "criado"`);
  }

  // Avisos: rodadas simultâneas não mandam o mesmo aviso duas vezes.
  {
    const repetidos = [...avisosEnviados.values()].filter((n) => n > 1).length;
    item("Avisos sem repetição", repetidos === 0, `${avisosEnviados.size} avisos registrados, ${repetidos} enviados mais de uma vez`);
  }
  return out;
}
