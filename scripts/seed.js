'use strict';

// Popula o Firestore com categorias, configuracoes e produtos de EXEMPLO.
// Os produtos sao criados INATIVOS e sem preco real: revise e ative pelo painel /admin.
// Uso: npm run seed   (requer .env com as credenciais do Firebase)

const { db, FieldValue } = require('../src/config/firebase');
const { CATEGORIAS, LIMITE_ULTIMAS_UNIDADES, POLITICA_VERSAO } = require('../src/config/catalogo');

const EXEMPLOS = [
  { nome: 'iPhone (modelo a definir) - seminovo', categoriaId: 'iphones', condicao: 'seminovo', procedencia: 'original', descricao: 'Exemplo de cadastro. Informe modelo, capacidade, cor, saúde da bateria e estado de conservação.' },
  { nome: 'Display para iPhone (modelo a definir)', categoriaId: 'displays', condicao: 'reposicao', procedencia: 'compativel', descricao: 'Exemplo de cadastro. Informe modelo compatível, tecnologia do painel e se acompanha ferramentas.' },
  { nome: 'Bateria para iPhone (modelo a definir)', categoriaId: 'baterias', condicao: 'reposicao', procedencia: 'compativel', descricao: 'Exemplo de cadastro. Informe modelo compatível e capacidade em mAh.' },
  { nome: 'Cabo USB-C para Lightning', categoriaId: 'cabos-fontes', condicao: 'novo', procedencia: 'compativel', descricao: 'Exemplo de cadastro. Informe comprimento, certificação (se houver) e potência suportada.' },
];

async function main() {
  const firestore = db();
  const batch = firestore.batch();
  const agora = FieldValue.serverTimestamp();

  for (const c of CATEGORIAS) {
    batch.set(firestore.collection('categorias').doc(c.id), { nome: c.nome, ordem: c.ordem, ativa: true });
  }

  batch.set(firestore.collection('configuracoes').doc('loja'), {
    whatsapp: '5581984543444',
    limiteUltimasUnidades: LIMITE_ULTIMAS_UNIDADES,
    versaoPolitica: POLITICA_VERSAO,
    atualizadoEm: agora,
  }, { merge: true });

  for (const e of EXEMPLOS) {
    batch.set(firestore.collection('produtos').doc(), {
      ...e,
      precoCentavos: 100,
      estoque: 0,
      disponibilidade: 'esgotado',
      garantiaLojaDias: 0,
      imagemUrl: '',
      imagemAlt: '',
      ativo: false,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  await batch.commit();
  console.log('Seed concluido: categorias, configuracoes/loja e produtos de exemplo (inativos).');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
