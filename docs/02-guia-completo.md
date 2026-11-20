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
2. Acesse https://vercel.c om/new
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

## PARTE 5 — GESTAO DE IMAGENS (Cloudinary — Gratuito)

### 5.1 Criar Conta no Cloudinary

1. Acesse https://cloudinary.com e crie uma conta gratuita
2. O plano gratuito oferece 25 GB de armazenamento e 25 GB de transferencia/mes

### 5.2 Fazer Upload de Imagens

1. No dashboard do Cloudinary, va em "Media Library"
2. Clique em "Upload" e envie as fotos dos produtos
3. Apos o upload, clique na imagem e copie a "URL segura" (https://res.cloudinary.com/...)

### 5.3 Usar a URL no Produto

No painel admin da JB Imports:
- Ao cadastrar ou editar um produto
- Cole a URL do Cloudinary no campo "URL da Imagem"
- Voce pode otimizar adicionando transformacoes na URL:
  `https://res.cloudinary.com/SEU_CLOUD/image/upload/w_600,f_auto,q_auto/nome-da-imagem`

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
   - **URL da Imagem:** (URL do Cloudinary)
   - **Ativo:** marcado (sim)
5. Clique em "Salvar"
6. O produto aparece imediatamente na loja (sem reload)

---

## PARTE 7 — DADOS LEGAIS A PREENCHER

Antes de publicar a loja, preencha estes dados em todas as paginas:

| Placeholder                    | O que preencher                                   |
|--------------------------------|---------------------------------------------------|
| [PREENCHER RAZAO SOCIAL]       | Razao social da empresa (ex: JB Comercio LTDA)   |
| [INSERIR CNPJ]                 | CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)    |
| [PREENCHER ENDERECO COMPLETO]  | Rua, numero, bairro, cidade, CEP                  |
| [PREENCHER E-MAIL DE ATENDIMENTO] | E-mail de contato (ex: contato@jbimports.com.br)|
| [PREENCHER NOME DO ENCARREGADO]| Nome do DPO/Encarregado de Dados (LGPD)          |
| [PREENCHER E-MAIL DO ENCARREGADO] | E-mail do DPO (pode ser o mesmo de atendimento)|

Esses campos estao nos arquivos:
- `src/templates/partials/footer.html` (rodape — aparece em todas as paginas)
- `src/templates/pages/privacidade.html`
- `src/templates/pages/termos.html`
- `src/templates/pages/reembolso.html`

Apos editar, rode `npm run build` para regenerar as paginas HTML.

---

## PARTE 8 — CHECKLIST DE PRE-LANCAMENTO

- [ ] Dados legais preenchidos (CNPJ, Razao Social, Endereco, E-mail, DPO)
- [ ] Firebase configurado (Firestore + Auth + Security Rules publicadas)
- [ ] Variaveis de ambiente configuradas na Vercel
- [ ] `public/js/config.js` preenchido com credenciais reais do Firebase Web SDK
- [ ] `npm run build` executado com sucesso
- [ ] `npm run check` mostrando 0 erros
- [ ] Pelo menos um produto ativo cadastrado via painel admin
- [ ] Teste de compra completo: adicionar ao carrinho > finalizar > WhatsApp abre corretamente
- [ ] Dominio personalizado configurado (opcional)
- [ ] Google Analytics 4 ID configurado em `public/js/consent.js` (campo `GA_ID`)
- [ ] Imagens reais dos produtos enviadas ao Cloudinary e cadastradas nos produtos
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
|   |   +-- lib/
|   |   |   +-- dom.js          # Helpers: h(), icon(), announce(), semAcento()
|   |   |   +-- firebase.js     # Inicializador lazy do Firebase Web SDK
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
