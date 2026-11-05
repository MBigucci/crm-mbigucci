// Seed do teste de carga: 1 gerente geral, 3 gerentes, 3 equipes, 40 corretores,
// recepção, 2.000 leads, visitas já passadas (para dar baixa) e aparelhos de
// aviso. Grava em seed-local.json (fora do git) quem é quem. Sem senhas: o
// teste entra como cada pessoa pelo JWT simulado (auth.uid()), não pelo Auth.
import pg from "pg";
import { writeFileSync } from "node:fs";
import { conexao } from "./banco.mjs";

export const N_CORRETORES = 40;
export const N_LEADS = 2000;
const uid = (tipo, n) => `${tipo}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export async function semear() {
  const c = new pg.Client(conexao());
  await c.connect();
  const gg = uid("a", 1);
  const gerentes = [1, 2, 3].map((n) => uid("b", n));
  const recepcao = uid("d", 1);
  const corretores = Array.from({ length: N_CORRETORES }, (_, i) => uid("c", i + 1));
  const pessoas = [
    [gg, "Gerente Geral Teste"],
    ...gerentes.map((id, i) => [id, `Gerente ${i + 1}`]),
    [recepcao, "Recepção Teste"],
    ...corretores.map((id, i) => [id, `Corretor ${String(i + 1).padStart(2, "0")}`]),
  ];
  for (const [id, nome] of pessoas)
    await c.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
      [id, `${id.slice(0, 1)}${id.slice(-4)}@carga.local`, { nome }]);

  await c.query(`update public.profiles set perfil = 'gerente_geral', ativo = true where id = $1`, [gg]);
  await c.query(`update public.profiles set perfil = 'gerente', ativo = true where id = any($1)`, [gerentes]);
  await c.query(`update public.profiles set perfil = 'recepcao', ativo = true where id = $1`, [recepcao]);
  const equipes = [];
  for (let i = 0; i < 3; i++) {
    const r = await c.query(`insert into public.teams (nome, gerente_id) values ($1, $2) returning id`, [`Equipe ${i + 1}`, gerentes[i]]);
    equipes.push(r.rows[0].id);
  }
  const equipeDe = (i) => i % 3;
  for (let i = 0; i < corretores.length; i++)
    await c.query(`update public.profiles set ativo = true, equipe_id = $2 where id = $1`, [corretores[i], equipes[equipeDe(i)]]);

  // 2.000 leads: 50 por corretor, com etapas, temperaturas e próximos contatos variados.
  await c.query(
    `insert into public.leads (dono_id, nome, whatsapp, origem, etapa, temperatura, proximo_contato, campanha, empreendimento)
     select ($1::uuid[])[1 + (g % $2)],
            'Cliente ' || g,
            '5511' || (900000000 + g)::text,
            (array['plantao','indicacao','carteira','empresa','redes_sociais','anuncio_proprio','outros'])[1 + g % 7],
            (array['novo','em_contato','visita_agendada','visita_realizada','proposta','aguardando_lancamento'])[1 + (g / 7) % 6],
            (array['quente','morno','frio', null])[1 + g % 4],
            now() + ((g % 96) - 48) * interval '1 hour',
            case when g % 7 = 5 then 'Instagram' end,
            (array['Elleva','Dom','Vivace', null])[1 + g % 4]
     from generate_series(1, $3) g`,
    [corretores, corretores.length, N_LEADS],
  );

  // Visitas que já passaram (abertas, para a baixa) e futuras, 8 por corretor.
  await c.query(
    `insert into public.visitas (lead_id, corretor_id, empreendimento, inicio, status)
     select l.id, l.dono_id, 'Elleva', now() - (k * interval '30 minutes') + case when k > 6 then interval '2 days' else interval '0' end,
            'agendada'
     from (select id, dono_id, row_number() over (partition by dono_id order by id) n from public.leads) l
     cross join lateral (select l.n as k) x
     where l.n <= 8`,
  );

  // Um aparelho de aviso por pessoa (a função avisos lê e registra no push_log).
  await c.query(
    `insert into public.push_assinaturas (endpoint, usuario_id, p256dh, auth)
     select 'https://push.local/' || id, id, 'p256dh-teste', 'auth-teste' from public.profiles where ativo`,
  );
  await c.query("analyze");
  await c.end();

  const seed = { gg, gerentes, recepcao, equipes, corretores, equipeDoCorretor: corretores.map((_, i) => equipes[equipeDe(i)]),
                 gerenteDoCorretor: corretores.map((_, i) => gerentes[equipeDe(i)]) };
  writeFileSync(new URL("./seed-local.json", import.meta.url), JSON.stringify(seed, null, 2));
  return seed;
}
