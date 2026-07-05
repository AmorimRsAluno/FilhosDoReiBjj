# Android - Filhos do Rei BJJ

Projeto Android gerado via Capacitor.

App ID:

```text
com.filhosdoreibjj.app
```

Nome:

```text
Filhos do Rei BJJ
```

Comandos úteis na raiz do projeto:

```powershell
npm.cmd run android:sync
npm.cmd run android:open
```

Para publicar na Play Store, gere um Android App Bundle:

```text
Android Studio -> Build -> Generate Signed Bundle / APK -> Android App Bundle (.aab)
```

Antes de gerar o `.aab`, confirme que `client/.env.production` aponta para:

```env
VITE_API_URL=https://api.filhosdoreibjj.com/api
```
