// Gera links de foto otimizados (WebP, largura certa) para o Cloudinary.
export function urlOtimizada(url, largura) {
  if (typeof url !== 'string') return '';
  const m = url.match(/^(.*\/image\/upload\/)(?:[^/]+\/)?(v\d+\/.*)$/);
  if (!m) return url;
  return `${m[1]}f_webp,q_auto,c_limit,w_${largura}/${m[2]}`;
}

export const ehCloudinary = (url) => typeof url === 'string' && url.includes('/image/upload/');
