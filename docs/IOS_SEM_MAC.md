> **Atualização:** distribuição sem Apple Developer → ver `INSTALAR_IPHONE_SEM_APPLE.md`. Este documento vale só se um dia publicar pela Apple.

# Eu Anoto no iPhone, sem Mac

O app é web (Capacitor). Um Mac na nuvem (Codemagic) compila e envia ao TestFlight a cada push na `main`.

## O que já está pronto no repositório
- `www/` – app (cópia da v0.9 + `ios-bridge.js`, que recria no iPhone as funções nativas do Android)
- `capacitor.config.json`, `package.json` – projeto Capacitor
- `codemagic.yaml` – build + assinatura automática + TestFlight
- `resources/icon.png` – ícone (**1024px ampliado de 256px: troque por um ícone em alta resolução antes de publicar**)

A pasta `ios/` é gerada no build (`cap add ios`), por isso não está no repositório.

## O que você precisa fazer (uma vez)
1. **Apple Developer Program** (US$ 99/ano): developer.apple.com/programs → Enroll. A aprovação pode levar de horas a dias.
2. Com a conta ativa, em developer.apple.com → Identifiers: criar o App ID `com.euanoto.app`
   (se o nome estiver ocupado, escolha outro e altere em `capacitor.config.json` e `codemagic.yaml`).
3. Em appstoreconnect.apple.com → Apps → **+ Novo app** (iOS, nome "Eu Anoto", idioma Português (Brasil),
   Bundle ID acima). Anote o **Apple ID numérico** do app e coloque em `APP_STORE_APPLE_ID` no `codemagic.yaml`.
4. App Store Connect → Usuários e Acesso → Integrações → **Chaves da API** → criar chave (acesso "App Manager").
   Baixe o `.p8` (só baixa uma vez), anote o Issuer ID e o Key ID.
5. codemagic.io → entrar com GitHub → adicionar o repositório `EU-ANOTO`.
   Team settings → Integrations → App Store Connect → criar integração chamada **`eu-anoto-asc`** com o Issuer ID, Key ID e o `.p8`.
6. Dar push na `main` (ou "Start new build"). O app chega ao **TestFlight**; instale o app TestFlight no iPhone e aceite o convite.

## Limites desta primeira versão (iPhone)
| Função | Estado |
|---|---|
| Lançamentos, extrato, relatórios, orçamento, recorrentes | igual ao Android |
| Localização do gasto | portada (Geolocation) |
| Voz (pt-BR) | portada (plugin de reconhecimento de voz) – precisa testar no aparelho |
| Lembretes | portados (notificações locais) – precisa testar |
| Backup manual / restaurar | restaurar por arquivo; salvar pelo menu Compartilhar |
| PDF | compartilha um arquivo HTML (ainda não gera PDF) |
| Excel (.xlsx) | compartilha pelo menu Compartilhar |
| Backup automático | **não portado** (no Android é Google Drive; no iOS seria iCloud) |
| Bloqueio por Face ID / senha do backup | **não portado** |

Nada disso foi testado em iPhone ainda: eu validei só a lógica da ponte num navegador simulado.
Os primeiros builds podem falhar por detalhes de configuração; os logs do Codemagic dizem onde.
