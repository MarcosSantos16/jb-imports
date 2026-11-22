# Auditoria de segurança: JB Imports

Data: 2026-11-22. Escopo: código do servidor (Express), front-end (vitrine e painel admin), regras do Firestore, `vercel.json`, cabeçalhos HTTP, dependências e histórico do Git.

## 1. Método

- Leitura completa de `src/`, `server.js`, `api/`, `public/js/`, `firestore.rules`, `vercel.json` e `scripts/`.
- Busca por padrões de risco: `innerHTML`, `eval`, `new Function`, `localStorage`, `console.*` com dados pessoais, CORS, bibliotecas de CSRF, uso de segredos.
- `npm audit --omit=dev` nas dependências de produção.
- Histórico do Git: busca por chaves privadas e arquivos de credencial. Nenhum valor de segredo foi exibido.
- Testes: validação de fotos e middleware de autenticação com Firebase simulado (13 casos), cabeçalhos HTTP reais com `server.js`, Chromium sem violações de CSP nas páginas, `npm run build` e `npm run check`.

Limitação: o sandbox não alcança o Firebase real (gstatic e serviços do Google bloqueados). Por isso, não foram testados contra o projeto real: a revogação de token (`checkRevoked`), o login do painel e a persistência de sessão no SDK.

## 2. Vulnerabilidades corrigidas

| # | Problema | Arquivo | Risco | Correção |
|---|----------|---------|-------|----------|
| 1 | Tokens de administrador revogados continuavam válidos até expirarem (cerca de 1 hora). | `src/middleware/auth.js` | Médio | `verifyIdToken(token, true)`: confere revogação e conta desativada no Firebase a cada requisição. |
| 2 | A resposta 401 devolvia o texto interno de erro do Firebase (`Motivo: ...`). | `src/middleware/auth.js` | Baixo | Mensagem genérica ao cliente. O detalhe técnico continua apenas no log do servidor. |
| 3 | Fotos enviadas do computador eram aceitas pelo tipo declarado (`data:image/png`), sem checar o conteúdo. | `src/services/produtos.service.js` | Baixo | Confere a assinatura binária do arquivo (PNG, JPEG e WebP) antes de salvar. |
| 4 | Sessão do painel admin persistia indefinidamente no navegador, o que é arriscado em computador compartilhado. | `public/js/admin/admin.js` | Médio | `browserSessionPersistence`: a sessão termina ao fechar o navegador. Custo: é preciso entrar de novo ao reabrir. |
| 5 | Sem `Content-Security-Policy` como cabeçalho HTTP (a versão em `<meta>` não aceita `frame-ancestors`) e sem HSTS. | `vercel.json`, `server.js` | Baixo | Acrescentados CSP (com `frame-ancestors 'none'`) e `Strict-Transport-Security`. |

## 3. Verificado e sem falha encontrada

- **Autenticação das rotas privadas:** todas as rotas `/api/admin/*` passam por `requireAdmin` no próprio roteador (`src/routes/index.js`). Não há rota administrativa sem autenticação.
- **Controle de acesso:** o admin precisa de documento em `admins/{uid}`, e as regras do Firestore não permitem escrita nessa coleção pelo navegador.
- **Preço e estoque:** são calculados e conferidos no servidor, dentro de transação. O navegador não define valor.
- **Mass assignment:** `validar()` usa lista branca de campos. Campos extras são descartados.
- **Injeção (SQL/NoSQL):** não há consulta montada com concatenação de texto. O Firestore usa o builder da SDK.
- **XSS:** nenhum uso de `innerHTML`, `eval` ou `new Function`. O `h()` usa `textContent`.
- **IDOR:** não existe endpoint público de leitura de pedidos. Leitura e alteração de pedidos são só admin.
- **CSRF:** a API autentica por cabeçalho `Authorization: Bearer`, não por cookie. O corpo só aceita JSON e não há CORS, então o acesso é restrito à mesma origem.
- **Regras do Firestore:** `pedidos` e `admins` não têm leitura nem escrita pelo navegador. `produtos` é legível só quando `ativo == true` (ou para admin).
- **Anti-bot no pedido público:** campo honeypot (`website`) e limite de 10 pedidos por IP a cada 10 minutos.
- **Senhas:** o app nunca armazena nem vê hash de senha. O login é feito direto no Firebase Auth, que cuida do armazenamento.
- **Segredos:** `.env` está no `.gitignore`. O `.env.example` atual só tem texto de exemplo, sem chave real (verificado sem exibir valores). A configuração web do Firebase é pública por design, e a segurança fica nas regras.
- **Logs:** não registram dados pessoais. Erros desconhecidos voltam ao cliente como "Erro interno" genérico.
- **Upload:** aceita só PNG, JPEG e WebP, com limite de 60 KB por foto e 8 fotos por produto. SVG não é aceito.
- **Dependências:** `express` 4.22.3 sem alertas. Os alertas estão só no `firebase-admin` (ver pendências).

## 4. Pendências que exigem ação sua

1. **Chave privada da conta de serviço no histórico do Git (crítico).** O repositório é público. A chave esteve em commits anteriores (ex.: `ae9dec3`). Faça:
   - rotacionar a chave no Firebase Console (Configurações do projeto > Contas de serviço), ou revogá-la;
   - atualizar `FIREBASE_PRIVATE_KEY` na Vercel e na Hostinger;
   - reescrever o histórico só se você autorizar, porque isso é destrutivo e exige force push.
2. **8 vulnerabilidades moderadas em dependências (`npm audit`).** Estão na cadeia do `firebase-admin` 12 (`@google-cloud/firestore`, `google-gax`, `uuid`, `teeny-request`). A correção é o `firebase-admin` 14, que é uma troca de versão maior. Não apliquei porque não consegui testar contra o Firebase real. Recomendo fazer em branch separada, testando com um projeto de teste. Não encontrei um caminho de exploração neste app para essas falhas, mas isso não substitui a atualização.
3. **Força bruta no login.** O login é do Firebase Auth. O app mostra `auth/too-many-requests`, então o Firebase aplica um bloqueio temporário. Para uma barreira extra, ative o App Check (reCAPTCHA) no Console. Isso exige configuração sua e não foi implementado.
4. **Política de senha.** Não é configurável pelo código. Confira no Console a regra mínima de senha do Firebase e suba para algo como 12 caracteres, se o plano permitir.
5. **Reserva de estoque sem expiração.** Pedidos em `reservado` seguram o estoque até o admin concluir ou cancelar. Sem Cloud Functions (plano Spark), não há expiração automática. É uma decisão de negócio.
6. **Limite de requisições em memória.** O `rateLimit` vale por instância da Vercel, então é um freio fraco. Um contador no Firestore resolveria, mas gera leituras e escritas no plano gratuito. Decisão sua.
7. **SDK do front-end antigo.** O Firebase Web está fixado em 10.14.1. Não há SRI para o import dinâmico do gstatic. Recomendo atualizar o SDK em um teste separado.
8. **Campo `ativo` do admin.** Um documento em `admins` sem o campo `ativo` ainda conta como admin. Só o Console consegue criar esses documentos. Mudar para `ativo === true` quebraria admins já cadastrados sem o campo, então deixei como está.
9. **Recuperação de senha.** O app não tem fluxo próprio. A redefinição é feita no Firebase (Console ou e-mail).

## 5. Arquivos modificados

- `src/middleware/auth.js`: revogação e mensagem de erro genérica.
- `src/services/produtos.service.js`: checagem de assinatura binária das fotos.
- `public/js/admin/admin.js`: persistência de sessão por aba.
- `server.js`: cabeçalhos CSP e HSTS no servidor local e na Hostinger.
- `vercel.json`: cabeçalhos CSP e HSTS na Vercel.
- `docs/03-auditoria-seguranca.md`: este relatório.

`package.json` e `package-lock.json` não mudaram.

## 6. Recomendações adicionais

- Adicionar uma checagem de CI que rode `npm audit --omit=dev` e falhe em vulnerabilidades altas.
- Manter o `.env.example` sempre sem valores reais, e rever o histórico antes de tornar um repositório público.
- Ao configurar a Hostinger, manter o HTTPS ativo para que o HSTS faça sentido.
