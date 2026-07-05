# Passo 1 - Site com domínio próprio

Objetivo:

```text
https://www.filhosdoreibjj.com
https://api.filhosdoreibjj.com/api
```

## O que já está preparado

- Frontend PWA em `client/`.
- Build de produção apontando para `https://api.filhosdoreibjj.com/api`.
- `client/vercel.json` para deploy estático com fallback React.
- `client/public/_redirects` e `_headers` para hospedagens compatíveis com Netlify/Cloudflare Pages.
- API pronta para CORS por domínio.
- `Dockerfile.server` para hospedar a API em container.
- `render.yaml` como exemplo de deploy da API.
- Política de privacidade em `/privacy-policy.html`.

## 1. Subir o banco remoto

Crie um PostgreSQL remoto e guarde:

```text
HOST
PORTA
BANCO
USUARIO
SENHA
SSL=true/false
```

Depois aplique o schema:

```powershell
$env:DATABASE_URL="postgres://USUARIO:SENHA@HOST:5432/BANCO"
$env:DATABASE_SSL="true"
npm.cmd run db:migrate
```

Não use `db:setup` em produção.

## 2. Subir a API

Variáveis obrigatórias da API:

```env
NODE_ENV=production
PORT=3333
DATABASE_URL=postgres://USUARIO:SENHA@HOST:5432/BANCO
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=uma-chave-forte-com-mais-de-32-caracteres
CORS_ORIGIN=https://www.filhosdoreibjj.com,https://filhosdoreibjj.com
```

Comandos:

```powershell
npm.cmd install
npm.cmd run build -w server
npm.cmd run start -w server
```

Teste esperado:

```text
https://api.filhosdoreibjj.com/api/health
```

Resposta:

```json
{ "ok": true, "app": "Filhos do Rei BJJ API" }
```

## 3. Subir o frontend

O arquivo já existe:

```text
client/.env.production
```

Com:

```env
VITE_API_URL=https://api.filhosdoreibjj.com/api
```

Build:

```powershell
npm.cmd run build -w client
```

Publicar a pasta:

```text
client/dist
```

## 4. Configurar DNS

No painel onde o domínio foi comprado, configure:

```text
www  -> CNAME para o endereço do provedor do frontend
api  -> CNAME para o endereço do provedor da API
@    -> redirecionamento para https://www.filhosdoreibjj.com
```

Alguns provedores usam `A`, `ALIAS` ou `ANAME` no domínio raiz. Nesse caso, siga o valor exato que o provedor mostrar.

## 5. Checklist final

- `https://www.filhosdoreibjj.com` abre o app.
- Login funciona.
- Dashboard carrega dados reais da API.
- `https://api.filhosdoreibjj.com/api/health` retorna `ok: true`.
- `https://www.filhosdoreibjj.com/manifest.webmanifest` abre.
- `https://www.filhosdoreibjj.com/privacy-policy.html` abre.
- No iPhone, Safari permite "Adicionar à Tela de Início".

## O que preciso de você

Para eu fechar essa etapa de verdade, preciso de um destes caminhos:

1. Acesso ao painel do domínio e hospedagem, ou
2. Você me informar qual provedor vai usar e me passar os valores DNS que ele mostrar, ou
3. Você configurar os DNS seguindo este arquivo e me mandar print/resultado para eu validar.
