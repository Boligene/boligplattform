# 🚀 GitHub MCP Quick Start Guide

## Kom i gang på 5 minutter!

### 1. Installer dependencies
```bash
npm install
```

### 2. Sjekk MCP-status
```bash
npm run mcp:status
```

### 3. Installer anbefalte VS Code extensions
Åpne VS Code og installer de anbefalte extensions som dukker opp.

### 4. Test at alt fungerer
```bash
# Kjør type-checking
npm run type-check

# Kjør linting
npm run lint:check

# Kjør formatting check
npm run format:check

# Start development server
npm run dev
```

## 🛠️ Daglig workflow

### Når du jobber med en ny feature:
1. **Opprett issue først**:
   - Gå til GitHub repository
   - Klikk "Issues" → "New Issue"
   - Velg "Feature Request" template
   - Fyll ut alle felt

2. **Opprett feature branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/navn-på-feature
   ```

3. **Utvikle og test**:
   ```bash
   # Kjør dette før hver commit
   npm run prepare
   ```

4. **Commit og push**:
   ```bash
   git add .
   git commit -m "feat: beskrivelse av feature"
   git push origin feature/navn-på-feature
   ```

5. **Opprett Pull Request**:
   - Gå til GitHub repository
   - Klikk "Pull requests" → "New pull request"
   - PR-templaten fylles automatisk ut
   - Link til issue: "Closes #123"

### Ved bugs:
1. **Opprett bug issue**:
   - Bruk "Bug Report" template
   - Inkluder skjermdumper og konsollogs

2. **Fiks på hotfix branch**:
   ```bash
   git checkout main
   git checkout -b hotfix/bug-beskrivelse
   # Fiks bug
   npm run prepare
   git commit -m "fix: beskrivelse av bug-fix"
   ```

## 📊 Prosjekt-status

### Se nåværende status:
```bash
npm run mcp:status
```

### Synkroniser med GitHub:
```bash
npm run mcp:sync
```

## 🎯 Viktige kommandoer

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Bygg for produksjon |
| `npm run lint` | Fiks linting-feil automatisk |
| `npm run format` | Formater all kode |
| `npm run type-check` | Sjekk TypeScript-feil |
| `npm run prepare` | Kjør alle sjekker før commit |
| `npm run mcp:status` | Vis prosjektstatus |
| `npm run mcp:sync` | Synkroniser med GitHub MCP |

## 🔄 GitHub Actions

### Automatiske sjekker som kjører:
- ✅ ESLint linting
- ✅ Prettier formatting
- ✅ TypeScript type-checking
- ✅ Build test
- ✅ Security audit
- ✅ Deployment (på main branch)

### Ved pull requests:
- 🔄 Alle samme sjekker
- 📦 Preview deployment
- 💬 Automatisk status-kommentar

## 🏷️ Commit konvensjoner

Bruk disse prefixene for commits:
- `feat:` - Ny funksjonalitet
- `fix:` - Bug fix
- `docs:` - Dokumentasjon
- `style:` - Styling (ikke funksjonalitet)
- `refactor:` - Kodeendring uten ny funksjonalitet
- `test:` - Legge til tester
- `chore:` - Vedlikehold, dependencies

## 🚨 Feilsøking

### Hvis type-checking feiler:
```bash
npx tsc --noEmit --listFiles
```

### Hvis linting feiler:
```bash
npm run lint
```

### Hvis formatting feiler:
```bash
npm run format
```

### Hvis builds feiler:
```bash
npm run clean
npm install
npm run build
```

## 📞 Hjelp

- **Dokumentasjon**: Les `GITHUB_MCP_SETUP.md`
- **Status**: Kjør `npm run mcp:status`
- **Issues**: Opprett issue på GitHub med template

---

**🎉 Du er nå klar til å bruke GitHub MCP effektivt!** 