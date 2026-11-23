import { firebaseReady, getApp, loadFirestore } from './lib/firebase.js';

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
