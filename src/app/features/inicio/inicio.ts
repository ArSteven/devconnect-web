import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

type Autor = 'm' | 'a';

interface Linea {
  txt: string;
  autor?: Autor;
}

interface LineaVisible {
  n: number;
  txt: string;
  autor?: Autor;
  escribiendo: boolean;
  aceptada: boolean;
}

const NOMBRE: Record<Autor, string> = { m: '@mateo.go', a: '@andres.sql' };

// Código de @laura_dev con las propuestas de los dos compañeros intercaladas.
const CODIGO: Linea[] = [
  { txt: 'package main' },
  { txt: '' },
  { txt: 'func main() {' },
  { autor: 'a', txt: '    var wg sync.WaitGroup' },
  { autor: 'a', txt: '    wg.Add(1)' },
  { txt: '    go func() {' },
  { autor: 'a', txt: '        defer wg.Done()' },
  { txt: '        fmt.Println("hola")' },
  { txt: '    }()' },
  { autor: 'm', txt: '    time.Sleep(time.Second)' },
  { autor: 'a', txt: '    wg.Wait()' },
  { txt: '}' },
];

// Cuándo empieza a escribirse cada propuesta (en "ticks" de 65 ms).
const INICIO = 14;
const AGENDA: Record<number, number> = {};
let cursor = INICIO;
for (const i of [9]) { AGENDA[i] = cursor; cursor += CODIGO[i].txt.length + 16; }
for (const i of [3, 4, 6, 10]) { AGENDA[i] = cursor; cursor += CODIGO[i].txt.length + 5; }
const FIN = cursor;

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  protected auth = inject(AuthService);
  protected nombreDe(autor?: Autor): string {
    return autor ? NOMBRE[autor] : '';
  }

  protected t = signal(0);
  protected eleccion = signal<Autor | null>(null);

  protected decidiendo = computed(() => !this.eleccion() && this.t() >= FIN);

  protected lineas = computed<LineaVisible[]>(() => {
    const t = this.t();
    const eleccion = this.eleccion();
    const visibles: LineaVisible[] = [];
    let n = 0;
    CODIGO.forEach((l, i) => {
      if (!l.autor) {
        visibles.push({ n: ++n, txt: l.txt, escribiendo: false, aceptada: false });
        return;
      }
      if (eleccion && eleccion !== l.autor) return;
      const inicio = AGENDA[i];
      if (t < inicio) return;
      const k = Math.min(l.txt.length, t - inicio);
      visibles.push({
        n: ++n,
        txt: l.txt.slice(0, k),
        autor: l.autor,
        escribiendo: k < l.txt.length,
        aceptada: eleccion === l.autor,
      });
    });
    return visibles;
  });

  protected estado = computed(() => {
    const escribiendo = this.lineas().find(l => l.escribiendo);
    if (this.eleccion()) return { texto: 'cambio aceptado', clase: 'ok' };
    if (this.t() < INICIO) return { texto: '"lanzo la goroutine y no imprime nada"', clase: '' };
    if (escribiendo?.autor) return { texto: `${NOMBRE[escribiendo.autor]} está proponiendo un cambio…`, clase: escribiendo.autor };
    if (this.t() >= FIN) return { texto: '2 propuestas · ¿cuál aceptas?', clase: 'claro' };
    return { texto: 'esperando…', clase: '' };
  });

  constructor() {
    const reloj = setInterval(() => {
      if (this.t() < FIN + 5) this.t.update(v => v + 1);
    }, 65);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  elegir(autor: Autor): void {
    this.eleccion.set(autor);
  }

  repetir(): void {
    this.eleccion.set(null);
    this.t.set(0);
  }
}
