// Dados inteiramente fictícios, usados somente pela cópia de visual-preview.mjs.
const now = new Date();
const at = (days: number, hour = 10) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
const day = at(0).slice(0,10);
export const profiles = [
  {id:'corretor-1',nome:'Marina Exemplo',email:'marina@example.invalid',perfil:'corretor',equipe_id:'equipe-1',ativo:true,whatsapp:'5511999990000'},
  {id:'corretor-2',nome:'Paulo Exemplo',email:'paulo@example.invalid',perfil:'corretor',equipe_id:'equipe-1',ativo:true,whatsapp:'5511999990001'},
];
const base = {dono_id:'corretor-1',whatsapp:'5511999990010',email:null,origem:'indicacao',campanha:null,empreendimento:'Residencial Exemplo',temperatura:'quente',etapa:'em_contato',proximo_contato:at(-1),status:'ativo',motivo_descarte:null,valor:600000,dormitorios:2,regiao:'Centro',finalidade:'morar',ultima_interacao_em:at(-3),ultima_interacao_texto:'Quer conhecer a planta de dois dormitórios. Retornar para combinar a visita.',tentativas:2,atribuido_por:null,atribuido_em:null,created_at:at(-7),nascimento:null,telefone2:null,estado_civil:null,profissao:null,renda:null,entrada:null,fgts:null,composicao_renda:null,possui_imovel:null};
const leads = [
  {...base,id:'lead-1',nome:'Ana Exemplo'},
  {...base,id:'lead-2',nome:'Bruno Exemplo',origem:'empresa',etapa:'novo',ultima_interacao_em:null,ultima_interacao_texto:null,proximo_contato:null,atribuido_em:at(-1),atribuido_por:'gerente'},
  {...base,id:'lead-3',nome:'Clara Exemplo',temperatura:'morno',proximo_contato:at(0,23),nascimento:'1990-'+day.slice(5)},
  {...base,id:'lead-4',nome:'Daniel Exemplo',dono_id:'corretor-2',temperatura:'frio',etapa:'proposta',proximo_contato:null},
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
const tables: Record<string, Row[]> = {
 profiles, leads, visitas, vendas, empreendimentos:[empreendimento], tipologias:[],
 teams:[{id:'equipe-1',nome:'Equipe Exemplo',gerente_id:'gerente'}],
 lead_origens:['indicacao','anuncio_proprio','plantao','empresa'].map((slug,ordem)=>({slug,nome:['Indicação','Anúncio próprio','Plantão','Empresa'][ordem],ordem,ativo:true,pede_campanha:ordem===1,restrita:ordem===3})),
 lead_etapas:['novo','em_contato','visita_agendada','visita_realizada','proposta','venda'].map((slug,ordem)=>({slug,nome:['Novo','Em contato','Visita agendada','Visita realizada','Proposta','Venda'][ordem],ordem,ativo:true})),
 lead_interacoes:[{id:'interacao-1',lead_id:'lead-1',autor_id:'corretor-1',criado_em:at(-3),tipo:'whatsapp',texto:base.ultima_interacao_texto,proximo_contato:at(-1)}],
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
  return Promise.resolve({data:this.blocked?null:this.singleRow?(this.rows[0]??null):this.rows,error:this.blocked?{message:'Prévia visual: gravação desativada.'}:null}).then(ok,err);
 }
}
export const client = {
 from:(name:string)=>new Query(name),
 rpc:async(name:string)=> name==='ranking_pontos'
     ? {data:profiles.map((p,i)=>({corretor_id:p.id,nome:p.nome,pontos:150-i*70})),error:null}
     : name==='plantao_corretores'
       ? {data:profiles.map(p=>({id:p.id,nome:p.nome,equipe:'Equipe Exemplo'})),error:null}
   : name==='leads_perdidos'
     ? {data:[],error:null}
     : {data:null,error:{message:'Prévia visual: operação desativada.'}},
 auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}})},
};
