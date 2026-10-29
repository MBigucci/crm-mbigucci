# Pesquisa "Seu CRM ideal" (MBigucci · Fase 1)

É um questionário mobile-first para os corretores, no visual do MBigucci Design System. É um site **estático**: fica numa pasta do servidor do WordPress, sem Node e sem plugin. As respostas vão direto para uma Google Planilha, e o painel de resultados fica dentro dela.

## 1. Planilha (uma vez)

1. Crie uma Google Planilha e abra **Extensões > Apps Script**.
2. Cole o conteúdo de `apps-script/Code.gs` e troque `TOKEN` por uma senha longa.
3. Abra **Implantar > Nova implantação > App da Web**, com **Executar como: Eu** e **Acesso: Qualquer pessoa**. Autorize e copie a URL.
4. Recarregue a planilha e use **Pesquisa > Criar painel**. A aba **Painel** se atualiza sozinha a cada resposta.

O site só consegue **gravar** na planilha. Ninguém lê as respostas pela URL: elas ficam visíveis só para quem tem acesso à planilha no Google.

## 2. Build

Crie o `.env.local` a partir do `.env.example`:

```
NEXT_PUBLIC_SHEETS_URL=<URL do app da web>
NEXT_PUBLIC_SHEETS_TOKEN=<o mesmo TOKEN do script>
BASE_PATH=/pesquisa
```

Depois rode:

```bash
npm install
npm run build
```

O build gera a pasta `out/`.

## 3. Publicar no WordPress

1. Pelo FTP ou pelo gerenciador de arquivos da hospedagem, crie a pasta `pesquisa` na raiz do site (onde ficam `wp-config.php` e `wp-content`).
2. Envie **o conteúdo** de `out/` para dentro dela.
3. Coloque o logo em `pesquisa/mbigucci-logo.png`. Sem ele, o cabeçalho mostra "MBigucci" em texto vermelho.
4. Abra `https://seusite.com.br/pesquisa/`.

O WordPress não interfere, porque o `.htaccess` dele serve pastas reais antes das páginas do WP. Para usar outra pasta, mude `BASE_PATH` e gere o build de novo.

## Desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000/pesquisa`. Sem `NEXT_PUBLIC_SHEETS_URL`, o envio aparece só no console do navegador.
