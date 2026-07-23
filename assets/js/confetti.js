/**
 * Confeti ligero, sin librerias.
 *
 * Dibuja sobre un canvas a pantalla completa que se crea al vuelo y se
 * destruye al terminar. No bloquea la pagina: usa requestAnimationFrame y se
 * detiene solo. Respeta prefers-reduced-motion.
 */

const COLORES = ['#3FE0B0', '#2EE6A8', '#E8B84B', '#7BA7F0', '#F0A34B', '#FFFFFF'];

export function lanzarConfeti({ duracion = 2600, cantidad = 140 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function ajustar() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ajustar();

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // Dos chorros laterales, como en las galas
  const piezas = Array.from({ length: cantidad }, (_, i) => {
    const desdeIzq = i % 2 === 0;
    return {
      x: desdeIzq ? W() * 0.15 : W() * 0.85,
      y: H() * 0.42,
      vx: (desdeIzq ? 1 : -1) * (2.5 + Math.random() * 5),
      vy: -6 - Math.random() * 7,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.28,
      color: COLORES[(Math.random() * COLORES.length) | 0],
      vida: 1
    };
  });

  const inicio = performance.now();
  let raf = null;

  function frame(t) {
    const transcurrido = t - inicio;
    ctx.clearRect(0, 0, W(), H());

    let vivas = 0;

    for (const p of piezas) {
      p.vy += 0.22;          // gravedad
      p.vx *= 0.992;         // rozamiento
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      if (transcurrido > duracion * 0.55) {
        p.vida -= 0.016;
      }
      if (p.vida <= 0 || p.y > H() + 40) continue;
      vivas++;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.vida);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (vivas > 0 && transcurrido < duracion + 1200) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', ajustar);
      canvas.remove();
    }
  }

  window.addEventListener('resize', ajustar);
  raf = requestAnimationFrame(frame);
}
