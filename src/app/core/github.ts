/** Usuario de GitHub a partir de la URL del perfil ("https://github.com/laura" -> "laura"). */
export function usuarioGithub(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') return null;
    const usuario = u.pathname.split('/').filter(Boolean)[0] ?? '';
    // Nombres de usuario válidos en GitHub: letras, números y guiones, hasta 39.
    return /^[A-Za-z0-9-]{1,39}$/.test(usuario) ? usuario : null;
  } catch {
    return null;
  }
}

/** Foto pública de GitHub en el tamaño pedido (GitHub la sirve en cualquier tamaño con ?size=). */
export function fotoGithub(url: string | null | undefined, tamano: number): string | null {
  const usuario = usuarioGithub(url);
  return usuario ? `https://github.com/${usuario}.png?size=${Math.min(460, Math.round(tamano * 2))}` : null;
}

/** Iniciales para el avatar: "Laura Díaz Pérez" -> "LD". */
export function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
}
