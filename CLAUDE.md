# CLAUDE.md — Money App

Contexto completo do projeto para agentes de IA. Leia este arquivo antes de qualquer tarefa.

---

## O que é este projeto

**Money** é um aplicativo de gestão financeira pessoal com visual "Luxury Dark", voltado para usuários brasileiros. Permite registrar receitas e despesas, controlar orçamentos mensais, acompanhar metas de economia e visualizar relatórios detalhados.

O app roda como **web app** (Vercel) e também como **app Android** nativo via **Capacitor**.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS v4 + framer-motion |
| Backend | Supabase (PostgreSQL + Auth) |
| Mobile | Capacitor v8 (Android) |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Datas | date-fns |
| Validação | Zod |
| Deploy Web | Vercel |

---

## Estrutura de Arquivos

```
MONEY-main/
├── src/
│   ├── App.tsx               # Root: auth, roteamento de páginas, estado global
│   ├── main.tsx              # Entry point React
│   ├── supabase.ts           # Cliente Supabase (usa env vars VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
│   ├── types.ts              # Interfaces TypeScript: Transaction, Category, Goal, Budget, AppSettings
│   ├── hooks.ts              # Todos os hooks de dados (Supabase CRUD) + useSettings + useToast + useFinancialSummary
│   ├── utils.ts              # formatCurrency, formatPercent, cn, getMonthKey, parseCurrencyInput...
│   ├── seedData.ts           # Categorias e dados padrão para novos usuários
│   ├── components.tsx        # Componentes reutilizáveis: KPICard, ChartCard, ProgressBar, ToastContainer, Loader...
│   ├── AuthPage.tsx          # Login / cadastro via Supabase Auth
│   ├── Sidebar.tsx           # Navegação lateral (desktop) e bottom bar (mobile)
│   ├── Dashboard.tsx         # KPIs + gráficos (Area, Bar, Pie, Radial, Scatter)
│   ├── TransactionsPage.tsx  # Listagem com filtros e busca
│   ├── AddTransaction.tsx    # Formulário de criação/edição de transação
│   ├── BudgetsPage.tsx       # Orçamentos mensais por categoria
│   ├── GoalsPage.tsx         # Metas financeiras com aportes
│   ├── ReportsPage.tsx       # Relatórios e análises históricas
│   └── SettingsPage.tsx      # Configurações, categorias, export/import de dados
├── android/                  # Projeto Capacitor Android
├── supabase_schema.sql       # Schema completo do banco de dados
├── capacitor.config.ts       # Config mobile: appId = com.money.app
├── vite.config.ts
└── vercel.json
```

---

## Banco de Dados (Supabase / PostgreSQL)

Todas as tabelas têm RLS (Row Level Security) ativado — cada usuário só acessa seus próprios dados.

### Tabelas

**categories**
- `id` UUID PK, `user_id` FK auth.users, `name`, `type` (income|expense|both), `icon`, `color`, `budget` (valor padrão de orçamento), `created_at`

**transactions**
- `id` UUID PK, `user_id`, `type` (income|expense), `amount`, `description`, `category` UUID FK categories, `date`, `tags` TEXT[], `recurrent`, `recurrence_frequency`, `payment_method`, `notes`, `created_at`, `updated_at`
- ⚠️ A FK para categoria se chama `category` (não `category_id`) — diferente da tabela `budgets`

**budgets**
- `id` UUID PK, `user_id`, `category_id` UUID FK categories, `month` TEXT (formato 'YYYY-MM'), `limit`, `spent`, `created_at`
- ⚠️ O campo `spent` é atualizado manualmente, não é computado automaticamente via trigger

**goals**
- `id` UUID PK, `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `category` UUID FK categories, `color`, `created_at`

### Mapeamento SQL ↔ TypeScript

Os hooks em `hooks.ts` fazem a conversão snake_case → camelCase via funções `mapTransaction`, `mapCategory`, `mapGoal`, `mapBudget`.

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> ⚠️ O arquivo `src/supabase.ts` ainda tem credenciais hardcoded como fallback. Em produção, remova-os e use apenas as env vars.

---

## Comandos Principais

```bash
npm run dev        # Inicia servidor de desenvolvimento (Vite)
npm run build      # Build de produção (TypeScript + Vite)
npm run preview    # Preview do build local
npm run lint       # ESLint
```

### Mobile (Android)

```bash
npm run build                          # Gerar dist/
npx cap sync android                   # Sincronizar com projeto Android
npx cap open android                   # Abrir no Android Studio
```

---

## Arquitetura de Estado

- **Dados remotos** (transactions, categories, budgets, goals): gerenciados via hooks em `hooks.ts` → Supabase
- **Configurações** (tema, moeda, locale, formas de pagamento): `localStorage` via `useSettings`
- **Notificações**: sistema de toasts em memória via `useToast`
- **Roteamento**: state simples com `useState<PageName>` em `App.tsx` (sem React Router)
- **Tema**: dark/light via classe CSS `theme-light` no elemento root

---

## Fluxo de Autenticação

1. `App.tsx` usa `supabase.auth.getSession()` + `onAuthStateChange` para gerenciar a sessão
2. Se não houver sessão → renderiza `<AuthPage />` (login/signup)
3. Se houver sessão → renderiza layout completo com Sidebar + página atual
4. Novos usuários recebem categorias padrão via `seedInitialCategories()` (chamado automaticamente se `categories.length === 0`)

---

## Páginas e Navegação

| PageName | Componente | Descrição |
|---|---|---|
| `dashboard` | Dashboard | KPIs do mês + 6 tipos de gráfico |
| `transactions` | TransactionsPage | Lista com filtro por tipo, categoria e busca |
| `add` | AddTransaction | Form de criação/edição de transação |
| `budgets` | BudgetsPage | Orçamentos mensais com barra de progresso |
| `goals` | GoalsPage | Metas com aportes e % de conclusão |
| `reports` | ReportsPage | Relatórios históricos e análise por categoria |
| `settings` | SettingsPage | Categorias, tema, formas de pagamento, export |

---

## Problemas Conhecidos e TODOs

1. **`alert()` em hooks.ts** — erros de transação usam `alert()` nativo em vez do sistema de toasts
2. **Import de dados incompleto** — `SettingsPage` exibe aviso "ainda em desenvolvimento" para importação de JSON
3. **Reset de dados incompleto** — `handleReset` em `App.tsx` só limpa localStorage, não deleta do Supabase
4. **`budget.spent` dessincronizado** — o campo `spent` em budgets é atualizado manualmente; não existe trigger SQL que some as transações automaticamente
5. **`formatCurrency` hardcoded** — usa sempre `pt-BR`/`BRL` ignorando as configurações de `locale`/`currency` do usuário
6. **Sem real-time** — não usa Supabase Realtime Subscriptions; dados só atualizam ao carregar a página
7. **Sem testes** — nenhum teste unitário ou de integração

---

## Convenções do Projeto

- **Idioma da interface**: Português Brasileiro (pt-BR)
- **Moeda padrão**: BRL (R$)
- **Formato de mês**: `YYYY-MM` (ex: `2026-04`)
- **Datas**: ISO 8601 (ex: `2026-04-04`)
- **IDs**: UUIDs v4
- **Nomes de arquivos**: PascalCase para componentes/páginas, camelCase para utilitários
- **CSS**: Tailwind v4 com variáveis CSS customizadas (ex: `bg-bg-primary`, `text-text-muted`, `border-border`)
- **Ícones**: sempre de `lucide-react`

---

## Informações do Deploy

- **Web**: Vercel (configurado via `vercel.json`)
- **Android**: Capacitor — `appId: com.money.app`, `appName: Money`
- **Supabase project ref**: `plyrcsccbkicxpuujeti` (inferido do código)
