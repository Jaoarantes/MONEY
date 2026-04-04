require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// ─── Validação de variáveis de ambiente ───────────────────────────────────────
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_USER_ID', 'ANTHROPIC_API_KEY', 'AUTHORIZED_PHONE'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variável de ambiente obrigatória não definida: ${key}`);
    console.error('   Copie o arquivo .env.example para .env e preencha os valores.');
    process.exit(1);
  }
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Formato do número no whatsapp-web.js: "5511999999999@c.us"
const AUTHORIZED_JID = `${process.env.AUTHORIZED_PHONE}@c.us`;
const USER_ID = process.env.SUPABASE_USER_ID;

// ─── Cache de categorias (recarrega a cada 10 min) ────────────────────────────
let categoriesCache = [];
let lastCategoryLoad = 0;

async function getCategories() {
  const now = Date.now();
  if (now - lastCategoryLoad < 10 * 60 * 1000 && categoriesCache.length > 0) {
    return categoriesCache;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, icon')
    .eq('user_id', USER_ID)
    .order('name');

  if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`);

  categoriesCache = data || [];
  lastCategoryLoad = now;
  return categoriesCache;
}

// ─── Parser de transação via Claude ──────────────────────────────────────────
async function parseTransaction(userMessage) {
  const categories = await getCategories();
  const today = new Date().toISOString().split('T')[0];

  const categoryList = categories
    .map(c => `- ID: ${c.id} | Nome: ${c.name} | Tipo: ${c.type === 'income' ? 'receita' : c.type === 'expense' ? 'despesa' : 'ambos'}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: `Você é um assistente financeiro pessoal para um app brasileiro.
Sua única função é extrair informações de transações financeiras de mensagens em português.

Categorias disponíveis no sistema:
${categoryList}

Data de hoje: ${today}

Responda APENAS com um objeto JSON válido, sem markdown, sem explicações.

Se for uma transação, retorne:
{
  "type": "income" ou "expense",
  "amount": número em reais (apenas o número, sem R$),
  "description": "descrição curta da transação",
  "categoryId": "UUID exato de uma categoria da lista acima",
  "date": "YYYY-MM-DD (hoje se a data não for mencionada)",
  "paymentMethod": "forma de pagamento se mencionada, senão null",
  "notes": null
}

Se NÃO for uma transação financeira, retorne:
{"error": "not_a_transaction"}

Exemplos de entradas e saídas:
Entrada: "gastei 50 reais no mercado"
Saída: {"type":"expense","amount":50,"description":"Mercado","categoryId":"<id-alimentacao>","date":"${today}","paymentMethod":null,"notes":null}

Entrada: "recebi 1500 de salário"
Saída: {"type":"income","amount":1500,"description":"Salário","categoryId":"<id-salario>","date":"${today}","paymentMethod":null,"notes":null}

Entrada: "paguei 30 de uber no cartão"
Saída: {"type":"expense","amount":30,"description":"Uber","categoryId":"<id-transporte>","date":"${today}","paymentMethod":"Cartão de Crédito","notes":null}

Entrada: "oi tudo bem?"
Saída: {"error":"not_a_transaction"}`,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Resposta inesperada do Claude');

  return JSON.parse(block.text.trim());
}

// ─── Inserção no Supabase ─────────────────────────────────────────────────────
async function saveTransaction(parsed) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: USER_ID,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.categoryId,
      date: parsed.date,
      payment_method: parsed.paymentMethod || null,
      notes: parsed.notes || null,
      recurrent: false,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar transação: ${error.message}`);
  return data;
}

// ─── Formatação da resposta ───────────────────────────────────────────────────
function formatConfirmation(parsed, categories) {
  const category = categories.find(c => c.id === parsed.categoryId);
  const typeEmoji = parsed.type === 'income' ? '💰' : '💸';
  const typeLabel = parsed.type === 'income' ? 'Receita' : 'Despesa';
  const amount = parsed.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let msg = `✅ *Transação registrada!*\n\n`;
  msg += `${typeEmoji} *${typeLabel}*\n`;
  msg += `💵 Valor: *${amount}*\n`;
  msg += `📝 Descrição: ${parsed.description}\n`;
  msg += `🏷️ Categoria: ${category?.icon || ''} ${category?.name || 'N/A'}\n`;
  msg += `📅 Data: ${parsed.date}`;
  if (parsed.paymentMethod) msg += `\n💳 Pagamento: ${parsed.paymentMethod}`;
  if (parsed.notes) msg += `\n📌 Notas: ${parsed.notes}`;

  return msg;
}

// ─── Mensagem de ajuda ────────────────────────────────────────────────────────
const HELP_MESSAGE = `🤖 *Money Bot — Comandos*

*Registrar despesa:*
• gastei 50 no mercado
• paguei 120 de conta de luz
• 80 reais de farmácia no débito

*Registrar receita:*
• recebi 3000 de salário
• entrou 500 de freelance

*Outros comandos:*
• *ajuda* — exibe esta mensagem
• *categorias* — lista suas categorias

_Envie qualquer transação e eu registro automaticamente no seu app!_ 📊`;

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\nAguardando conexão...\n');
});

client.on('authenticated', () => {
  console.log('🔐 Autenticado com sucesso!');
});

client.on('ready', () => {
  console.log('✅ Bot conectado ao WhatsApp!');
  console.log(`📞 Número autorizado: ${process.env.AUTHORIZED_PHONE}`);
  console.log('🎯 Aguardando mensagens...\n');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Bot desconectado:', reason);
  console.log('Reiniciando em 5 segundos...');
  setTimeout(() => client.initialize(), 5000);
});

client.on('message', async (message) => {
  // Ignora mensagens de grupos e de números não autorizados
  if (message.isGroupMsg) return;
  if (message.from !== AUTHORIZED_JID) return;

  const body = message.body?.trim();
  if (!body) return;

  const lower = body.toLowerCase();

  // Comando: ajuda
  if (lower === 'ajuda' || lower === 'help' || lower === '/ajuda') {
    await message.reply(HELP_MESSAGE);
    return;
  }

  // Comando: listar categorias
  if (lower === 'categorias' || lower === '/categorias') {
    try {
      const categories = await getCategories();
      const incomeList = categories.filter(c => c.type !== 'expense').map(c => `  ${c.icon} ${c.name}`).join('\n');
      const expenseList = categories.filter(c => c.type !== 'income').map(c => `  ${c.icon} ${c.name}`).join('\n');
      const msg = `📋 *Suas categorias:*\n\n*Receitas:*\n${incomeList || '  Nenhuma'}\n\n*Despesas:*\n${expenseList || '  Nenhuma'}`;
      await message.reply(msg);
    } catch (err) {
      await message.reply('❌ Erro ao buscar categorias.');
    }
    return;
  }

  // Registrar transação
  try {
    await message.reply('⏳ Processando...');

    const parsed = await parseTransaction(body);

    if (parsed.error === 'not_a_transaction') {
      await message.reply(
        '🤔 Não entendi isso como uma transação financeira.\n\n' +
        'Exemplos válidos:\n' +
        '• "gastei 50 no mercado"\n' +
        '• "recebi 1500 de salário"\n' +
        '• "conta de luz 200"\n\n' +
        'Digite *ajuda* para ver mais opções.'
      );
      return;
    }

    await saveTransaction(parsed);
    const categories = await getCategories();
    await message.reply(formatConfirmation(parsed, categories));

  } catch (err) {
    console.error('Erro ao processar mensagem:', err);

    if (err instanceof SyntaxError) {
      await message.reply('❌ Não consegui interpretar sua mensagem. Tente ser mais específico.\nExemplo: "gastei 50 reais no mercado"');
    } else {
      await message.reply('❌ Erro ao registrar a transação. Tente novamente em alguns instantes.');
    }
  }
});

// ─── Inicialização ────────────────────────────────────────────────────────────
console.log('🚀 Iniciando Money WhatsApp Bot...');
client.initialize();
