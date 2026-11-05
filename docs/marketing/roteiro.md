# Módulo de Marketing do Base360: roteiro (substituto do RD Station)

> Esboço de 05/11/2026, sem implementar. O Marketing fica em `base360.mbigucci.com.br/marketing`. Cada etapa terá estudo e protótipo próprios, para o Felipe aprovar antes do código. A primeira tela do Marketing é o direcionador de leads (`docs/direcionador/direcionador.md`), que manda cada lead para o Vendas ou para um destino cadastrado.

| Etapa | O que entra | Dependências e cuidados |
| --- | --- | --- |
| 1. Entrada dos leads | O site e os portais entram sozinhos no Base360 (por e-mail lido pela Graph e, depois, por webhook) | A mesma entrada do direcionador; a roleta automática do lead da empresa |
| 2. Base de contatos | Contato único por pessoa (e-mail e telefone), consentimento LGPD com data e texto, descadastro, origem e campanha (UTM) de cada entrada | Entram os leads que ficam no Vendas e os enviados a parceiros, com o evento "Enviado ao parceiro <nome>" no histórico do lead (Felipe, 05/11/2026). Os da distribuição manual não entram |
| 3. Formulários e landing pages | Formulários próprios no `/marketing` ou embutidos no WordPress, landing pages estáticas por empreendimento, UTM gravada | Substitui o Contact Form 7 aos poucos |
| 4. E-mail marketing | Listas por segmento, modelo no DS, envio, descadastro em um clique, relatório de abertura e clique | Precisa de um serviço de envio em massa com domínio autenticado (SPF, DKIM, DMARC). A Graph não serve para envio em massa |
| 5. Automações e nutrição | Sequências por gatilho (entrou, visitou, sem resposta há N dias), pausa quando o corretor conversa | `pg_cron` e a função de envio |
| 6. Relatórios de origem e campanha | Leads, visitas e vendas por fonte, campanha e produto, ligados ao Vendas (`docs/vendas-metas.md`) | Base de contatos e UTM |
| 7. Saída do RD Station | Migrar contatos com consentimento, desligar formulários e automações do RD | Levantar o que o Felipe usa hoje no RD |
