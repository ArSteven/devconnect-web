/**
 * Las salas se abren en meet.jit.si en otra pestaña: embebidas, Jitsi las corta a los 5 minutos.
 * El nombre de la persona va en el fragmento (#), que nunca viaja al servidor de Jitsi en la URL.
 */
export function urlSala(sala: string, nombre?: string): string {
  const base = `https://meet.jit.si/${encodeURIComponent(sala)}`;
  if (!nombre) return base;
  // Jitsi lee los valores del fragmento como JSON: el nombre va entre comillas.
  return `${base}#userInfo.displayName=${encodeURIComponent(JSON.stringify(nombre))}`;
}
