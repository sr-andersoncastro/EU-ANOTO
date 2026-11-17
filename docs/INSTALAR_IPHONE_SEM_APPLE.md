# Instalar no iPhone sem conta Apple Developer

## Caminho recomendado: PWA (grátis, sem expiração, sem computador)
O app é publicado como site (GitHub Pages) e instalado na tela inicial pelo Safari.

1. No GitHub: repositório → Settings → Pages → Source: **GitHub Actions** (o workflow `pages.yml` publica `www/` a cada push na `main`).
2. O endereço será `https://sr-andersoncastro.github.io/EU-ANOTO/`.
3. No iPhone, abra o endereço **no Safari** → botão Compartilhar → **Adicionar à Tela de Início**.
4. Para atualizar, basta publicar de novo; o app pega a versão nova ao abrir (aumente `VERSION` em `www/sw.js`).

Funciona offline. Dados ficam só no aparelho (localStorage).

### Limites no iPhone
- **Backup**: baixar e restaurar arquivo `.json` funcionam; backup automático no Drive/iCloud não existe. Faça cópias com frequência: se apagar o app ou os dados do Safari, perde tudo.
- **Voz**: o botão "Falar" mostra a dica de ditar pelo microfone do teclado.
- **Lembretes** de contas recorrentes: não funcionam com o app fechado (iOS não permite notificação local em PWA). Os avisos aparecem dentro do app.
- **Bloqueio Face ID / senha do backup**: não existem.
- **Excel** baixa direto; **PDF** abre o relatório para imprimir/salvar como PDF pelo Compartilhar.
- Pede iOS 16.4+ para melhor comportamento; a tela inicial pode demorar a atualizar após novas versões.

## Alternativa: IPA instalado por sideload (AltStore / Sideloadly)
Dá recursos nativos, mas **precisa de um computador (Windows ou Mac)**, um Apple ID gratuito e **renovar a assinatura a cada 7 dias**; limite de 3 apps. A distribuição para outras pessoas é inviável. Só vale se precisar de funções nativas (voz, notificações). O Codemagic/Actions pode gerar um `.ipa` sem assinatura para isso (`CODE_SIGNING_ALLOWED=NO`); não está configurado ainda.

## O que não existe
Não há forma legítima de distribuir um app iOS direto para o público no Brasil sem Apple Developer
(lojas alternativas existem apenas na União Europeia e também exigem conta de desenvolvedor).
