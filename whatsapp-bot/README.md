# Money WhatsApp Bot

Bot para registrar transações no app Money pelo WhatsApp.

## Pré-requisitos

- Node.js 18+
- Google Chrome instalado (usado pelo whatsapp-web.js)

## Instalação

```bash
cd whatsapp-bot
npm install
```

## Configuração

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Preencha o `.env`:

   | Variável | Onde encontrar |
   |---|---|
   | `SUPABASE_URL` | Painel Supabase → Settings → API |
   | `SUPABASE_ANON_KEY` | Painel Supabase → Settings → API |
   | `SUPABASE_USER_ID` | Veja instruções abaixo |
   | `ANTHROPIC_API_KEY` | console.anthropic.com |
   | `AUTHORIZED_PHONE` | Seu número com código do país (ex: `5511999999999`) |

### Como encontrar seu SUPABASE_USER_ID

1. Acesse seu Supabase → **Table Editor** → tabela `categories`
2. Veja o campo `user_id` em qualquer linha — é esse UUID
3. Ou vá em **Authentication** → **Users** e copie o ID do seu usuário

## Rodando o bot

```bash
npm start
```

Na primeira vez, um QR Code aparece no terminal. Escaneie com o WhatsApp do celular (Menu → Aparelhos Conectados → Conectar aparelho).

## Como usar

Envie mensagens para o **seu próprio número** (ou crie um número de teste):

| Mensagem | Resultado |
|---|---|
| `gastei 50 no mercado` | Despesa R$50 em Alimentação |
| `recebi 3000 de salário` | Receita R$3.000 em Salário |
| `conta de luz 180` | Despesa R$180 em Moradia |
| `paguei 30 de uber no cartão` | Despesa R$30 em Transporte, Cartão |
| `ajuda` | Lista de comandos |
| `categorias` | Lista suas categorias |

## Rodando em segundo plano (opcional)

Para manter o bot rodando no Windows:

```bash
npm install -g pm2
pm2 start index.js --name money-bot
pm2 save
pm2 startup
```
