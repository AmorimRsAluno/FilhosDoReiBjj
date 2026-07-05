# Deploy de Produção - Filhos do Rei BJJ

Este projeto está preparado para três formas de uso:

- Website/PWA: `https://www.filhosdoreibjj.com`
- API: `https://api.filhosdoreibjj.com/api`
- Android Play Store: app Capacitor `com.filhosdoreibjj.app`
- iOS: PWA instalado pelo Safari em "Adicionar à Tela de Início"

## 1. Banco PostgreSQL Remoto

Use um PostgreSQL gerenciado com SSL, backup automático e acesso remoto controlado.

Opções recomendadas:

- Supabase
- Neon
- Railway
- Render PostgreSQL
- AWS RDS
- DigitalOcean Managed Database

Crie dois usuários:

- `app_user`: usado pelo sistema em produção.
- `dev_admin`: usado pelo desenvolvedor para manutenção via pgAdmin/DBeaver.

Variáveis do backend:

```env
NODE_ENV=production
PORT=3333
DATABASE_URL=postgres://USUARIO:SENHA@HOST:5432/BANCO
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=gere-uma-chave-forte-com-pelo-menos-32-caracteres
CORS_ORIGIN=https://www.filhosdoreibjj.com,https://filhosdoreibjj.com
```

Aplicar tabelas sem dados demo:

```powershell
npm.cmd run db:migrate
```

Não use `npm.cmd run db:setup` em produção. Esse comando é apenas para demonstração/local.

## 2. Backend/API

Hospedar o backend em:

```text
https://api.filhosdoreibjj.com/api
```

Comandos:

```powershell
npm.cmd install
npm.cmd run build -w server
npm.cmd run start -w server
```

DNS:

```text
api.filhosdoreibjj.com -> servidor do backend
```

Teste após subir:

```text
https://api.filhosdoreibjj.com/api/health
```

## 3. Frontend Website/PWA

Variável de produção:

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

DNS:

```text
www.filhosdoreibjj.com -> hospedagem do frontend
filhosdoreibjj.com -> redireciona para www.filhosdoreibjj.com
```

Política de privacidade:

```text
https://www.filhosdoreibjj.com/privacy-policy.html
```

## 4. PWA no iOS

O projeto já possui:

- `manifest.webmanifest`
- `sw.js`
- `apple-touch-icon.png`
- meta tags Apple no `index.html`
- ícones PWA 180/192/512

Instalação pelo usuário:

1. Abrir `https://www.filhosdoreibjj.com` no Safari do iPhone.
2. Tocar em compartilhar.
3. Tocar em "Adicionar à Tela de Início".
4. Confirmar o nome "Filhos do Rei".

## 5. Android Play Store

Projeto Android já criado em:

```text
android/
```

Identificador do app:

```text
com.filhosdoreibjj.app
```

Nome:

```text
Filhos do Rei BJJ
```

Sincronizar assets web com Android:

```powershell
npm.cmd run android:sync
```

Abrir no Android Studio:

```powershell
npm.cmd run android:open
```

Gerar arquivo para Play Store:

```text
Android Studio -> Build -> Generate Signed Bundle / APK -> Android App Bundle (.aab)
```

Requisitos da Play Store:

- Conta Google Play Console.
- App em formato `.aab`.
- Política de privacidade pública.
- Ícone 512x512.
- Screenshots.
- Descrição curta e completa.
- Formulário de segurança de dados.
- Teste interno antes da publicação.

O projeto Android gerado está com `targetSdkVersion = 36`, atendendo a exigência atual de API 35 ou superior.

## 6. Informações Que Ainda Precisam Ser Definidas

- Onde o banco remoto será hospedado.
- URL/credenciais do PostgreSQL remoto.
- Onde o backend será hospedado.
- Onde o frontend será hospedado.
- Acesso ao DNS do domínio `filhosdoreibjj.com`.
- Conta Google Play Console.
- E-mail/telefone oficial de suporte da academia.
- Texto final da política de privacidade, caso queira ajustar juridicamente.
- Screenshots oficiais para a Play Store.
