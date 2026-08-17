/* movil/estilos.js — CSS de la experiencia MÓVIL tipo exchange. Todo va
   scoped bajo #mv-app para NO afectar la web ni las secciones existentes.
   Paleta: negro/gris oscuro nuestro + dorado #E8B84B. Sin logos ajenos. */

let _puesto = false;

export function inyectarMovil() {
  if (_puesto || document.getElementById('mv-css')) { _puesto = true; return; }
  _puesto = true;
  const s = document.createElement('style');
  s.id = 'mv-css';
  s.textContent = `
  :root{
    --mv-bg:#0B0E11; --mv-bg2:#0f141a; --mv-card:#151b23; --mv-card2:#1b222c;
    --mv-line:#232b36; --mv-txt:#eaecef; --mv-mut:#8b96a3; --mv-mut2:#5b6472;
    --mv-gold:#E8B84B; --mv-gold-d:#c99a2e; --mv-up:#2ebd85; --mv-down:#f6465d;
  }
  #mv-app{position:fixed;inset:0;z-index:8000;background:var(--mv-bg);color:var(--mv-txt);
    font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    display:flex;flex-direction:column;overflow:hidden;-webkit-tap-highlight-color:transparent}
  #mv-app *{box-sizing:border-box}
  #mv-app button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}
  #mv-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;
    padding:0 16px calc(84px + env(safe-area-inset-bottom,0px));scrollbar-width:none}
  #mv-scroll::-webkit-scrollbar{display:none}

  /* ── Barra superior ── */
  .mv-top{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 8px}
  .mv-ava{width:38px;height:38px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
    background:linear-gradient(145deg,#1e2530,#12171e);border:1px solid var(--mv-line);overflow:hidden}
  .mv-ava svg{width:20px;height:20px;color:var(--mv-gold)}
  .mv-search{flex:1;display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;
    background:var(--mv-card);border:1px solid var(--mv-line);border-radius:20px;color:var(--mv-mut);font-size:14px;min-width:0}
  .mv-search svg{width:16px;height:16px;flex:0 0 auto;opacity:.8}
  .mv-search span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mv-ico-btn{width:38px;height:38px;flex:0 0 auto;display:grid;place-items:center;border-radius:12px;
    background:var(--mv-card);border:1px solid var(--mv-line);position:relative}
  .mv-ico-btn svg{width:19px;height:19px;color:var(--mv-txt)}
  .mv-ico-btn .mv-dot{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;
    background:var(--mv-down);color:#fff;font-size:10px;font-weight:700;border-radius:9px;display:grid;place-items:center}

  /* ── Balance ── */
  .mv-bal-lbl{display:flex;align-items:center;gap:7px;color:var(--mv-mut);font-size:13px;margin:14px 0 2px}
  .mv-bal-lbl svg{width:15px;height:15px;opacity:.8}
  .mv-bal{font-size:40px;font-weight:800;letter-spacing:-.5px;line-height:1.05}
  .mv-bal small{font-size:22px;color:var(--mv-mut);font-weight:700;margin-left:4px}
  .mv-bal-sub{color:var(--mv-mut);font-size:13px;margin-top:3px}
  .mv-bal-sub b{color:var(--mv-up)}

  /* ── CTAs principales ── */
  .mv-cta{display:flex;gap:12px;margin:16px 0 4px}
  .mv-cta button{flex:1;height:50px;border-radius:26px;font-size:16px;font-weight:800}
  .mv-cta .mv-primary{background:linear-gradient(180deg,#f2ca63,var(--mv-gold-d));color:#1a1200;
    box-shadow:0 6px 18px rgba(232,184,75,.22)}
  .mv-cta .mv-second{background:var(--mv-card2);color:var(--mv-txt);border:1px solid var(--mv-line)}

  /* ── Accesos rápidos (carrusel) ── */
  .mv-quick{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:20px -16px 6px;padding:0 16px}
  .mv-quick::-webkit-scrollbar{display:none}
  .mv-qi{flex:0 0 auto;width:72px;display:flex;flex-direction:column;align-items:center;gap:8px}
  .mv-qi .mv-qbox{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;position:relative;
    background:var(--mv-card);border:1px solid var(--mv-line)}
  .mv-qi .mv-qbox svg{width:24px;height:24px;color:var(--mv-txt)}
  .mv-qi:active .mv-qbox{background:var(--mv-card2)}
  .mv-qi span{font-size:11.5px;color:var(--mv-mut);text-align:center;line-height:1.2}
  .mv-qtag{position:absolute;top:-8px;right:-6px;background:var(--mv-gold);color:#1a1200;font-size:9px;
    font-weight:800;padding:1px 5px;border-radius:7px}
  .mv-dots{display:flex;justify-content:center;gap:5px;margin:8px 0 2px}
  .mv-dots i{width:14px;height:3px;border-radius:2px;background:var(--mv-line)}
  .mv-dots i.on{background:var(--mv-gold);width:20px}

  /* ── Franja/lista rotativa (promos) ── */
  .mv-strip{margin:16px 0 0;background:var(--mv-card);border:1px solid var(--mv-line);border-radius:16px;
    padding:14px 14px;display:flex;align-items:center;gap:12px;overflow:hidden}
  .mv-strip .mv-strip-ic{width:44px;height:44px;flex:0 0 auto;border-radius:12px;display:grid;place-items:center;
    background:linear-gradient(145deg,#1f2731,#141a21);border:1px solid var(--mv-line)}
  .mv-strip .mv-strip-ic svg{width:24px;height:24px;color:var(--mv-gold)}
  .mv-strip .mv-strip-tx{flex:1;min-width:0}
  .mv-strip .mv-strip-tx b{display:block;font-size:14.5px;font-weight:700}
  .mv-strip .mv-strip-tx small{display:block;color:var(--mv-mut);font-size:12px;margin-top:2px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mv-strip{position:relative}
  .mv-strip .mv-strip-count{position:absolute;top:8px;right:12px;font-size:11px;color:var(--mv-mut2);font-weight:700}
  .mv-strip .mv-strip-go{flex:0 0 auto;font-size:12px;font-weight:800;color:#1a1200;background:var(--mv-gold);
    padding:7px 13px;border-radius:20px}
  .mv-viewall{text-align:center;color:var(--mv-mut);font-size:13px;font-weight:600;padding:12px 0 2px}
  .mv-viewall b{color:var(--mv-gold)}

  /* ── Dos tarjetas rotativas ── */
  .mv-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0 0}
  .mv-tcard{background:var(--mv-card);border:1px solid var(--mv-line);border-radius:16px;padding:16px 14px;
    min-height:150px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;position:relative;overflow:hidden}
  .mv-tcard .mv-tc-ic{width:56px;height:56px;border-radius:14px;display:grid;place-items:center;
    background:linear-gradient(145deg,#20283300,#141a21);margin-top:4px}
  .mv-tcard .mv-tc-ic svg{width:32px;height:32px;color:var(--mv-gold)}
  .mv-tcard h4{font-size:14.5px;font-weight:800;margin:2px 0 0}
  .mv-tcard p{font-size:12px;color:var(--mv-mut);line-height:1.35;margin:0}
  .mv-tcard .mv-tc-kick{position:absolute;top:12px;left:14px;font-size:11px;font-weight:800;color:var(--mv-gold)}
  .mv-tdots{display:flex;gap:4px;position:absolute;bottom:10px;left:50%;transform:translateX(-50%)}
  .mv-tdots i{width:5px;height:5px;border-radius:50%;background:var(--mv-line)}
  .mv-tdots i.on{background:var(--mv-gold);width:16px;border-radius:3px}

  .mv-sec-h{display:flex;align-items:center;justify-content:space-between;margin:22px 0 10px}
  .mv-sec-h b{font-size:16px;font-weight:800}
  .mv-sec-h span{font-size:13px;color:var(--mv-gold);font-weight:600}

  /* ── Aviso conectar ── */
  .mv-connect{margin:16px 0 0;background:linear-gradient(180deg,#1a212b,#141a21);border:1px solid var(--mv-line);
    border-radius:16px;padding:18px 16px;text-align:center}
  .mv-connect p{margin:0 0 12px;color:var(--mv-mut);font-size:13.5px;line-height:1.45}
  .mv-connect b{color:var(--mv-txt)}
  .mv-connect button{height:46px;width:100%;border-radius:24px;font-weight:800;font-size:15px;
    background:linear-gradient(180deg,#f2ca63,var(--mv-gold-d));color:#1a1200}

  /* ── Barra inferior ── */
  #mv-nav{flex:0 0 auto;display:flex;background:var(--mv-bg2);border-top:1px solid var(--mv-line);
    padding:8px 4px calc(8px + env(safe-area-inset-bottom,0px))}
  #mv-nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:2px 0;color:var(--mv-mut2)}
  #mv-nav button svg{width:23px;height:23px}
  #mv-nav button span{font-size:11px;font-weight:600}
  #mv-nav button.on{color:var(--mv-gold)}

  /* ── Market (pantalla 2) ── */
  .mv-mk-tabs{display:flex;gap:18px;margin:6px 0 2px;font-size:17px;font-weight:800}
  .mv-mk-tabs button{color:var(--mv-mut);padding:6px 0;position:relative}
  .mv-mk-tabs button.on{color:var(--mv-txt)}
  .mv-mk-tabs button.on::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:2px;background:var(--mv-gold)}
  .mv-mk-cats{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:10px -16px 4px;padding:0 16px}
  .mv-mk-cats::-webkit-scrollbar{display:none}
  .mv-mk-cats button{flex:0 0 auto;font-size:13.5px;font-weight:700;color:var(--mv-mut);padding:7px 14px;
    border-radius:18px;background:var(--mv-card);border:1px solid var(--mv-line)}
  .mv-mk-cats button.on{color:var(--mv-gold);border-color:var(--mv-gold)}
  .mv-mk-sort{display:flex;align-items:center;justify-content:space-between;color:var(--mv-mut);font-size:12.5px;
    padding:12px 2px 6px;border-bottom:1px solid var(--mv-line)}
  .mv-row{display:flex;align-items:center;gap:12px;padding:13px 2px;border-bottom:1px solid var(--mv-line)}
  .mv-row:active{background:var(--mv-card)}
  .mv-row .mv-ci{width:34px;height:34px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;
    background:var(--mv-card2);border:1px solid var(--mv-line);font-weight:800;font-size:13px;overflow:hidden;position:relative}
  .mv-row .mv-ci img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
  .mv-row .mv-ci .ico-fb{color:var(--mv-gold)}
  .mv-row .mv-cn{flex:1;min-width:0}
  .mv-row .mv-cn b{font-size:15px;font-weight:700;display:block}
  .mv-row .mv-cn small{font-size:12px;color:var(--mv-mut);display:flex;align-items:center;gap:4px}
  .mv-row .mv-cn .mv-star{color:var(--mv-gold)}
  .mv-row .mv-cp{text-align:right;flex:0 0 auto}
  .mv-row .mv-cp b{font-size:15px;font-weight:700;display:block}
  .mv-row .mv-cp small{font-size:12.5px;font-weight:700}
  .mv-row .mv-cp small.up{color:var(--mv-up)} .mv-row .mv-cp small.dn{color:var(--mv-down)} .mv-row .mv-cp small.fl{color:var(--mv-mut)}
  .mv-empty{text-align:center;color:var(--mv-mut);padding:40px 20px;font-size:13.5px}

  /* ── Activos (pantalla 4) ── */
  .mv-acard{margin:12px 0 0;background:linear-gradient(180deg,#161d26,#12171e);border:1px solid var(--mv-line);
    border-radius:18px;padding:18px 16px}
  .mv-acard .mv-a-lbl{color:var(--mv-mut);font-size:13px;display:flex;align-items:center;gap:6px}
  .mv-acard .mv-a-bal{font-size:34px;font-weight:800;margin:6px 0 2px}
  .mv-aacts{display:flex;gap:10px;margin:16px 0 0}
  .mv-aacts button{flex:1;background:var(--mv-card2);border:1px solid var(--mv-line);border-radius:14px;
    padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--mv-txt)}
  .mv-aacts button svg{width:22px;height:22px;color:var(--mv-gold)}
  .mv-hold{display:flex;align-items:center;gap:12px;padding:15px 2px;border-bottom:1px solid var(--mv-line)}
  .mv-hold .mv-h-nm{flex:1;min-width:0} .mv-hold .mv-h-nm b{font-size:15px} .mv-hold .mv-h-nm small{display:block;color:var(--mv-mut);font-size:12px}
  .mv-hold .mv-h-am{text-align:right} .mv-hold .mv-h-am b{font-size:15px} .mv-hold .mv-h-am small{display:block;color:var(--mv-mut);font-size:12px}

  /* ── Bottom sheet (selector de gráfica) ── */
  #mv-sheet{position:fixed;inset:0;z-index:8500;display:flex;flex-direction:column;justify-content:flex-end}
  #mv-sheet .mv-sheet-bg{position:absolute;inset:0;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
  #mv-sheet .mv-sheet-card{position:relative;background:var(--mv-bg2);border-top-left-radius:22px;border-top-right-radius:22px;
    border:1px solid var(--mv-line);border-bottom:0;padding:18px 16px calc(20px + env(safe-area-inset-bottom,0px));animation:mvUp .22s ease}
  @keyframes mvUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
  #mv-sheet .mv-sheet-h{text-align:center;margin-bottom:12px}
  #mv-sheet .mv-sheet-h b{display:block;font-size:16px}
  #mv-sheet .mv-sheet-h span{display:block;color:var(--mv-mut);font-size:12.5px;margin-top:2px}
  #mv-sheet .mv-sheet-op{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--mv-card);
    border:1px solid var(--mv-line);border-radius:14px;padding:14px;margin-bottom:10px}
  #mv-sheet .mv-sheet-op svg{width:26px;height:26px;color:var(--mv-gold);flex:0 0 auto}
  #mv-sheet .mv-sheet-op b{display:block;font-size:15px}
  #mv-sheet .mv-sheet-op small{display:block;color:var(--mv-mut);font-size:12px;margin-top:1px}
  #mv-sheet .mv-sheet-op:active{background:var(--mv-card2)}
  #mv-sheet .mv-sheet-cancel{width:100%;background:var(--mv-card2);border:1px solid var(--mv-line);border-radius:14px;
    padding:14px;color:var(--mv-txt);font-weight:700;font-size:15px;margin-top:2px}

  /* ── Menú completo de servicios ── */
  #mv-menu{position:fixed;inset:0;z-index:8500;display:flex;flex-direction:column;justify-content:flex-end}
  #mv-menu .mv-menu-bg{position:absolute;inset:0;background:rgba(0,0,0,.55)}
  #mv-menu .mv-menu-card{position:relative;background:var(--mv-bg2);border-top-left-radius:22px;border-top-right-radius:22px;
    border:1px solid var(--mv-line);border-bottom:0;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));max-height:82vh;overflow-y:auto;animation:mvUp .22s ease}
  #mv-menu .mv-menu-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  #mv-menu .mv-menu-h b{font-size:17px;font-weight:800}
  #mv-menu .mv-menu-h button{color:var(--mv-mut);font-size:22px;line-height:1;padding:4px 8px}
  #mv-menu button,#mv-sheet button{background:none;border:0;color:inherit;font-family:inherit;cursor:pointer;box-shadow:none}
  #mv-menu .mv-menu-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 4px}
  #mv-menu .mv-mg-i{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border-radius:14px;background:none}
  #mv-menu .mv-mg-i:active{background:var(--mv-card)}
  #mv-menu .mv-mg-i .mv-mg-box{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:var(--mv-card);border:1px solid var(--mv-line)}
  #mv-menu .mv-mg-i .mv-mg-box svg{width:23px;height:23px;color:var(--mv-gold)}
  #mv-menu .mv-mg-i span{font-size:11.5px;color:var(--mv-mut);text-align:center;line-height:1.2}
  #mv-menu .mv-menu-sub{color:var(--mv-mut2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin:14px 4px 4px}
  `;
  document.head.appendChild(s);
}
