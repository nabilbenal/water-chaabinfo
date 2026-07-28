# Déploiement APK Android en réseau local (LAN SEACO) — Solution B

L'APK natif n'est pas soumis aux restrictions **Mixed Content** ni **CORS** du navigateur :
il peut appeler directement `http://10.53.64.61/rec/WSAcces.asmx` depuis un terminal
connecté au réseau SEACO (Wi-Fi interne ou VPN).

## 1. Configuration déjà appliquée (`capacitor.config.json`)

- `server.url` **supprimé** → l'app charge le build local (`dist/`) embarqué dans l'APK,
  et non plus l'aperçu Lovable en HTTPS.
- `server.androidScheme: "http"` → l'origine WebView est `http://localhost`, donc les
  appels vers `http://10.53.64.61` ne sont plus bloqués (pas de HTTPS → HTTP).
- `server.cleartext: true` + `android.allowMixedContent: true` → trafic HTTP autorisé.
- `server.allowNavigation` → whitelist des IP LAN.

> Conséquence : le hot-reload depuis l'aperçu Lovable est désactivé. Pour le réactiver
> temporairement en développement, remettre `"url": "https://<preview>.lovableproject.com"`.

## 2. Variables d'environnement (`.env.production`)

```env
VITE_SOAP_BASE_URL=http://10.53.64.61/rec
VITE_SOAP_WSDL_URL=http://10.53.64.61/rec/WSAcces.asmx?wsdl
```

Ces valeurs sont figées **au moment du build** : relancer `npm run build` après tout changement.

## 3. Build de l'APK

```bash
npm install
npm run build
npx cap add android        # une seule fois
npx cap sync android
npx cap open android       # Android Studio → Build > Build APK(s)
```

## 4. Permissions — `android/app/src/main/AndroidManifest.xml`

Dans la balise `<application>` :

```xml
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

Et les permissions (avant `<application>`) :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

## 5. `android/app/src/main/res/xml/network_security_config.xml`

À créer (autorise le HTTP uniquement vers le LAN SOMEI) :

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.53.64.61</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

## 6. Vérification sur le terminal

1. Connecter le téléphone au **Wi-Fi SEACO** (même réseau que `10.53.64.61`).
2. Ouvrir l'app → **Profil > Configuration SOMEI**.
3. Cliquer **Tester WSDL** → doit renvoyer `HTTP 200` + `text/xml`.
4. Cliquer **Tester identifiants** → `GenerateToken` doit retourner un token.

## 7. Erreurs fréquentes

| Symptôme | Cause | Correctif |
|---|---|---|
| `Failed to fetch` / `CLEARTEXT not permitted` | `usesCleartextTraffic` absent | Étapes 4 et 5 |
| Écran blanc au lancement | `server.url` encore présent mais injoignable | Le retirer, `npm run build` + `npx cap sync android` |
| Timeout sur le WSDL | Téléphone hors LAN / VPN inactif | Vérifier le Wi-Fi, tester l'URL dans Chrome mobile |
| Anciennes valeurs SOAP | `.env.production` modifié sans rebuild | `npm run build && npx cap sync android` |
