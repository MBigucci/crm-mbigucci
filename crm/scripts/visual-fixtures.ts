// Dados inteiramente fictícios, usados somente pela cópia de visual-preview.mjs.
const now = new Date();
const at = (days: number, hour = 10) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
const day = at(0).slice(0,10);
export const profiles = [
  {id:'corretor-1',nome:'Marina Exemplo',apelido:'Mari',email:'marina@example.invalid',perfil:'corretor',equipe_id:'equipe-1',ativo:true,whatsapp:'5511999990000'},
  {id:'corretor-2',nome:'Paulo Exemplo',email:'paulo@example.invalid',perfil:'corretor',equipe_id:'equipe-1',ativo:true,whatsapp:'5511999990001'},
];
const base = {dono_id:'corretor-1',whatsapp:'5511999990010',email:null,origem:'indicacao',campanha:null,empreendimento:'Residencial Exemplo',temperatura:'quente',etapa:'em_contato',proximo_contato:at(-1),status:'ativo',motivo_descarte:null,valor:600000,dormitorios:2,regiao:'Centro',finalidade:'morar',ultima_interacao_em:at(-3),ultima_interacao_texto:'Quer conhecer a planta de dois dormitórios. Retornar para combinar a visita.',tentativas:2,atribuido_por:null,atribuido_em:null,created_at:at(-7),nascimento:null,telefone2:null,estado_civil:null,profissao:null,renda:null,entrada:null,fgts:null,composicao_renda:null,possui_imovel:null};
const leads = [
  // Tocou em Abrir no WhatsApp hoje e ainda não detalhou (ajustes da ficha, 04/11/2026).
  {...base,id:'lead-1',nome:'Ana Exemplo',ultimo_toque_em:at(0,9),ultimo_toque_tipo:'toque_whatsapp'},
  {...base,id:'lead-2',nome:'Bruno Exemplo',origem:'empresa',etapa:'novo',ultima_interacao_em:null,ultima_interacao_texto:null,proximo_contato:null,atribuido_em:at(-1),atribuido_por:'gerente'},
  {...base,id:'lead-3',nome:'Clara Exemplo',temperatura:'morno',proximo_contato:at(0,23),nascimento:'1990-'+day.slice(5)},
  {...base,id:'lead-4',nome:'Daniel Exemplo',dono_id:'corretor-2',temperatura:'frio',etapa:'proposta',proximo_contato:null},
  {...base,id:'sem-telefone',nome:'Rita Exemplo',whatsapp:null,proximo_contato:at(-1)},
  // Revisão de conforto (06/11/2026): um dia mais cheio, com nome longo e temperaturas diferentes.
  {...base,id:'lead-5',nome:'Maria Aparecida dos Santos Exemplo',temperatura:'morno',proximo_contato:at(-2,15),ultima_interacao_em:at(-2),ultima_interacao_texto:'Pediu a tabela de preços do três dormitórios e a simulação com FGTS.'},
  {...base,id:'lead-6',nome:'Lucas Exemplo',temperatura:'frio',proximo_contato:at(0,8),ultima_interacao_em:at(-1),ultima_interacao_texto:'Vai conversar com a esposa e retorna.',tentativas:0},
  {...base,id:'lead-7',nome:'Sofia Exemplo',origem:'empresa',etapa:'novo',ultima_interacao_em:null,ultima_interacao_texto:null,proximo_contato:null,created_at:new Date(now.getTime()-6*60000).toISOString(),atribuido_em:new Date(now.getTime()-6*60000).toISOString(),atribuido_por:'gerente'},
  {...base,id:'lead-8',nome:'Tiago Exemplo',temperatura:'morno',proximo_contato:at(0,23),ultima_interacao_em:at(-1),ultima_interacao_texto:'Visitou o decorado. Ligar para falar da proposta.',etapa:'visita_realizada',tentativas:0},
];
const visitas = [
  {id:'visita-1',lead_id:'lead-1',corretor_id:'corretor-1',empreendimento:base.empreendimento,inicio:at(0,23),local:'Plantão do residencial',status:'agendada',observacao:null,baixa_por:null,baixa_em:null,comprovante:null,created_at:at(-3),lead:leads[0]},
  {id:'visita-2',lead_id:'lead-3',corretor_id:'corretor-1',empreendimento:base.empreendimento,inicio:at(-1,15),local:'Plantão do residencial',status:'confirmada',observacao:null,baixa_por:null,baixa_em:null,comprovante:null,created_at:at(-3),lead:leads[2]},
];
const vendas = [
 {id:'venda-1',lead_id:'lead-1',corretor_id:'corretor-1',empreendimento:base.empreendimento,unidade:'101',vgv:3450000,assinada_em:day,pagamento:'pago',pago_em:day,status:'ativa',comprovante:null,observacao:null,created_at:at(0),lead:leads[0]},
 {id:'venda-2',lead_id:'lead-3',corretor_id:'corretor-1',empreendimento:base.empreendimento,unidade:'202',vgv:650000,assinada_em:day,pagamento:'pendente',pago_em:null,status:'ativa',comprovante:null,observacao:null,created_at:at(0),lead:leads[2]},
];
const empreendimento = {id:'empreendimento-1',slug:'residencial-exemplo',nome:base.empreendimento,condominio:null,variacoes:[],pede_contexto:false,marca:'MBigucci',tipo:'residencial',status:'em_obras',ativo:true,endereco:'Rua de Exemplo, 100',bairro:'Centro',cidade:'São Bernardo do Campo',uf:'SP',entrega_prevista:'2027-12-01',entrega_texto:'Dezembro de 2027',chamada:'Apartamentos de dois dormitórios',lazer:['Piscina','Salão de festas'],link_pagina:null,link_apresentacao:null,link_book:null,link_tour:null,link_maps:null,link_ficha:null,link_memorial:null,link_fotos:null,link_tabela:null,tabela_mes:day,preco_a_partir_de:650000,restricao_renda:null,observacao:null,avisos:[],ordem:1,atualizado_em:at(0),tipologias:[]};
type Row = Record<string, any>;
const stand = {id:'stand-qa',nome:'Stand Exemplo',ativo:true,tem_especialista:true,ordem:1};
const cliente = {id:'at-1',plantao_id:stand.id,corretor_id:'corretor-1',especialista_id:'esp-1',tipo:'novo',status:'ativo',registrado_em:at(0,10),cliente_nome:'Ana Exemplo',midias:['placa'],empreendimento:base.empreendimento,corretor:'Marina Exemplo',especialista:'Lia Exemplo',veio_sozinho:true};
const pessoas = [
  {id:'corretor-1',papel:'corretor',nome:'Marina Exemplo',apelido:'Mari',equipe:'Equipe Exemplo'},
  {id:'esp-1',papel:'especialista',nome:'Lia Exemplo',apelido:null,equipe:null},
];
const parceiro = {id:'par-1',gerente_id:'gerente',nome:'Alice Exemplo',empresa:'Imobiliária Exemplo',ativo:true,regioes:['centro'],creci:'12345-F',whatsapp_norm:'5511999990002',atribuido_em:at(-88),ultima_interacao_em:at(-86),entrada:'manual'};
// Distribuição automática (só leitura): o corretor por padrão; ?qa= vê como gerente ou gerente geral.
const comoGestor = () => typeof location !== "undefined" && /qa=(gerente|geral)/.test(location.search) || (typeof location !== "undefined" && location.pathname === "/vendas/distribuicao/");
const distConfig = {id:true,ligada:true,modo:"equipe",pesos:true,exigir_checkin:true,sinal:true,plantao:true,represar:true,produtos:true,redistribuir:true,fim_da_fila:true,repetido_ao_dono:true,manual_conta:true,transparencia:true,periodos_checkin:false,aprova_gerente:false,minutos_sem_sinal:30,minutos_plantao:30,updated_at:at(0,9),updated_by:null};
const filaBase = [
 {posicao:1,corretor_id:"carla",apelido:"Carla",situacao:"apto",desde:null,faixa:"acima",creditos:5,recebidos_hoje:2,nao_atende:1},
 {posicao:2,corretor_id:"diego",apelido:"Diego",situacao:"fora_do_stand",desde:at(0,10),faixa:"media",creditos:4,recebidos_hoje:1,nao_atende:0},
 {posicao:3,corretor_id:"corretor-1",apelido:"Mari",situacao:"apto",desde:null,faixa:"media",creditos:2,recebidos_hoje:1,nao_atende:0},
 {posicao:4,corretor_id:"edu",apelido:"Edu",situacao:"visita",desde:at(0,11),faixa:"abaixo",creditos:1,recebidos_hoje:0,nao_atende:0},
 {posicao:5,corretor_id:"gil",apelido:"Gil",situacao:"sem_sinal",desde:null,faixa:"media",creditos:0,recebidos_hoje:0,nao_atende:0},
 {posicao:null,corretor_id:"bruno",apelido:"Bruno",situacao:"pausa",desde:"2026-11-12T11:00:00Z",faixa:"media",creditos:3,recebidos_hoje:0,nao_atende:0},
];
const distribuicao = (name: string): unknown => {
 const gestor = comoGestor();
 switch (name) {
  case "distribuicao_meu_estado": return gestor ? {recebe:false,ligada:true,modo:"equipe"} : {recebe:true,ligada:true,modo:"equipe",chaves:{exigir_checkin:true,sinal:true,plantao:true,pesos:true,transparencia:true},no_horario:true,participa:true,recebendo:true,pausado_ate:null,situacao:"apto",na_fila:true,desde:at(0,9),presenca:{origem:"checkin",estado:"presente",plantao:"Stand Exemplo",desde:new Date(now.getFullYear(),now.getMonth(),now.getDate(),9,4).toISOString(),checkin_aberto:true},perguntar_saida:false,posicao:3,total:5,escopo:"equipe",equipe_nome:"Equipe Exemplo",faixa:"media"};
  case "distribuicao_fila": return {modo:"equipe",escopo:"equipe",equipe_nome:"Equipe Exemplo",ultima:{apelido:"Carla",quando:at(0,10)},itens:filaBase.map(i=>({...i,equipe_nome:"Equipe Exemplo",eu:!gestor && i.corretor_id==="corretor-1",da_minha_equipe:true,...(gestor?{}:{creditos:null,recebidos_hoje:null,nao_atende:null})}))};
  case "distribuicao_minha_fila": return [{tipo:"pulado",quando:at(0,11),motivo:"fora_do_stand",mantem_posicao:true},{tipo:"recebeu",quando:at(0,10),lead_id:"lead-2",lead_nome:"Bruno Exemplo",manual:false}];
  case "distribuicao_decisoes": return [{quando:at(0,11),lead_id:"lead-2",lead_nome:"Lucas Exemplo",empreendimento:"Residencial Exemplo",motivo_entrada:"nova",resultado:"recebeu",recebeu:"Mari",pulados:[{apelido:"Diego",motivo:"fora_do_stand"},{apelido:"Carla",motivo:"nao_atende"}]},{quando:at(0,10),lead_id:"lead-x",lead_nome:"Teresa Exemplo",empreendimento:null,motivo_entrada:"nova",resultado:"recebeu",recebeu:"Carla",pulados:[]}];
  case "distribuicao_como_calculado": return {pesos:true,calculado:true,semana:day,respondidos:18,total:23,followup_pct:0.85,plantao_rel:1.12,crm_rel:1.04,total_rel:1.08,faixa:"media",novo:false};
  case "distribuicao_a_distribuir": return [{lead_id:"ad-1",nome:"Paulo Exemplo",empreendimento:null,estado:"a_distribuir",chegada:at(0,8),fonte:"site",motivo:"ninguem_sobrando"},{lead_id:"ad-2",nome:"Teresa Exemplo",empreendimento:null,estado:"represado",chegada:at(0,7),fonte:"site",motivo:"ate_abertura"}];
  case "distribuicao_config_historico": return [{quando:at(0,9),chave:"ligada",de:"false",para:"true",quem:"Gerente Geral Exemplo"},{quando:at(-1,17),chave:"modo",de:"direto",para:"equipe",quem:"Gerente Geral Exemplo"}];
  case "distribuicao_equipes": return [{equipe_id:"equipe-2",nome:"Equipe Sul",ultimo:at(0,10),posicao:1},{equipe_id:"equipe-1",nome:"Equipe Exemplo",ultimo:at(0,11),posicao:2}];
  case "distribuicao_produtos": return [{id:"empreendimento-1",nome:base.empreendimento,atende:true},{id:"e-2",nome:"Easy Exemplo",atende:false},{id:"e-3",nome:"Elleva Exemplo",atende:true}];
  case "distribuicao_app_aberto": case "distribuicao_sinal": return null;
 }
 return undefined;
};
const leituras: Record<string, unknown> = {
 recepcao_clientes_hoje:[cliente],recepcao_pessoas:pessoas,
 recepcao_dia:pessoas.map(p=>({...p,presenca_id:p.id,pessoa_id:p.papel==='corretor'?p.id:null,especialista_id:p.papel==='especialista'?p.id:null,turno:'manha',entrada_em:at(0,9),rodadas:1,estado:'presente',da_vez:true,ordem:1})),
 parceiros_fila:[{posicao:1,gerente_id:'gerente',gerente_nome:'Gerente Exemplo'}],
 parceiro_linha_do_tempo:[{quando:at(-86),tipo:'whatsapp',fonte:'interacao',titulo:'WhatsApp',resumo:'Combinou o próximo contato.',proximo_contato:day}],
};
const tables: Record<string, Row[]> = {
 plantoes:[stand],plantao_atendimentos:[cliente],especialistas:[{...pessoas[1],ativo:true}],plantao_midias:[{slug:'placa',nome:'Placa',ordem:1,ativo:true}],
 parceiros:[parceiro],parceiros_situacao:[{parceiro_id:parceiro.id,ativo:true,estagio:'contatado',dias_prazo:86,dias_restantes:4,faixa:'risco',proximo_contato:day}],
 parceiro_regioes:[{codigo:'centro',nome:'Centro',cidade:'São Bernardo do Campo',ordem:1,ativo:true}],
 distribuicao_config:[distConfig],
 profiles, leads, visitas, vendas, empreendimentos:[empreendimento], tipologias:[],
 teams:[{id:'equipe-1',nome:'Equipe Exemplo',gerente_id:'gerente'}],
 lead_origens:['indicacao','anuncio_proprio','plantao','empresa'].map((slug,ordem)=>({slug,nome:['Indicação','Anúncio próprio','Plantão','Empresa'][ordem],ordem,ativo:true,pede_campanha:ordem===1,restrita:ordem===3})),
 lead_etapas:['novo','em_contato','visita_agendada','visita_realizada','proposta','venda'].map((slug,ordem)=>({slug,nome:['Novo','Em contato','Visita agendada','Visita realizada','Proposta','Venda'][ordem],ordem,ativo:true})),
 lead_interacoes:[{id:'toque-1',lead_id:'lead-1',autor_id:'corretor-1',criado_em:at(0,9),tipo:'toque_whatsapp',texto:'Abriu o WhatsApp',proximo_contato:null},{id:'interacao-1',lead_id:'lead-1',autor_id:'corretor-1',criado_em:at(-3),tipo:'whatsapp',texto:base.ultima_interacao_texto,proximo_contato:at(-1)}],
 lead_eventos:leads.map((l,i)=>({id:'evento-'+i,lead_id:l.id,tipo:'criado',de:null,para:l.dono_id,detalhe:null,automatico:true,autor_id:l.dono_id,criado_em:at(0,9)})),
 metas_vgv:[{id:'meta-vgv',ano:now.getFullYear(),corretor_id:null,valor:10000000,updated_at:at(0)}],
 metas:[], horario_atendimento:[{dias:[0,1,2,3,4,5,6],inicio:'08:00',fim:'20:00',updated_at:at(-1)}],
 app_settings:[{chave:'exemplo_visual',valor:false,rotulo:'Chave de exemplo',descricao:'Dado fictício para conferir a leitura do estado.',updated_at:at(-1)}],
 permissions:[{slug:'leads.cadastrar',nome:'Cadastrar leads',descricao:'Cadastrar e trabalhar os próprios leads',grupo:'Leads'}],
 role_permissions:[{perfil:'corretor',permissao:'leads.cadastrar'}],
 mensagens_modelo:[],lead_documentos:[],
};
// Adaptador só de leitura. Escritas falham de forma explícita.
class Query implements PromiseLike<{data:any;error:any}> {
 rows:Row[]; singleRow=false; blocked=false;
 constructor(name:string) { this.rows=[...(tables[name]??[])]; }
 select() {return this;}
 eq(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]===v);return this;}
 neq(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]!==v);return this;}
 in(k:string,v:any[]) {this.rows=this.rows.filter(x=>v.includes(x[k]));return this;}
 gte(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]>=v);return this;}
 gt(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]>v);return this;}
 lte(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]<=v);return this;}
 lt(k:string,v:any) {this.rows=this.rows.filter(x=>x[k]<v);return this;}
 is(k:string,v:any) {return this.eq(k,v);}
 not(k:string,_:string,v:any) {return this.neq(k,v);}
 or() {return this;}
 order() {return this;}
 limit(n:number) {this.rows=this.rows.slice(0,n);return this;}
 range(a:number,b:number) {this.rows=this.rows.slice(a,b+1);return this;}
 maybeSingle() {this.singleRow=true;return this;}
 single() {return this.maybeSingle();}
 update() {this.blocked=true;return this;}
 insert() {this.blocked=true;return this;}
 upsert() {this.blocked=true;return this;}
 delete() {this.blocked=true;return this;}
 then<TResult1 = {data:any;error:any}, TResult2 = never>(ok?:((v:{data:any;error:any})=>TResult1|PromiseLike<TResult1>)|null,err?:((r:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2> {
  return Promise.resolve({data:this.blocked?null:this.singleRow?(this.rows[0]??null):this.rows,error:this.blocked?{message:typeof navigator!=='undefined'&&!navigator.onLine?'TypeError: Failed to fetch':'Prévia visual: gravação desativada.'}:null}).then(ok,err);
 }
}
export const client = {
 from:(name:string)=>new Query(name),
 rpc:async(name:string)=> distribuicao(name)!==undefined || name==="distribuicao_app_aberto" || name==="distribuicao_sinal" ? {data:distribuicao(name)??null,error:null} : Object.hasOwn(leituras,name) ? {data:leituras[name],error:null} : name==='ranking_pontos'
     ? {data:profiles.map((p,i)=>({corretor_id:p.id,nome:p.nome,pontos:150-i*70})),error:null}
     : name==='plantao_corretores'
       ? {data:profiles.map(p=>({id:p.id,nome:p.nome,equipe:'Equipe Exemplo'})),error:null}
   : name==='leads_perdidos'
     ? {data:[],error:null}
     : {data:null,error:{message:'Prévia visual: operação desativada.'}},
 auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}})},
};
