// Camada de dados da vitrine: listener em tempo real (onSnapshot) dos produtos ativos.
// Qualquer alteracao feita no painel (estoque, preco, ativacao) chega aqui em instantes.
import { firebaseReady, getApp, loadFirestore } from './lib/firebase.js';

/**
 * @param {(produtos: object[], mudancas: object[]) => void} aoReceber
 * @param {(erro: Error) => void} aoFalhar
 * @returns {() => void} funcao que cancela a assinatura
 */
export function assinarProdutos(aoReceber, aoFalhar) {
  if (!firebaseReady()) {
    aoFalhar(new Error('firebase-nao-configurado'));
    return () => {};
  }

  let cancelar = () => {};
  let encerrado = false;

  (async () => {
    try {
      const [app, fs] = await Promise.all([getApp(), loadFirestore()]);
      if (encerrado) return;
      const db = fs.getFirestore(app);
      // A regra de seguranca so permite listar produtos com ativo == true.
      const consulta = fs.query(fs.collection(db, 'produtos'), fs.where('ativo', '==', true));
      cancelar = fs.onSnapshot(
        consulta,
        (snap) => {
          const produtos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const mudancas = snap.docChanges().map((c) => ({
            tipo: c.type,
            id: c.doc.id,
            dados: { id: c.doc.id, ...c.doc.data() },
          }));
          aoReceber(produtos, mudancas);
        },
        aoFalhar
      );
    } catch (erro) {
      aoFalhar(erro);
    }
  })();

  return () => {
    encerrado = true;
    cancelar();
  };
}
