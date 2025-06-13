# 🔧 Social Auth Setup Guide for Boligene

## 📋 **Oversikt**
Denne guiden hjelper deg med å konfigurere alle social login-providerne for din Supabase-app.

## 🔗 **Supabase URLs du trenger:**
- **Project URL:** `https://ixqtnqvmkdcjqvpvgzpx.supabase.co`
- **Callback URL:** `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`
- **Local Callback:** `http://localhost:5173/auth/callback`

---

## 🔵 **1. Google OAuth Setup**

### **Steg 1: Google Cloud Console**
1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Opprett nytt prosjekt eller velg eksisterende
3. Gå til **APIs & Services** → **Credentials**
4. Klikk **Create Credentials** → **OAuth 2.0 Client ID**
5. Velg **Web application**

### **Steg 2: Konfigurer URLs**
- **Authorized JavaScript origins:**
  - `https://ixqtnqvmkdcjqvpvgzpx.supabase.co`
  - `http://localhost:5173` (for utvikling)
- **Authorized redirect URIs:**
  - `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`
  - `http://localhost:5173/auth/callback`

### **Steg 3: Kopier credentials**
- **Client ID:** `[KOPIER HER]`
- **Client Secret:** `[KOPIER HER]`

### **Steg 4: Supabase Dashboard**
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/project/ixqtnqvmkdcjqvpvgzpx/auth/providers)
2. Aktiver **Google** provider
3. Lim inn Client ID og Client Secret
4. Klikk **Save**

---

## 🍎 **2. Apple ID Setup**

### **Steg 1: Apple Developer Console**
1. Gå til [Apple Developer](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Klikk **+** → **Services IDs**
4. Registrer ny Service ID

### **Steg 2: Konfigurer Service ID**
- **Description:** `Boligene Login`
- **Identifier:** `com.boligene.auth` (eller ditt domene)
- **Return URLs:**
  - `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`

### **Steg 3: Generer Private Key**
1. **Keys** → **+** → **Sign In with Apple**
2. Last ned `.p8` filen
3. Noter **Key ID** og **Team ID**

### **Steg 4: Supabase Dashboard**
1. Aktiver **Apple** provider
2. Fyll inn:
   - **Service ID:** `com.boligene.auth`
   - **Team ID:** `[DIN TEAM ID]`
   - **Key ID:** `[DIN KEY ID]`
   - **Private Key:** `[INNHOLD AV .p8 FIL]`

---

## 🔷 **3. Microsoft/Azure Setup**

### **Steg 1: Azure Portal**
1. Gå til [Azure Portal](https://portal.azure.com/)
2. **Azure Active Directory** → **App registrations**
3. **New registration**

### **Steg 2: Konfigurer App**
- **Name:** `Boligene Auth`
- **Redirect URI:** `Web` → `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`

### **Steg 3: Generer Secret**
1. **Certificates & secrets** → **New client secret**
2. Kopier **Value** (ikke ID!)

### **Steg 4: Supabase Dashboard**
1. Aktiver **Azure** provider
2. Fyll inn:
   - **Client ID:** `[APPLICATION (CLIENT) ID]`
   - **Client Secret:** `[SECRET VALUE]`

---

## 📘 **4. Facebook Setup**

### **Steg 1: Facebook Developer Console**
1. Gå til [Facebook Developers](https://developers.facebook.com/)
2. **My Apps** → **Create App**
3. Velg **Consumer** → **Next**

### **Steg 2: Legg til Facebook Login**
1. **Add Product** → **Facebook Login** → **Set Up**
2. Velg **Web**

### **Steg 3: Konfigurer URLs**
- **Valid OAuth Redirect URIs:**
  - `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`
  - `http://localhost:5173/auth/callback`

### **Steg 4: Supabase Dashboard**
1. Aktiver **Facebook** provider
2. Fyll inn:
   - **App ID:** `[FACEBOOK APP ID]`
   - **App Secret:** `[FACEBOOK APP SECRET]`

---

## ⚫ **5. GitHub Setup**

### **Steg 1: GitHub Developer Settings**
1. Gå til [GitHub Developer Settings](https://github.com/settings/developers)
2. **OAuth Apps** → **New OAuth App**

### **Steg 2: Konfigurer OAuth App**
- **Application name:** `Boligene Auth`
- **Homepage URL:** `https://ixqtnqvmkdcjqvpvgzpx.supabase.co`
- **Authorization callback URL:** `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`

### **Steg 3: Generer Client Secret**
1. Klikk **Generate a new client secret**
2. Kopier **Client ID** og **Client Secret**

### **Steg 4: Supabase Dashboard**
1. Aktiver **GitHub** provider
2. Fyll inn:
   - **Client ID:** `[GITHUB CLIENT ID]`
   - **Client Secret:** `[GITHUB CLIENT SECRET]`

---

## ✅ **6. Testing**

### **Test hver provider:**
1. Gå til `http://localhost:5173/auth`
2. Klikk på hver social login-knapp
3. Verifiser at du blir redirected til riktig provider
4. Sjekk at du kommer tilbake til appen etter innlogging

### **Vanlige feil:**
- **"Invalid redirect URI"** → Sjekk at callback URL er riktig konfigurert
- **"App not verified"** → Legg til test-brukere i provider-konsollen
- **CORS errors** → Sjekk domain-konfigurasjonen

---

## 🔧 **7. Produksjon**

Når du deployer til produksjon, husk å:
1. Oppdatere alle callback URLs til ditt produksjonsdomene
2. Verifisere apper hos providerne (spesielt Google og Facebook)
3. Teste alle providere i produksjonsmiljøet

---

## 📞 **Support**

Hvis du trenger hjelp:
1. Sjekk Supabase Auth logs i Dashboard
2. Kontroller browser developer tools for feilmeldinger
3. Verifiser at alle URLs er riktig konfigurert

**Callback URLs sammendrag:**
- **Supabase:** `https://ixqtnqvmkdcjqvpvgzpx.supabase.co/auth/v1/callback`
- **Local:** `http://localhost:5173/auth/callback`
- **Produksjon:** `https://ditt-domene.com/auth/callback` 