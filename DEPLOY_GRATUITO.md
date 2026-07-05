# Deploy gratuito para demonstração

Objetivo: colocar o sistema online sem pagar hospedagem agora.

Stack recomendada:

- Frontend/PWA: Vercel Free ou Cloudflare Pages Free
- API Node/Express: Render Free
- Banco PostgreSQL: Neon Free

Domínio gratuito inicial:

```text
https://filhos-do-rei-bjj.vercel.app
https://filhos-do-rei-api.onrender.com/api
```

Depois, quando quiser domínio próprio:

```text
https://www.filhosdoreibjj.com
https://api.filhosdoreibjj.com/api
```

## 1. Criar banco grátis no Neon

1. Acesse `https://neon.com`.
2. Crie conta grátis.
3. Crie um projeto PostgreSQL.
4. Copie a connection string.

Ela será parecida com:

```env
postgresql://usuario:senha@ep-alguma-coisa.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Depois, na sua máquina, aplique as tabelas:

```powershell
$env:DATABASE_URL="COLE_A_CONNECTION_STRING_DO_NEON"
$env:DATABASE_SSL="true"
$env:DATABASE_SSL_REJECT_UNAUTHORIZED="false"
npm.cmd run db:migrate
```

Não rode `db:setup` no banco real. Ele é só para demo local.

Crie o primeiro administrador:

```powershell
$env:DATABASE_URL="COLE_A_CONNECTION_STRING_DO_NEON"
$env:DATABASE_SSL="true"
$env:DATABASE_SSL_REJECT_UNAUTHORIZED="false"
$env:INITIAL_ADMIN_NAME="William Lago"
$env:INITIAL_ADMIN_EMAIL="admin@seudominio.com"
$env:INITIAL_ADMIN_PASSWORD="senha-forte-aqui"
npm.cmd run db:create-admin
```

## 2. Subir API grátis no Render

1. Acesse `https://render.com`.
2. Crie conta grátis.
3. Crie um novo Web Service.
4. Conecte ao repositório do projeto.
5. Configure:

```text
Name: filhos-do-rei-api
Runtime: Node
Build Command: npm ci --include=dev && npm run build -w server
Start Command: npm run start -w server
Health Check Path: /api/health
```

Variáveis:

```env
NODE_ENV=production
PORT=3333
DATABASE_URL=COLE_A_CONNECTION_STRING_DO_NEON
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=gere-uma-chave-forte-com-pelo-menos-32-caracteres
CORS_ORIGIN=https://filhos-do-rei-bjj.vercel.app
```

Quando publicar, o Render vai gerar uma URL parecida com:

```text
https://filhos-do-rei-api.onrender.com
```

Teste:

```text
https://filhos-do-rei-api.onrender.com/api/health
```

Observação: no plano gratuito, a API pode dormir após inatividade. O primeiro acesso pode demorar cerca de 1 minuto.

## 3. Subir frontend grátis na Vercel

1. Acesse `https://vercel.com`.
2. Crie conta grátis.
3. Importe o repositório.
4. Configure:

```text
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

Variável:

```env
VITE_API_URL=https://filhos-do-rei-api.onrender.com/api
```

Depois do deploy, a Vercel vai gerar uma URL parecida com:

```text
https://filhos-do-rei-bjj.vercel.app
```

Se a URL for diferente, volte no Render e ajuste `CORS_ORIGIN` para a URL exata da Vercel.

## 4. Alternativa com Cloudflare Pages

Também funciona grátis.

Configuração:

```text
Root Directory: client
Build Command: npm run build
Build Output Directory: dist
```

Variável:

```env
VITE_API_URL=https://filhos-do-rei-api.onrender.com/api
```

URL provável:

```text
https://filhos-do-rei-bjj.pages.dev
```

Nesse caso, configure no Render:

```env
CORS_ORIGIN=https://filhos-do-rei-bjj.pages.dev
```

## 5. Checklist de validação

- API abre `/api/health`.
- Site abre no navegador.
- Login funciona.
- Dashboard carrega dados do banco Neon.
- Upload de foto funciona.
- Check-in funciona.
- Relatórios financeiros funcionam.
- PWA instala no iPhone pelo Safari.

## O que fica grátis e o que não fica

Grátis:

- Hospedagem do frontend.
- Subdomínio da Vercel/Cloudflare.
- Banco Neon dentro do limite gratuito.
- API Render Free.

Não grátis:

- Domínio próprio `filhosdoreibjj.com`.
- API sempre ligada sem cold start.
- Banco grande/backup profissional avançado.
- Publicação Play Store, porque a conta Google Play tem taxa.

## O que preciso de você

Para eu te guiar no deploy real:

1. Criar conta no Neon, Render e Vercel ou Cloudflare.
2. Me mandar a connection string do Neon.
3. Me mandar a URL gerada pelo Render.
4. Me mandar a URL gerada pela Vercel/Cloudflare.

Com isso, eu ajusto as variáveis finais e valido o sistema online.
