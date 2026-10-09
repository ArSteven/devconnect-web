import hljs from 'highlight.js/lib/core';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';

// Solo los lenguajes que se pueden publicar en DevConnect: el paquete completo pesa casi 1 MB.
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('php', php);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);

const GRAMATICA: Record<string, string> = {
  go: 'go', java: 'java', javascript: 'javascript', php: 'php', python: 'python', sql: 'sql',
  typescript: 'typescript', angular: 'typescript',
};

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML resaltado del código completo. highlight.js escapa el texto: no se inyecta nada. */
function resaltar(codigo: string, lenguaje: string): string {
  const gramatica = GRAMATICA[lenguaje];
  if (!gramatica) return escapar(codigo);
  try {
    return hljs.highlight(codigo, { language: gramatica, ignoreIllegals: true }).value;
  } catch {
    return escapar(codigo);
  }
}

/**
 * Resalta el código completo y lo parte en líneas, cerrando y reabriendo las etiquetas
 * que cruzan un salto (un comentario de varias líneas, por ejemplo). Así cada línea
 * se puede numerar o marcar en un diff sin perder los colores.
 */
export function resaltarLineas(codigo: string, lenguaje: string): string[] {
  const html = resaltar(codigo.replace(/\r\n?/g, '\n'), lenguaje);
  const lineas: string[] = [];
  const abiertas: string[] = [];
  let actual = '';
  for (const parte of html.split(/(<span[^>]*>|<\/span>|\n)/)) {
    if (!parte) continue;
    if (parte === '\n') {
      lineas.push(actual + '</span>'.repeat(abiertas.length));
      actual = abiertas.join('');
    } else if (parte.startsWith('<span')) {
      abiertas.push(parte);
      actual += parte;
    } else if (parte === '</span>') {
      abiertas.pop();
      actual += parte;
    } else {
      actual += parte;
    }
  }
  lineas.push(actual + '</span>'.repeat(abiertas.length));
  return lineas;
}
