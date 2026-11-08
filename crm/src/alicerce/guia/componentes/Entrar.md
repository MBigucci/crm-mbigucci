# Entrar

As telas de acesso do Base360, iguais em todos os módulos: **Entrar**, **Esqueci minha senha**, **Criar senha nova** (pelo link do e-mail) e **Convite** (primeiro acesso). O módulo muda só o lockup (`MarcaBase360`, `data-mb-marca="Vendas"`; no portal, só “Base360”).

**Estrutura** (`.mb-entrar`, a página inteira no `fundo`, centralizada; no celular, encostada no topo):
- `.mb-entrar__caixa` (até 400px): o lockup, o `.mb-entrar__cartao` e o rodapé com o logo MBigucci e “Precisa de acesso? Fale com seu gerente.”;
- no cartão: título em Bricolage 24px, uma linha de texto, o `Aviso` quando há, os campos e **uma** ação cheia de largura inteira (`--g --bloco`).

**Entrar**
- E-mail (`autocomplete="username"`) e Senha com **Mostrar** dentro do mesmo campo (`.mb-campo__mostrar`; `MB.senha.ligar(grupo)` alterna Mostrar/Ocultar).
- “Continuar conectado neste aparelho” (`Marcador`, marcado no celular) e o link “Esqueci minha senha”.
- Erro: `Aviso --erro` acima dos campos — “E-mail ou senha não conferem.” — sem dizer qual dos dois errou. Na quinta tentativa: “Muitas tentativas. Tente de novo em 5 minutos ou crie uma senha nova.”
- Esperando a resposta: o botão com `aria-busy="true"` e “Entrando…” (o giro do `Botao`), os campos desativados; nada de tela de carregando por cima.
- Sessão que expirou no meio do trabalho **não** cai aqui: o `Aviso` da tela diz “Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui.”

**Esqueci minha senha:** o e-mail e “Enviar link”. Depois de enviar, `Aviso --sucesso` “Se o e-mail estiver cadastrado, o link já foi enviado.” (nunca confirma se o e-mail existe) e “Reenviar em 0:45”, desativado até poder.

**Criar senha nova** (e **Convite**): senha nova com os requisitos em `.mb-requisitos`, cada um com sinal e palavra — “–” falta, “✓” cumpriu (`MB.senha.requisitos(campo, lista)`; “As duas senhas iguais” compara com o campo de `data-mb-igual`). A ação diz o que acontece: “Salvar senha e entrar”, “Criar acesso”.

**Convite:** quem convidou, o módulo, o perfil e a equipe em `.mb-entrar__convite`; o e-mail do convite vem bloqueado. Link vencido: “Este convite venceu. Peça um novo a quem convidou.”

**Não faça**
- Dizer “usuário não encontrado” ou “senha incorreta” separadamente.
- Esconder as regras da senha até dar erro.
- Imagem de fundo, carrossel ou propaganda na tela de entrar.
