# GitHub MCP Setup Guide - Boligplattform Frontend

## 🚀 Oversikt

Dette dokumentet beskriver hvordan GitHub MCP (Model Context Protocol) er satt opp for boligplattform-frontend prosjektet, og hvordan du kan bruke det effektivt.

## 📋 Hva som er satt opp

### 1. GitHub Actions Workflows
- **CI/CD Pipeline** (`.github/workflows/ci.yml`)
  - Automatisk linting og formatering
  - TypeScript type-checking
  - Bygging og testing
  - Sikkerheetsaudit
  - Automatisk deployment

### 2. Issue og PR Templates
- **Bug Report Template** (`.github/ISSUE_TEMPLATE/bug_report.md`)
- **Feature Request Template** (`.github/ISSUE_TEMPLATE/feature_request.md`)
- **Pull Request Template** (`.github/pull_request_template.md`)

### 3. MCP Konfigurasjon
- **Prosjektkonfigurasjon** (`mcp-config.json`)
- **Oppdatert .gitignore** med MCP-spesifikke unntak
- **Nye npm scripts** for MCP-integrasjon

## 🛠️ Kommandoer for MCP

### Nye NPM Scripts
```bash
# Linting og formatering
npm run lint          # Fikser automatisk linting-feil
npm run lint:check     # Sjekker for linting-feil uten å fikse
npm run format         # Formaterer kode med Prettier
npm run format:check   # Sjekker formatering uten å endre

# Type-checking
npm run type-check     # Kjører TypeScript type-checking

# MCP-spesifikke kommandoer
npm run mcp:sync       # Synkroniserer med GitHub MCP
npm run mcp:status     # Viser MCP-status

# Vedlikehold
npm run clean          # Renser cache og bygdefiler
npm run prepare        # Kjøres før commits (type-check + lint)
```

## 📝 Hvordan bruke GitHub MCP

### 1. Issue Management
Når du oppretter nye issues, bruk de forhåndsdefinerte templates:

- **For bugs**: Velg "Bug Report" template
- **For nye features**: Velg "Feature Request" template

Templates inkluderer:
- Strukturert informasjon
- Roadmap-kategorisering
- Prioritering
- Komponent-mapping

### 2. Pull Requests
PR-templaten hjelper med:
- Strukturert beskrivelse
- Type-kategorisering (bug fix, feature, etc.)
- Roadmap-tilknytning
- Komponent-mapping
- Testing-sjekkliste

### 3. Automatiserte Workflows

#### På Push til Main/Develop:
1. Linting og formatering
2. TypeScript type-checking
3. Byggetest
4. Sikkerheetsaudit
5. Deployment (kun main branch)

#### På Pull Requests:
1. Alle samme sjekker som push
2. Preview deployment
3. Automatisk kommentar med deployment-status

## 🔧 Konfigurasjon

### MCP Config (`mcp-config.json`)
Denne filen inneholder:
- Prosjektmetadata
- Feature-status (ferdig/pågående/planlagt)
- Teknologistack
- GitHub MCP-innstillinger

### Branch Protection
Følgende branches er beskyttet:
- `main` - Produksjonsbranch
- `develop` - Utviklingsbranch

### Miljøer
- **Development**: Automatisk deployment på `develop` branch
- **Production**: Automatisk deployment på `main` branch (krever godkjenning)

## 📊 Roadmap Integration

MCP-oppsettet er integrert med prosjektets roadmap:

### Ferdigstilte features:
- FINN-integrasjon
- Boligsammenligning
- Verdivurderingsverktøy
- AI-takstrapport-analyse

### Pågående features:
- Kjøpskalkulator
- Oppussingskalkulator
- Utleiekalkulator

### Planlagte features:
- Brukerautentisering og profiler
- Budrundeverktøy
- Sjekklister
- Boligalarmer

## 🚦 Workflow

### 1. Utvikling
1. Opprett feature branch fra `develop`
2. Utvikle og test lokalt
3. Kjør `npm run prepare` før commit
4. Push til GitHub
5. Opprett Pull Request

### 2. Code Review
1. Automatiske sjekker kjøres
2. Manual review av teammedlemmer
3. Godkjenning og merge til `develop`

### 3. Release
1. Merge `develop` til `main`
2. Automatisk deployment til produksjon
3. Tagging av release

## 🔍 Monitoring

### GitHub Actions
- Sjekk Actions-tab for status på builds
- Få varsler ved failed builds
- Se deployment-status

### Notifications
GitHub MCP sender automatisk varsler for:
- Failed builds
- Security vulnerabilities
- PR-kommentarer
- Issue-oppdateringer

## ⚡ Tips for effektiv bruk

1. **Bruk templates**: Alltid bruk issue/PR templates for konsistens
2. **Link issues**: Koble PRs til relevante issues
3. **Kategoriser**: Bruk labels og milestones aktivt
4. **Test lokalt**: Kjør `npm run prepare` før push
5. **Følg roadmap**: Marker features som ferdig/pågående i roadmap.md

## 🛡️ Sikkerhet

- Automatisk vulnerability scanning
- Dependency audit på hver build
- Branch protection rules
- Environment-baserte deployments med godkjenning

## 📚 Neste steg

1. Installer ESLint og Prettier extensions i VS Code
2. Konfigurer pre-commit hooks
3. Set opp development environments
4. Opprett første issue med feature request template
5. Start med første pull request

---

**Spørsmål eller problemer?** Opprett en issue med bug report eller feature request template! 