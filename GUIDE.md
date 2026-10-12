# 3D APK Store — Setup Guide (GitHub + Vercel)

## Folder
- `index.html`, `app.js` — website (kono change lagbe na)
- `apps.json` — **tomar sob app ekhane**
- `apk/` — tomar `.apk` file gula
- `assets/` — icon + screenshot (png/jpg/svg)
- `vercel.json`

## Notun app add kora (apps.json)
```json
{
  "id": "my-app",            // unique, space chhara
  "name": "My App",
  "tagline": "Short line",
  "category": "Tools",
  "icon": "assets/my-app.png",
  "color": "#e8a33d",        // 3D tile er body colour
  "version": "1.0.0",        // version bodlale user ke "Update" dekhabe
  "size": "12 MB", "android": "Android 8.0+", "updated": "2026-10-12",
  "rating": 4.6, "ratingCount": 120, "downloads": "1K+", "price": "Free",
  "developer": "Your Name", "package": "com.you.myapp", "featured": true,
  "description": "Long description...",
  "whatsNew": ["Fix 1", "Feature 2"],
  "permissions": ["Internet", "Storage"],
  "screenshots": ["assets/s1.png", "assets/s2.png"],
  "reviews": [{"name":"Rahim","rating":5,"text":"Great!","date":"2026-10-01"}],
  "apk": "apk/my-app.apk"
}
```
Rack e 24 ta app dhore (2 ta kore protiti ghore, upor theke). Beshi hole "All apps" list view e dekha jabe.
Storer naam: `"storeName"` (apps.json er upore).

## GitHub (browser diye, kono command lagbe na)
1. github.com → **New repository** → naam `apk-store` → Public → Create.
2. **uploading an existing file** e click → zip er vitorer sob file/folder drag-drop → **Commit changes**.
3. APK file 25MB er beshi hole web upload hobe na → repo te **Releases → Create release** → APK attach → link copy kore `apps.json` er `"apk"` e full URL boshao.

## Vercel
1. vercel.com → GitHub diye login → **Add New → Project**.
2. `apk-store` repo **Import**.
3. Framework Preset: **Other**. Build command / Output khali. **Deploy**.
4. 1 minute pore link pabe: `https://apk-store-xxx.vercel.app`.
5. Notun app: GitHub e `apps.json` + apk upload → Vercel auto update.

## Test locally
`python3 -m http.server 8000` → http://localhost:8000
