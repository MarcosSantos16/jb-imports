# JB Imports — Requisitos e Modelagem de Dados

Versao: 1.0 | Data: 2026-11-19

---

## 1. REQUISITOS FUNCIONAIS (RF)

### RF-01 Catalogo Publico
- RF-01.1 Exibir produtos ativos agrupados por categoria (iPhones Novos, Seminovos, Displays, Baterias, Cabos e Fontes, Fones).
- RF-01.2 Permitir filtro por categoria, condicao (Novo / Seminovo / Peca) e busca por texto.
- RF-01.3 Exibir badge de disponibilidade ("Em estoque" / "Ultimas unidades" / "Esgotado") em tempo real via Firestore onSnapshot.
- RF-01.4 Desabilitar botao "Adicionar ao Carrinho" quando produto estiver esgotado.
- RF-01.5 Exibir painel lateral com contagem de estoque ao vivo por categoria.

### RF-02 Carrinho de Compras
- RF-02.1 Adicionar, remover e ajustar quantidade de itens (max 20 unid/item, max 20 itens distintos).
- RF-02.2 Calcular subtotal em tempo real com formatacao em BRL.
- RF-02.3 Persistir carrinho no localStorage (chave `jb_cart_v1`).
- RF-02.4 Exibir confirmacao de itens antes de finalizar pedido.

### RF-03 Finalizacao de Pedido
- RF-03.1 Coletar somente Nome e WhatsApp do cliente (dados minimos LGPD).
- RF-03.2 Exibir checkbox obrigatorio de aceite da Politica de Privacidade.
- RF-03.3 Enviar pedido para a API Node.js que reserva estoque atomicamente via transacao Firestore.
- RF-03.4 Em caso de conflito de estoque (HTTP 409), exibir quais itens ficaram indisponiveis e manter os demais no carrinho.
- RF-03.5 Redirecionar cliente para o WhatsApp oficial (+55 81 98454-3444) com resumo estruturado do pedido.
- RF-03.6 Campo honeypot anti-bot invisivel ao usuario.

### RF-04 Painel Administrativo (/admin)
- RF-04.1 Tela de login protegida por Firebase Authentication (e-mail/senha).
- RF-04.2 Verificar uid do admin na colecao `admins` apos login.
- RF-04.3 CRUD completo de produtos (criar, editar, ativar/desativar, excluir).
- RF-04.4 Galeria de fotos por produto: ate 8 fotos, com foto principal (primeira da lista), abrir, remover e reordenar pela principal.
- RF-04.4 Controle rapido de estoque com botoes +/- diretamente na listagem.
- RF-04.5 Listagem de pedidos com acoes: Concluir, Cancelar (restaura estoque) e Anonimizar (LGPD).
- RF-04.6 Logout que encerra sessao Firebase.

### RF-05 Conformidade Legal
- RF-05.1 Pagina `/privacidade.html` completa conforme LGPD (Lei 13.709/2018).
- RF-05.2 Pagina `/termos.html` com regras de uso e limitacoes de responsabilidade.
- RF-05.3 Pagina `/reembolso.html` alinhada ao CDC: direito de arrependimento 7 dias (art. 49), garantia 90 dias bens duraveis (art. 26 II).
- RF-05.4 Banner de cookies granular (Essenciais vs. Analiticos) bloqueando GA4 ate consentimento.
- RF-05.5 Google Analytics 4 com Consent Mode v2 (default: denied; update: granted so apos aceite).
- RF-05.6 Canal visivelmente acessivel para DPO/Encarregado de Dados em todas as paginas.
- RF-05.7 Dados legais da empresa no rodape (Razao Social, CNPJ, endereco, e-mail de atendimento).
- RF-05.8 Funcao de anonimizacao de pedido (exclusao de dados pessoais a pedido do titular, art. 18 LGPD).

---

## 2. REQUISITOS NAO FUNCIONAIS (RNF)

### RNF-01 Desempenho
- Tempo de carregamento inicial < 2 s em 4G (LCP).
- Atualizacao de estoque em tempo real sem reload de pagina (Firestore onSnapshot).
- Nenhuma fonte web externa (somente fontes de sistema) para evitar latencia de terceiros.

### RNF-02 Disponibilidade e Custo Zero
- Hospedagem: Vercel Hobby (gratuito) com exportacao para Hostinger Node.js sem reescrita.
- Banco de dados: Firebase Spark (gratuito) — Firestore + Authentication.
- Armazenamento de imagens: fotos enviadas do computador sao reduzidas no navegador (WebP, ate 60 KB) e gravadas no proprio produto no Firestore; tambem aceita links https externos. Sem Firebase Storage e sem Cloudinary obrigatorio.
- Infraestrutura: 100% gratuita na fase inicial.

### RNF-03 Seguranca
- Chaves Firebase Admin exclusivamente em variaveis de ambiente server-side (.env).
- Regras Firestore: clientes so leem produtos ativos; nenhuma escrita direta de cliente permitida.
- Verificacao de token JWT no middleware `requireAdmin` para toda rota /api/admin/*.
- Colecao `pedidos` bloqueada para leitura direta pelo cliente (privacidade dos dados).
- Rate limiting em memoria (10 req/10 min por IP) na rota de criacao de pedidos.
- Cabecalhos de seguranca HTTP via vercel.json e server.js (X-Frame-Options, Referrer-Policy, etc.).
- Content-Security-Policy restringindo scripts a origens confiaveis.

### RNF-04 Acessibilidade (WCAG 2.1 AA)
- HTML5 semantico: header, main, nav, section, article, footer.
- Link "Pular para o conteudo principal" (skip-link) em todas as paginas.
- Todos os elementos interativos 100% operaveis por teclado (Tab, Enter, Esc).
- Indicadores visuais de foco (:focus-visible, 3px solid accent, offset 2px).
- Regioes aria-live para anunciar alteracoes de estoque em tempo real para leitores de tela.
- Atributos alt descritivos e dinamicos em todas as imagens de produtos.
- Contraste minimo 4.5:1 em todos os pares texto/fundo (validado: minimo 13.44:1 atingido).
- prefers-reduced-motion respeitado em todas as animacoes CSS.

### RNF-05 Manutenibilidade
- Backend desacoplado em camadas: routes -> controllers -> services.
- Fonte de verdade unica para catalogos/categorias (src/config/catalogo.js espelhada em public/js/catalog.js).
- Build estatico automatizado via scripts/build-pages.mjs (templates compostos).
- Nenhuma dependencia de framework front-end; Vanilla JS ES6+ puro.
- Zero emojis em todo o codigo-fonte (verificado por scripts/check-project.mjs).

### RNF-06 Privacidade (LGPD)
- Coleta minima: apenas Nome e WhatsApp para finalizacao de pedido.
- Consentimento registrado no documento do pedido com timestamp e versao da politica.
- Nenhum dado de cartao, CPF ou informacao sensivel coletado.
- Anonimizacao de pedido disponivel para titular mediante solicitacao.

---

## 3. MODELAGEM DE DADOS — FIRESTORE (NoSQL)

```
FIRESTORE DATABASE
|
+-- [colecao] produtos
|   |
|   +-- {produtoId}  (string auto-gerado)
|       nome:          string        "iPhone 15 128GB Preto"
|       categoria:     string        "iphones" | "displays" | "baterias" | "cabos-fontes" | "fones"
|       condicao:      string        "novo" | "seminovo" | "reposicao"
|       procedencia:   string        "original" | "compativel" | "retirada-usada"
|       descricao:     string        Descricao tecnica detalhada (max 2000 chars)
|       preco:         number        Ex: 3499.90 (em reais)
|       estoque:       number        Ex: 5 (inteiro >= 0)
|       disponibilidade: string      "em-estoque" | "ultimas-unidades" | "esgotado"
|       imagens:       array         Ate 8 fotos: URL https:// ou foto local data:image/webp;base64 (max. 60 KB cada, 800 KB no total)
|       imagemUrl:     string | null Foto principal (primeira de imagens), mantida por compatibilidade
|       ativo:         boolean       true = visivel na loja; false = oculto
|       criadoEm:      timestamp     serverTimestamp() na criacao
|       atualizadoEm:  timestamp     serverTimestamp() em cada update
|
+-- [colecao] categorias
|   |
|   +-- {categoriaId}  (igual ao campo id, ex: "iphones")
|       id:            string        "iphones"
|       nome:          string        "iPhones"
|       ordem:         number        1-5 (ordena exibicao no catalogo)
|
+-- [colecao] pedidos
|   |
|   +-- {pedidoId}  (string auto-gerado; usado como numero do pedido JB-XXXXXX)
|       numero:        string        "JB-A1B2C3" (derivado do id)
|       status:        string        "reservado" | "concluido" | "cancelado"
|       cliente:       map
|         .nome:       string        Nome do cliente
|         .whatsapp:   string        "+5581XXXXXXXXX" (normalizado)
|       itens:         array<map>    Lista de itens do pedido
|         [].produtoId:   string     ID do produto
|         [].nome:        string     Nome snapshot
|         [].preco:       number     Preco snapshot no momento do pedido
|         [].quantidade:  number     Quantidade solicitada
|       subtotal:      number        Soma de (preco * quantidade)
|       consentimento: map
|         .aceito:         boolean   true (sempre true se pedido criado)
|         .versaoPolitica: string    Ex: "2026-11-18"
|         .em:             timestamp serverTimestamp() no momento do aceite
|       criadoEm:      timestamp     serverTimestamp()
|       atualizadoEm:  timestamp     serverTimestamp()
|
+-- [colecao] configuracoes
|   |
|   +-- loja  (documento fixo)
|       whatsapp:              string  "+5581984543444"
|       limiteUltimasUnidades: number  3
|       versaoPolitica:        string  "2026-11-18"
|
+-- [colecao] admins
    |
    +-- {uid}  (uid do Firebase Auth do administrador)
        email:   string    E-mail do admin (referencia)
        ativo:   boolean   true = sessao ativa; false = bloqueado
        criadoEm: timestamp
```

### Relacionamentos

```
                     RELACIONAMENTO LOGICO
                     (sem foreign keys explicitas — NoSQL por design)

[usuarios Firebase Auth]
        |
        | uid == documento em admins/{uid}
        v
[colecao admins]  <--- verifica requireAdmin middleware
        
[colecao produtos]
        |
        | produto.categoria == categoria.id
        v
[colecao categorias]  (lookup de metadata de exibicao)

[colecao pedidos]
        |
        | pedido.itens[].produtoId == produto ID
        v  (snapshot: dados copiados no momento da compra,
            independente de mudancas futuras no produto)
[colecao produtos]  (estoque decrementado atomicamente via Transaction)
```

### Fluxo de Transacao de Pedido

```
Cliente finaliza pedido
        |
        v
POST /api/pedidos
  -> validar campos (nome, whatsapp, itens, consentimento)
  -> verificar honeypot
  -> rate limit por IP
        |
        v
Firestore.runTransaction(tx => {
  1. tx.getAll(...refs de produtos)
  2. para cada item:
     - checar produto.ativo == true
     - checar produto.estoque >= quantidade
     - coleta problemas se falhar
  3. se problemas -> throw AppError 409
  4. senao:
     - decrementar estoque de cada produto
     - recalcular disponibilidade de cada produto
     - criar documento em pedidos/
})
        |
        v
Retorna { numero, subtotal, itens }
        |
        v
Front-end redireciona para WhatsApp
com mensagem formatada
```

---

## 4. INDICE DE SEGURANCA FIRESTORE (firestore.rules)

| Colecao       | Leitura publica    | Leitura admin | Escrita publica | Escrita admin |
|---------------|--------------------|---------------|-----------------|---------------|
| produtos      | apenas ativo==true | sim           | nao             | via API       |
| categorias    | sim                | sim           | nao             | via API       |
| configuracoes | sim                | sim           | nao             | via API       |
| pedidos       | nao                | sim           | nao             | via API       |
| admins        | apenas proprio uid | proprio uid   | nao             | manual console|

Toda escrita (criar produto, decrementar estoque, criar pedido) passa exclusivamente pela API Node.js com Firebase Admin SDK, que ignora as Security Rules.
