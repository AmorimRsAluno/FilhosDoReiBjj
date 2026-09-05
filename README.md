# Filhos do Rei BJJ - Wilian Lago

MVP funcional para gestão de academia de jiu-jitsu com app do aluno e painel administrativo.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, PWA
- Backend: Node.js, Express, TypeScript, JWT
- Banco: PostgreSQL

## Banco configurado

O projeto já vem apontando para:

```env
DATABASE_URL=postgres://postgres:SUA_SENHA_LOCAL@localhost:5432/bjjapk
```

Se quiser alterar, copie `.env.example` para `.env` na raiz ou em `server/.env` e ajuste a conexão.

## Como rodar

No PowerShell desta máquina, use `npm.cmd`:

```powershell
npm.cmd install
$env:INITIAL_ADMIN_PASSWORD="<senha-admin-demo>"
$env:DEMO_PASSWORD="<senha-demo-alunos-professor>"
npm.cmd run db:setup
npm.cmd run dev
```

Depois acesse:

- Frontend: http://localhost:5173
- API: http://localhost:3333/api/health

Para apresentação ao cliente, também é possível abrir com duplo clique. O arquivo permite escolher entre visualização Web ou Mobile:

```text
ABRIR_DEMO_CLIENTE.bat
```

## Credenciais demo

O repositório não guarda senhas demonstrativas. Antes de rodar `db:setup`, defina `INITIAL_ADMIN_PASSWORD` e `DEMO_PASSWORD` com 6 a 12 caracteres e pelo menos um caractere especial.

Usuários demonstrativos criados pelo seed:

- Admin: usuário `Admin`
- Professor: `professor@filhosdorei.com`
- Aluno: `ana@aluno.com`

## Funcionalidades do MVP

- Login com e-mail/senha e JWT
- Perfis: administrador, professor, aluno e financeiro
- Dashboard administrativo com alunos ativos, receita, inadimplência, presença e gráficos simples
- Cadastro e remoção de alunos
- Controle de faixa, graus e aulas restantes para a próxima graduação pelo professor
- Dashboard do aluno com faixa, XP, nível, presença, próxima aula e objetivo mensal
- Atualização de foto de perfil pelo próprio aluno
- Check-in do aluno com confirmação do professor, validação da presença e animação de XP
- Financeiro do aluno com mensalidade, status, vencimento, valor e PIX
- Financeiro geral da academia com receitas, despesas, lucro líquido, mensalidades a receber e lançamentos livres
- Relatórios financeiros em Excel, PDF, Word e envio de resumo para WhatsApp
- Técnicas por categoria e status por aluno
- Gestão de técnicas pelo professor com cadastro, edição, remoção, vídeo e observações
- Registro de presença com +50 XP
- Ranking semanal, mensal e geral
- Loja com controle de estoque, disponibilidade, venda por quantidade e lancamento automatico no financeiro
- Competições com confirmação de participação
- Gestão de competições pelo professor com cadastro, edição, remoção e status realizada
- PWA com manifest e service worker

## Estrutura

```text
client/                 Frontend React/PWA
server/                 API Express
database/schema.sql     Script SQL de criação das tabelas
.env.example            Variáveis de ambiente
```

## Banco de dados

O script principal está em `database/schema.sql` e cria:

- `users`
- `students`
- `teachers`
- `payments`
- `attendance`
- `classes`
- `techniques`
- `student_techniques`
- `graduations`
- `competitions`
- `competition_students`
- `products`
- `orders`
- `posts`
- `comments`
- `likes`
- `xp_history`

O comando `npm.cmd run db:setup` executa o schema e insere dados demonstrativos.

## Produção, PWA e Android

Para produção, use migração sem dados demo:

```powershell
npm.cmd run db:migrate
```

Build geral:

```powershell
npm.cmd run build:production
```

Sincronizar o app Android Capacitor:

```powershell
npm.cmd run android:sync
```

Abrir no Android Studio:

```powershell
npm.cmd run android:open
```

O guia completo está em `DEPLOY_PRODUCAO.md`.

Para colocar online sem custo inicial, use `DEPLOY_GRATUITO.md`.
