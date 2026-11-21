// Otimiza fotos hospedadas no Cloudinary: entrega WebP na largura pedida.
// Remove transformacoes anteriores, entao a mesma URL serve para qualquer tamanho.
// Links de outros sites nao passam por aqui: sem um servico intermediario, nao da para
// redimensionar ou converter essas imagens.
export function urlOtimizada(url, largura) {
  if (typeof url !== 'string') return '';
  const m = url.match(/^(.*\/image\/upload\/)(?:[^/]+\/)?(v\d+\/.*)$/);
  if (!m) return url;
  return `${m[1]}f_webp,q_auto,c_limit,w_${largura}/${m[2]}`;
}

export const ehCloudinary = (url) => typeof url === 'string' && url.includes('/image/upload/');
