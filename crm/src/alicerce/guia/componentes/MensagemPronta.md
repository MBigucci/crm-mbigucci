# MensagemPronta

Mandar uma mensagem do WhatsApp com um texto pronto e editável: confirmar a visita, primeiro contato, parabéns, apresentar um empreendimento, avisar o corretor de um lead novo. Abre no `PainelLateral` (no celular, a folha que sobe), a partir do botão `WhatsApp →`.

**Estrutura:**
- título “Mensagem para Ana Exemplo” e o número formatado (ou “Escolha o contato no WhatsApp” quando não há número);
- **Modelo:** `Seletor --p` com os modelos ativos; o sugerido pela situação vem marcado (etapa Novo → Primeiro contato; dois dias sem resposta → Retomar contato; visita marcada → Confirmar visita), com a ajuda “Sugerido para a etapa: …”;
- **Texto:** `textarea` editável, já com as variáveis preenchidas; linha cujo dado está vazio sai da mensagem;
- **Inserir:** as variáveis (`.mb-variavel`, Geist Mono) que entram onde está o cursor: `{primeiro_nome}`, `{empreendimento}`, `{visita}`, `{corretor}`;
- rodapé: **Copiar** (sem borda; vira “✓ Copiado”) e **Abrir no WhatsApp →** (verde, a principal).

**Comportamento:** abrir o WhatsApp grava o toque no histórico (“Abriu o WhatsApp”, automático) e, ao voltar, o Registrar já vem com WhatsApp marcado (“→ Você abriu o WhatsApp hoje, 10:42. Conte como foi.”). O texto editado fica guardado no aparelho se o celular recarregar a aba.

**Não faça**
- Enviar sozinho, sem a pessoa ver o texto.
- Modelos com emoji ou com gíria de marketing.
