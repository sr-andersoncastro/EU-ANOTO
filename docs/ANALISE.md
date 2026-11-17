# Análise do Eu Anoto v0.9

## Como o app é feito
APK de ~340 KB. A interface é **100% web** (HTML + CSS + JS puro, sem framework) rodando dentro de uma
**WebView** Android. O Java/Kotlin só faz a ponte com o sistema (`classes.dex`).

| Parte | Tamanho | Papel |
|---|---|---|
| `core.js` | 201 linhas | dados, validação, cálculos (valores em centavos), persistência |
| `ui.js` | 195 | telas: Início, Extrato, Relatórios, Ajustes; navegação |
| `dialogs.js` | 244 | lançamento, categorias, orçamentos, recorrentes, lixeira, GPS |
| `voice.js` | 9 | lançamento por voz em português ("gastei 50 reais no mercado") |
| `export.js` | 8 | PDF (HTML) e Excel .xlsx gerado na mão |
| `device.js` | 119 | ponte Android, backup, segurança |
| `app.css` | 222 | visual (cards coloridos, barra inferior) |

Dados: `localStorage` (chave `meu-controle-v1`) ou `EncryptedStore` (Android Keystore).
Categorias padrão: CLT, Vendas, Serviços, Motorista (Uber/99), Mercado, Luz, Água etc.
Público alvo claro: **motorista de aplicativo / autônomo** (custo do trabalho, origem Uber/99, combustível).

## Funções que dependem do Android (precisam de equivalente no iOS)
Nativo (`AndroidDevice` / `AndroidPlus`), identificado pelo DEX e pelo JS:
- `locate`, `openMap`, `cancelLocation` – localização do lançamento
- `speak` – reconhecimento de voz (`RECOGNIZE_SPEECH`)
- `backupState`, `configureBackup`, `setBackupEnabled`, `autosave`, `restoreBackup` – backup automático (Drive)
- `backupPassword`, `securityState`, `toggleLock` – senha de backup e bloqueio por biometria (`USE_BIOMETRIC`)
- `pdf`, `xlsx` – salvar/compartilhar arquivos
- `notifications` + `ReminderReceiver` (BOOT_COMPLETED) – lembretes de contas recorrentes
- Classes: `MainActivity`, `SecureStore`, `BackupCrypto`, `ReminderReceiver`; pacote `com.meucontrole.updated`

## O que está bom
- Arquitetura simples e **portável**: a lógica toda é JS, não presa ao Android.
- Valores em centavos (evita erro de ponto flutuante); validação rígida de backup; lixeira.
- Visual forte e consistente; funciona offline; sem dependências externas.
- Voz em PT-BR já pensada para o dia a dia.

## O que melhorar
**Técnico**
1. Código em arquivos minúsculos e densos (linhas enormes) → difícil de manter. Reformatar, modularizar, adicionar testes (cálculos, parser de voz, importação).
2. Cálculos de período/saldo e parser de voz são o coração: cobrir com testes antes de mexer.
3. Dados só em `localStorage`: sem versionamento de esquema além de `version:1`. Planejar migrações.
4. `usesCleartextTraffic`/`allowBackup` no manifest: revisar (dados financeiros).
5. Mapa abre Google Maps; no iOS usar Apple Maps.
6. Acessibilidade: já há `aria`, manter; contraste de textos claros sobre cards laranja/verde.

**Produto**
1. Metas de poupança e previsão do mês (saldo projetado com recorrentes).
2. Painel do motorista: lucro líquido por dia/hora/km, custo por corrida, meta diária.
3. Gráfico de evolução (linha) além da rosca; comparação com o mês anterior.
4. Anexar foto de comprovante; busca e filtros no extrato.
5. Sincronização entre aparelhos (Android ↔ iOS) – ver abaixo.

## Fazer mais dinheiro (monetização)
Sugestões, sem tracking invasivo (app financeiro depende de confiança):
- **Gratuito + Pro** (assinatura barata, ex.: R$ 9,90/mês ou R$ 79/ano): backup/sync entre aparelhos, relatórios PDF/Excel avançados, múltiplas metas, painel do motorista completo.
- Nicho **motoristas de app / autônomos / MEI**: relatório de imposto de renda e DAS-MEI, é onde há disposição de pagar.
- Compra única "remover limites" como alternativa.
- Evitar anúncios: dados financeiros + anúncios afastam usuários.

## Caminho para iOS
Como o app é web, há três opções:
1. **Capacitor** (recomendada): empacota o mesmo HTML/JS num app iOS (e Android) com plugins para GPS, biometria, notificações, arquivos, Keychain. Reaproveita ~90% do código. Substitui `AndroidDevice`/`AndroidPlus` por uma camada de ponte única (ex.: `platform.js`).
2. **WKWebView nativo em Swift**: mesmo conceito, mais trabalho, controle total.
3. **PWA**: grátis e rápido, mas no iOS tem limites (notificações, backup, armazenamento pode ser limpo pelo Safari). Bom só como protótipo.

Pontos de atenção no iOS:
- **Reconhecimento de voz**: `SFSpeechRecognizer` (pt-BR); pedir permissões no `Info.plist`.
- **Backup**: trocar Google Drive por **iCloud** (CloudKit/iCloud Drive) ou exportação de arquivo.
- **Biometria**: Face ID/Touch ID (`NSFaceIDUsageDescription`); dados no Keychain.
- **Lembretes**: notificações locais (`UNUserNotificationCenter`), sem equivalente de BOOT_COMPLETED.
- **Publicar**: conta Apple Developer (US$ 99/ano) e um **Mac com Xcode** (ou CI como Codemagic/GitHub Actions macOS) — não dá para compilar iOS no Linux.
- Safe areas (notch / barra inferior) no CSS: `env(safe-area-inset-*)`.

## Plano sugerido
1. Reformatar e organizar o código-fonte (`src/`), sem mudar comportamento.
2. Testes para cálculos e parser de voz.
3. Criar `platform.js` isolando tudo que é nativo.
4. Projeto Capacitor (Android + iOS) apontando para o mesmo `src/`.
5. Implementar equivalentes iOS (voz, GPS, biometria, backup, notificações).
6. Novas funções (painel motorista, metas) e modelo Free/Pro.
7. Testes em iPhone real (TestFlight) e publicação.

## Limite desta análise
O Java/Kotlin foi lido só por nomes de classes/métodos (DEX). Para ver a lógica nativa em detalhe
(backup, criptografia), o próximo passo é decompilar o `classes.dex` com jadx.
