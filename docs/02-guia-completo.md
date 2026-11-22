# JB Imports — Guia Completo de Montagem, Deploy e Migracao

Versao: 1.0 | Data: 2026-11-19

---

## PARTE 1 — CONFIGURACAO DO FIREBASE (Plano Spark — Gratuito)

### 1.1 Criar o Projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique em "Adicionar projeto"
3. Nome do projeto: `jb-imports` (ou qualquer nome)
4. Desative o Google Analytics no assistente (opcional; voce pode ativar depois)
5. Clique em "Criar projeto"

### 1.2 Ativar o Cloud Firestore

1. No menu lateral, va em "Build" > "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione o modo de inicializacao: **Producao** (nao modo de teste)
4. Escolha a regiao mais proxima: `southamerica-east1` (Sao Paulo)
5. Clique em "Ativar"

### 1.3 Ativar o Firebase Authentication

1. No menu lateral, va em "Build" > "Authentication"
2. Clique em "Comecar"
3. Va na aba "Sign-in method"
4. Habilite o provedor "E-mail/senha"
5. Clique em "Salvar"

### 1.4 Criar o Primeiro Administrador

1. Ainda em Authentication, va na aba "Users"
2. Clique em "Adicionar usuario"
3. Informe o e-mail e senha do administrador da loja
4. Anote o "User UID" exibido apos a criacao (voce precisara dele no proximo passo)

### 1.5 Criar o Documento de Admin no Firestore

1. No Firestore, clique em "Iniciar colecao"
2. ID da colecao: `admins`
3. ID do documento: **cole o User UID copiado no passo anterior** (ex: `aBcDeFgH1234`)
4. Adicione os campos:
   - `email` (string): o-email-do-admin@email.com
   - `ativo` (boolean): `true`
   - `criadoEm` (timestamp): agora
5. Salve

### 1.6 Publicar as Regras de Seguranca do Firestore

1. No Firestore, va na aba "Regras"
2. Apague tudo e cole o conteudo do arquivo `firestore.rules` do projeto
3. Clique em "Publicar"

### 1.7 Obter as Credenciais do Admin SDK (Back-end)

1. No console Firebase, clique no icone de engrenagem (configuracoes do projeto)
2. Va em "Contas de servico"
3. Clique em "Gerar nova chave privada"
4. Salve o arquivo JSON gerado (ex: `serviceAccount.json`)
5. Abra o arquivo e copie:
   - `project_id` -> FIREBASE_PROJECT_ID
   - `client_email` -> FIREBASE_CLIENT_EMAIL
   - `private_key` -> FIREBASE_PRIVATE_KEY (string longa com \n's)

### 1.8 Obter as Credenciais do Web SDK (Front-end)

1. Na pagina de configuracoes do projeto, va em "Seus aplicativos"
2. Clique no icone "</>" para adicionar um app Web
3. Registre o app (nome: "JB Imports Web")
4. Copie o objeto `firebaseConfig` exibido
5. Cole no arquivo `public/js/config.js`:

```javascript
// public/js/config.js
export const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "jb-imports.firebaseapp.com",
  projectId: "jb-imports",
  // ... demais campos
};

export const API_BASE = '/api';
export const WA_NUMERO = '5581984543444';
```

---

## PARTE 2 — MONTAGEM LOCAL DO SISTEMA

### 2.1 Pre-requisitos

- Node.js 20+ instalado (`node -v`)
- npm 10+ (`npm -v`)
- Conta Firebase configurada (Parte 1)
- Conta Vercel (https://vercel.com) — gratuita

### 2.2 Clonar / Baixar o Projeto

```bash
# Se estiver usando Git:
git clone <url-do-seu-repositorio>
cd jb-imports

# Ou descompacte o .zip enviado e entre na pasta:
cd jb-imports
```

### 2.3 Instalar Dependencias

```bash
npm install
```

### 2.4 Configurar Variaveis de Ambiente

```bash
# Copie o exemplo
cp .env.example .env

# Edite o .env com suas credenciais reais:
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n"
PORT=3000
```

**ATENCAO:** O FIREBASE_PRIVATE_KEY deve estar entre aspas duplas e conter `\n` literais (nao quebras de linha reais).

### 2.5 Configurar o public/js/config.js

Edite o arquivo com as credenciais Web SDK obtidas na Parte 1.8.

O bloco `CLOUDINARY` do mesmo arquivo nao e mais necessario: as fotos nao precisam de conta externa (ver Parte 5).

### 2.6 Build das Paginas HTML

```bash
npm run build
```

Isso processa os templates em `src/templates/` e gera as paginas HTML finais em `public/`.

### 2.7 Popular o Banco com Dados de Exemplo (Opcional)

```bash
npm run seed
```

Isso cria:
- As 5 categorias no Firestore
- O documento de configuracoes da loja
- Produtos de exemplo (todos inativos por padrao; ative pelo painel admin)

### 2.8 Rodar Localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

O painel admin: http://localhost:3000/admin

### 2.9 Verificar Projeto

```bash
npm run check
```

Deve mostrar "PROJETO APROVADO" com 0 erros.

---

## PARTE 3 — DEPLOY NA VERCEL (Gratuito)

### 3.1 Instalar a CLI da Vercel (Opcional)

```bash
npm i -g vercel
```

### 3.2 Conectar seu Repositorio Git

Opcao A — Via Git (recomendado):
1. Faca push do projeto para o GitHub (crie um repo privado)
2. Acesse https://vercel.com/new
3. Importe o repositorio
4. A Vercel detecta automaticamente as configuracoes do `vercel.json`

Opcao B — Via CLI:
```bash
vercel login
vercel --prod
```

### 3.3 Configurar Variaveis de Ambiente na Vercel

1. No dashboard da Vercel, va em seu projeto > "Settings" > "Environment Variables"
2. Adicione as mesmas variaveis do `.env`:

| Nome                  | Valor                              | Ambientes          |
|-----------------------|------------------------------------|--------------------|
| FIREBASE_PROJECT_ID   | seu-projeto-id                     | Production, Preview|
| FIREBASE_CLIENT_EMAIL | firebase-adminsdk...               | Production, Preview|
| FIREBASE_PRIVATE_KEY  | -----BEGIN PRIVATE KEY-----\n...   | Production, Preview|

**IMPORTANTE:** Na Vercel, o FIREBASE_PRIVATE_KEY deve ter `\n` como caracteres literais (a aplicacao substitui automaticamente ao inicializar).

### 3.4 Verificar o Deploy

Apos o primeiro deploy:
- Loja: https://seu-projeto.vercel.app
- Admin: https://seu-projeto.vercel.app/admin
- API health: https://seu-projeto.vercel.app/api/health

### 3.5 Dominio Personalizado (Opcional)

1. No Vercel, va em "Settings" > "Domains"
2. Adicione seu dominio (ex: www.jbimports.com.br)
3. Configure os DNS conforme instrucoes da Vercel no seu provedor de dominio

---

## PARTE 4 — MIGRACAO FUTURA PARA HOSTINGER

### 4.1 O que Muda

| Aspecto           | Vercel (atual)                    | Hostinger (futuro)              |
|-------------------|-----------------------------------|---------------------------------|
| Entrada da API    | `api/index.js` (serverless)       | `server.js` (processo Node.js)  |
| Front-end         | Servido pela Vercel CDN           | Servido pelo Express (server.js)|
| Build             | `npm run build` antes do deploy   | `npm run build` antes do deploy |
| Codigo de negocio | IDENTICO — sem reescrita          | IDENTICO — sem reescrita        |

### 4.2 Passos para Migrar

1. **Contratar** o plano Hostinger que inclua Node.js (ex: Business ou superior)

2. **Fazer upload** do projeto via SFTP ou Git:
   ```bash
   # Via Git na Hostinger (painel hPanel):
   git clone <seu-repositorio>
   cd jb-imports
   npm install --production
   npm run build
   ```

3. **Configurar variaveis de ambiente** no painel da Hostinger (hPanel > Avancado > Variaveis de Ambiente) ou criar o arquivo `.env` diretamente no servidor.

4. **Configurar o ponto de entrada** no hPanel:
   - Va em "Node.js" > "Gerenciar"
   - Arquivo de entrada: `server.js`
   - Versao Node.js: 20.x

5. **Testar** acesso ao dominio configurado na Hostinger.

6. **Nao e preciso alterar nenhum arquivo** do projeto — a separacao `server.js` (Hostinger) vs `api/index.js` (Vercel) foi projetada exatamente para isso.

### 4.3 O Que NAO Muda

- Toda a logica de negocio (services, controllers, routes)
- O banco de dados Firebase (continua o mesmo)
- O front-end (continua servindo os mesmos arquivos `public/`)
- As regras de seguranca do Firestore
- O painel administrativo
- A integracao com WhatsApp

---

## PARTE 5 — GESTAO DE IMAGENS (Gratuito, sem Cloudinary)

As fotos dos produtos podem entrar de duas formas. Nenhuma exige conta em servico externo.

### 5.1 Foto do Computador (recomendado)

1. No painel admin, edite o produto e escolha "Enviar do computador".
2. Selecione uma foto JPG, PNG ou WebP de ate 8 MB.
3. O navegador reduz a foto automaticamente: lado maior de ate 900 px, em WebP, com no maximo 60 KB. Se nao couber, diminui um pouco mais.
4. A foto entra na galeria do produto. Clique em "Salvar produto" para gravar.

A foto fica gravada dentro do documento do produto no Firestore, no campo `imagens`, em base64. Limites:
- 60 KB por foto e 8 fotos por produto.
- Cerca de 800 KB por produto, porque o Firestore aceita no maximo 1 MiB por documento.
- O servidor aceita pedidos de ate 1 MB (limite do corpo JSON em `src/app.js`).

### 5.2 Link de Imagem (https)

1. Escolha "Colar URL", cole o endereco direto da imagem (`https://...`) e clique em "Adicionar link".
2. Qualquer site serve, inclusive um Cloudinary que voce ja use.
3. Antes de entrar na lista, o admin confere no navegador se o link carrega uma imagem. Paginas HTML e links quebrados sao recusados.
4. O site nao reduz fotos de outros sites. Se a imagem tiver mais de 2000 px, o admin avisa; nesse caso, prefira "Enviar do computador".

Links do Cloudinary sao otimizados pelo site, sem alterar a foto original:
- A vitrine entrega WebP no tamanho da tela (640 px no card e 160 px nas miniaturas).
- O admin converte o link colado para WebP de 1200 px.

### 5.3 Galeria do Produto (Admin)

- A primeira foto e a principal, exibida no card da vitrine.
- "Abrir foto" mostra a imagem em nova aba.
- "Tornar principal" passa a foto para o primeiro lugar.
- "Remover" tira a foto da lista. A mudanca so vale depois de "Salvar produto".

### 5.4 Como a Foto Aparece na Vitrine

- A foto aparece inteira, sem cortes, centralizada sobre um fundo preto. Nas bordas, uma linha verde neon se move em loop.
- Clicar na foto abre o visor: foto inteira, zoom ("Ampliar" ou clique na foto), "Anterior" e "Proxima" (ou as setas do teclado) para trocar de foto, e Esc para fechar.
- Quando o produto tem mais de uma foto, miniaturas aparecem abaixo da foto. Clicar numa miniatura troca a foto do card.
- Se o sistema operacional pedir para reduzir movimento, a linha neon e as animacoes ficam paradas.

---

## PARTE 6 — CADASTRAR PRIMEIRO PRODUTO (Fluxo Completo)

1. Acesse `https://seu-site.vercel.app/admin`
2. Faca login com o e-mail/senha criados no Firebase Auth
3. Clique em "+ Novo Produto"
4. Preencha:
   - **Nome:** iPhone 15 128GB Preto
   - **Categoria:** iPhones
   - **Condicao:** Novo
   - **Procedencia:** Original Apple
   - **Descricao:** (descricao tecnica detalhada)
   - **Preco:** 3499.90
   - **Estoque:** 5
   - **Fotos:** envie uma foto pelo computador ("Enviar do computador") ou cole um link https ("Colar URL"). Veja a Parte 5.
   - **Ativo:** marcado (sim)
5. Clique em "Salvar"
6. O produto aparece imediatamente na loja (sem reload)

---

### 6.1 Problemas Comuns

| Sintoma | Causa provavel | O que fazer |
|---------|----------------|-------------|
| "Corpo da requisicao grande demais" ao salvar | Servidor com limite antigo de 20 KB | Confirme que o deploy atual esta no ar (limite de 1 MB) |
| Foto do computador nao entra na galeria | Foto muito detalhada para caber em 60 KB | Use uma foto menor ou com menos detalhes |
| Link nao entra na lista | O endereco nao e a imagem direta, ou o site bloqueia | Abra o link no navegador: deve aparecer so a imagem. Ou use "Enviar do computador" |
| Vitrine mostra "Foto real em breve" | Produto sem foto salva, ou foto que nao carrega | Abra o produto no admin e confira a galeria; clique em "Salvar produto" |
| Animacoes nao aparecem no computador | Opcao "reduzir movimento" ligada no sistema | Windows: Configuracoes > Acessibilidade > Efeitos visuais > ative "Efeitos de animacao". Recarregue com Ctrl+F5 |

---

## PARTE 7 — DADOS LEGAIS A PREENCHER

Antes de publicar a loja, preencha estes dados em todas as paginas:

| Placeholder                    | O que preencher                                   |
|--------------------------------|---------------------------------------------------|
| [PREENCHER]                    | CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)    |
| Endereco                       | Ja preenchido: Rua do Atlantico, 69 - Recife/PE |
| [PREENCHER] | E-mail de contato (ex: contato@jbimports.com.br)|
| [PREENCHER]| Nome do DPO/Encarregado de Dados (LGPD)          |
| [PREENCHER] | E-mail do DPO (pode ser o mesmo de atendimento)|

Esses campos estao nos arquivos:
- `src/templates/partials/footer.html` (rodape — aparece em todas as paginas)
- `src/templates/pages/privacidade.html`
- `src/templates/pages/termos.html`
- `src/templates/pages/reembolso.html`

Apos editar, rode `npm run build` para regenerar as paginas HTML.

---

## PARTE 8 — CHECKLIST DE PRE-LANCAMENTO

- [ ] Dados legais preenchidos ([PREENCHER] do CNPJ, e-mails e DPO)
- [ ] Firebase configurado (Firestore + Auth + Security Rules publicadas)
- [ ] Variaveis de ambiente configuradas na Vercel
- [ ] `public/js/config.js` preenchido com credenciais reais do Firebase Web SDK
- [ ] `npm run build` executado com sucesso
- [ ] `npm run check` mostrando 0 erros
- [ ] Pelo menos um produto ativo cadastrado via painel admin
- [ ] Teste de compra completo: adicionar ao carrinho > finalizar > WhatsApp abre corretamente
- [ ] Dominio personalizado configurado (opcional)
- [ ] Google Analytics 4 ID configurado em `public/js/consent.js` (campo `GA_ID`)
- [ ] Fotos reais dos produtos cadastradas na galeria (pelo computador ou por link https)
- [ ] Verificar que banner de cookies aparece e bloqueia GA ate o aceite

---

## PARTE 9 — ESTRUTURA COMPLETA DE PASTAS

```
jb-imports/
|
+-- api/
|   +-- index.js                # Ponto de entrada Vercel Serverless
|
+-- docs/
|   +-- 01-requisitos-e-modelagem.md   # RF, RNF e diagrama de dados
|   +-- 02-guia-completo.md            # Este guia
|
+-- public/                     # Arquivos servidos ao navegador
|   +-- css/
|   |   +-- tokens.css          # Design tokens (cores, tipografia, espacamento)
|   |   +-- base.css            # Reset, acessibilidade, skip-link
|   |   +-- layout.css          # Header, footer, container, secoes
|   |   +-- components.css      # Botoes, formularios, modais, gaveta
|   |   +-- store.css           # Catalogo, produto, carrinho, contato
|   |   +-- legal.css           # Paginas legais (prose)
|   |   +-- admin.css           # Painel administrativo
|   |
|   +-- js/
|   |   +-- config.js           # Credenciais Firebase e constantes globais
|   |   +-- catalog.js          # Categorias, condicoes (mirror do servidor)
|   |   +-- cart.js             # Logica do carrinho (localStorage)
|   |   +-- whatsapp.js         # Montagem de URL e mensagem WhatsApp
|   |   +-- consent.js          # Banner de cookies + GA4 Consent Mode v2
|   |   +-- store-data.js       # Listener onSnapshot (tempo real)
|   |   +-- catalog-view.js     # Renderizacao do catalogo e filtros
|   |   +-- cart-view.js        # Gaveta do carrinho e fluxo de checkout
|   |   +-- contact.js          # Formulario de contato (WhatsApp only)
|   |   +-- main.js             # Inicializador e anuncio a11y de estoque
|   |   +-- fx.js               # Efeitos: grade de pontos, botoes magneticos, revelacao ao rolar
|   |   +-- lib/
|   |   |   +-- dom.js          # Helpers: h(), icon(), announce(), semAcento()
|   |   |   +-- firebase.js     # Inicializador lazy do Firebase Web SDK
|   |   +-- imagem.js       # Otimizacao de URLs do Cloudinary (WebP no tamanho pedido)
|   |   +-- admin/
|   |       +-- admin.js        # Painel admin: auth, CRUD, pedidos
|   |
|   +-- img/
|   |   +-- placeholder.svg     # Placeholder de produto (sem copyright)
|   |
|   +-- (gerado pelo build)
|   +-- index.html              # Pagina principal da loja
|   +-- admin/index.html        # Painel administrativo
|   +-- 404.html                # Pagina de erro 404
|   +-- privacidade.html        # Politica de Privacidade (LGPD)
|   +-- termos.html             # Termos de Servico
|   +-- reembolso.html          # Politica de Reembolso e Garantia (CDC)
|   +-- favicon.svg             # Icone do site
|   +-- robots.txt              # Instrucoes para buscadores
|
+-- scripts/
|   +-- build-pages.mjs         # Compilador de templates HTML
|   +-- seed.js                 # Popular Firestore com dados iniciais
|   +-- check-project.mjs       # Verificador automatizado do projeto
|
+-- src/
|   +-- app.js                  # App Express (middlewares + rotas)
|   |
|   +-- config/
|   |   +-- firebase.js         # Inicializador Firebase Admin SDK
|   |   +-- catalogo.js         # Categorias, condicoes, disponibilidade
|   |
|   +-- middleware/
|   |   +-- auth.js             # requireAdmin (verifica token + colecao admins)
|   |   +-- errors.js           # AppError, asyncHandler, errorHandler
|   |   +-- rateLimit.js        # Rate limiter em memoria por IP
|   |
|   +-- routes/
|   |   +-- index.js            # Monta todas as rotas
|   |   +-- produtos.routes.js  # GET /produtos (publico)
|   |   +-- pedidos.routes.js   # POST /pedidos (publico) + rotas admin
|   |
|   +-- controllers/
|   |   +-- produtos.controller.js
|   |   +-- pedidos.controller.js
|   |
|   +-- services/
|   |   +-- produtos.service.js  # Validacao + CRUD Firebase de produtos
|   |   +-- pedidos.service.js   # Criacao atomica de pedidos com transacao
|   |
|   +-- templates/
|       +-- layout.html          # Template base com placeholders
|       +-- pages/               # Uma pagina por arquivo (.html)
|       +-- partials/            # Fragmentos reutilizaveis (header, footer etc.)
|
+-- .env.example                 # Exemplo de variaveis de ambiente
+-- .gitignore                   # Arquivos ignorados pelo Git
+-- firestore.rules              # Regras de seguranca do Firestore
+-- package.json                 # Dependencias e scripts npm
+-- server.js                    # Servidor Node.js para Hostinger/local
+-- vercel.json                  # Configuracao da Vercel (build, rotas, headers)
```
