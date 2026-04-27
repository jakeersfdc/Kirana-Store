# Kirana Mobile (Expo / React Native)

Same Blinkit-style storefront as the web `/shop`, but native on iOS + Android. **No Android Studio / Xcode needed for testing** — use the free **Expo Go** app on your phone.

## ⚡ Quick start (5 minutes)

```powershell
cd d:\Jakeer\E-Commerce\mobile
npm install
npx expo start
```

Then on your phone:

1. Install **Expo Go** from the [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or App Store
2. Scan the QR code shown in the terminal
3. The app loads instantly — every code save hot-reloads

## 🌐 Pointing the app at your backend

The API URL is in [`app.json`](app.json) under `expo.extra.API_URL`. Defaults to `https://kirana-api.fly.dev`.

### For local testing on your phone
Your phone needs to reach your laptop's IP. Find it:

```powershell
ipconfig | Select-String IPv4
# e.g. 192.168.1.42
```

Edit `app.json`:
```json
"extra": { "API_URL": "http://192.168.1.42:4000" }
```

Phone + laptop must be on the **same Wi-Fi**. Restart `npx expo start`.

### For production
Set `API_URL` to your deployed backend URL (e.g. `https://kirana-api.fly.dev`) before building.

## 📦 Build a real APK / AAB / IPA (free)

Expo provides **EAS Build** — free tier: 30 builds/mo.

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # APK you can install/share directly
eas build --platform android --profile production # AAB for Play Store
eas build --platform ios                          # needs Apple Dev account ($99/yr)
```

The APK download link arrives by email/Expo dashboard in ~10 min. Send to shop owners by WhatsApp.

## 📝 Submit to Play Store (₹2,000 one-time, optional)

```powershell
eas submit --platform android
```

## 🎨 What's included

- Mobile-first product grid (2 cols)
- Category chips (horizontal scroll)
- Search
- Add-to-cart with stepper
- Persistent cart (`AsyncStorage`) per store
- Multi-store picker bottom sheet
- Cart drawer + checkout form (name, phone, address, delivery type, payment)
- Order success screen
- Pull-to-refresh
- Stock-aware ("Only N left" / "Out of stock")
- Connection error retry

## 🆘 Common issues

| Problem | Fix |
|---|---|
| "Could not connect" on phone | Use your laptop's LAN IP, not `localhost` |
| QR scan doesn't open | Both devices on same Wi-Fi? Disable VPN |
| Stuck on splash | `npx expo start -c` (clear cache) |
| Android emulator | Use `http://10.0.2.2:4000` (special host alias) |
| iOS simulator | `http://localhost:4000` works |
