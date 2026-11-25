/* ===========================================================================
   Atlas Housing — motion de la landing
   Lenis (scroll suave) + GSAP + ScrollTrigger. Valores de easing y duracion
   tomados de las mediciones del Taste vault (agentcard-sh, good-fella-com,
   mtioon-com):
     - familia de easing unica: expo.out  = cubic-bezier(.16, 1, .3, 1)
     - entradas por scroll: opacity 0 -> 1 + translateY ~22 px, 550-700 ms
     - escalonado de grillas: 50 ms
     - hovers: 150-200 ms (van por CSS)
     - scrub numerico (~1 s), nunca scrub: true
   Todo se apaga con prefers-reduced-motion.
   =========================================================================== */
(function () {
  "use strict";

  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hayGsap = typeof window.gsap !== "undefined";

  var EASE = "expo.out";
  var EASE_CORTO = "power2.inOut";   // para las salidas: entra y sale parejo
  var D = { corta: 0.3, media: 0.55, larga: 0.7 };

  /* --- menu mobile ------------------------------------------------------ */
  function menu() {
    var btn = document.querySelector(".menu-btn");
    var nav = document.getElementById("nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var abierta = nav.classList.toggle("nav--abierta");
      btn.setAttribute("aria-expanded", abierta ? "true" : "false");
      document.body.style.overflow = abierta ? "hidden" : "";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName !== "A") return;
      nav.classList.remove("nav--abierta");
      btn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  }

  /* --- cabezal -----------------------------------------------------------
     Una sola barra. Se esconde al bajar y vuelve al subir (como la web
     oficial de Atlas) y cambia de estilo segun lo que tenga detras: sobre el
     hero, sobre las secciones en tinta y sobre el cierre va transparente y en
     blanco; sobre el resto, vidrio esmerilado y tinta. */
  function cabezal() {
    var head = document.querySelector(".cabezal");
    var hero = document.querySelector(".hero");
    if (!head || !hero) return;
    var ultimo = window.scrollY;
    var oscuras = Array.prototype.slice.call(
      document.querySelectorAll(".seccion--tinta, .cierre, .hero"));

    function alScroll() {
      var y = window.scrollY;
      var alto = head.offsetHeight;

      // que hay detras de la barra
      var linea = y + alto * 0.6;
      var sobreOscuro = oscuras.some(function (s) {
        var top = s.getBoundingClientRect().top + y;
        return linea >= top && linea <= top + s.offsetHeight;
      });
      head.classList.toggle("cabezal--claro", sobreOscuro);
      head.classList.toggle("cabezal--fondo", !sobreOscuro && y > 40);

      // se esconde al bajar, vuelve al subir
      var bajando = y > ultimo && y - ultimo > 3;
      var subiendo = y < ultimo;
      if (y > hero.offsetHeight * 0.6) {
        if (bajando) head.classList.add("cabezal--oculto");
        if (subiendo) head.classList.remove("cabezal--oculto");
      } else {
        head.classList.remove("cabezal--oculto");
      }
      ultimo = y;
    }
    window.addEventListener("scroll", alScroll, { passive: true });
    alScroll();
  }

  /* --- filtros ----------------------------------------------------------
     Nada de FLIP: la grilla se reacomoda mientras todo esta invisible, asi no
     se ve el salto. Salen las que no entran, se recalcula el layout y entran
     las nuevas de abajo hacia arriba, escalonadas. */
  function filtros(raiz) {
    var caja = document.querySelector(raiz);
    if (!caja) return;
    var botones = caja.querySelectorAll("[data-filtro]");
    var piezas = Array.prototype.slice.call(caja.querySelectorAll("[data-f]"));
    var cuenta = caja.querySelector("[data-cuenta]");
    var grilla = caja.querySelector("[data-tope]");
    var tope = grilla ? parseInt(grilla.dataset.tope, 10) : 0;   // 0 = sin tope
    var mas = caja.querySelector("[data-mas]");
    var abierto = false;
    var actual = "todos";
    var animando = false;

    function cuales(valor) {
      var visibles = [];
      piezas.forEach(function (p) {
        var entra = valor === "todos" || (" " + p.dataset.f + " ").indexOf(" " + valor + " ") > -1;
        if (entra) visibles.push(p);
      });
      return tope && !abierto ? visibles.slice(0, tope) : visibles;
    }

    function pintarBotones(valor, total) {
      if (cuenta) cuenta.textContent = total;
      Array.prototype.forEach.call(botones, function (b) {
        b.setAttribute("aria-pressed", b.dataset.filtro === valor ? "true" : "false");
      });
      if (mas) {
        var todas = piezas.filter(function (p) {
          return valor === "todos" || (" " + p.dataset.f + " ").indexOf(" " + valor + " ") > -1;
        });
        mas.hidden = !tope || todas.length <= tope;
        mas.textContent = abierto ? "Ver menos" : "Ver las " + todas.length + " obras";
        mas.setAttribute("aria-expanded", abierto ? "true" : "false");
      }
    }

    function mostrar(lista) {
      piezas.forEach(function (p) {
        p.classList.toggle("obra--oculta", lista.indexOf(p) === -1);
      });
    }

    function aplicar(valor, animar) {
      if (animando) return;
      actual = valor;
      var lista = cuales(valor);
      var total = piezas.filter(function (p) {
        return valor === "todos" || (" " + p.dataset.f + " ").indexOf(" " + valor + " ") > -1;
      }).length;

      if (!animar || !hayGsap || quieto) {
        mostrar(lista);
        pintarBotones(valor, total);
        return;
      }

      var visiblesAhora = piezas.filter(function (p) { return !p.classList.contains("obra--oculta"); });
      animando = true;
      window.gsap.to(visiblesAhora, {
        opacity: 0, y: 10, duration: 0.22, ease: "power1.out",
        onComplete: function () {
          mostrar(lista);                       // el layout se rehace invisible
          pintarBotones(valor, total);
          window.gsap.set(lista, { opacity: 0, y: 24 });
          window.gsap.to(lista, {
            opacity: 1, y: 0, duration: D.media, ease: EASE, stagger: 0.045,
            onComplete: function () {
              window.gsap.set(lista, { clearProps: "opacity,transform" });
              animando = false;
              if (window.ScrollTrigger) window.ScrollTrigger.refresh();
            }
          });
        }
      });
    }

    Array.prototype.forEach.call(botones, function (b) {
      b.addEventListener("click", function () { abierto = false; aplicar(b.dataset.filtro, true); });
    });
    /* Ver mas / ver menos: no se rehace la grilla entera (eso dejaba la pantalla
       en blanco un segundo). Solo se tocan las que sobran: al abrir aparecen una
       por una debajo de las que ya estaban; al cerrar se van una por una y el
       scroll vuelve al principio de la seccion. */
    if (mas) {
      mas.addEventListener("click", function () {
        if (animando) return;
        var visibles = cuales(actual);                 // las que se ven ahora
        abierto = !abierto;
        var todas = cuales(actual);                    // con el tope levantado
        var extras = todas.filter(function (p) { return visibles.indexOf(p) === -1; });
        if (!abierto) {
          extras = visibles.filter(function (p) { return todas.indexOf(p) === -1; });
        }

        if (!hayGsap || quieto || !extras.length) {
          mostrar(todas);
          pintarBotones(actual, piezas.filter(function (p) {
            return actual === "todos" || (" " + p.dataset.f + " ").indexOf(" " + actual + " ") > -1;
          }).length);
          return;
        }

        animando = true;
        var total = piezas.filter(function (p) {
          return actual === "todos" || (" " + p.dataset.f + " ").indexOf(" " + actual + " ") > -1;
        }).length;

        if (abierto) {
          mostrar(todas);
          pintarBotones(actual, total);
          window.gsap.fromTo(extras, { opacity: 0, y: 28 }, {
            opacity: 1, y: 0, duration: D.media, ease: EASE, stagger: 0.07,
            onComplete: function () {
              window.gsap.set(extras, { clearProps: "opacity,transform" });
              animando = false;
              if (window.ScrollTrigger) window.ScrollTrigger.refresh();
            }
          });
        } else {
          window.gsap.to(extras, {
            opacity: 0, y: 18, duration: 0.3, ease: "power1.out", stagger: { each: 0.05, from: "end" },
            onComplete: function () {
              mostrar(todas);
              pintarBotones(actual, total);
              window.gsap.set(extras, { clearProps: "opacity,transform" });
              animando = false;
              caja.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
              if (window.ScrollTrigger) window.ScrollTrigger.refresh();
            }
          });
        }
      });
    }
    aplicar("todos", false);
  }

  /* --- FAQ: alto animado ------------------------------------------------ */
  function faq() {
    document.querySelectorAll(".pregunta").forEach(function (det) {
      var cuerpo = det.querySelector(".pregunta__r");
      if (!cuerpo) return;
      det.querySelector("summary").addEventListener("click", function (e) {
        if (quieto || !hayGsap) return;
        e.preventDefault();
        if (det.open) {
          window.gsap.to(cuerpo, {
            height: 0, duration: D.corta, ease: "power2.inOut",
            onComplete: function () { det.open = false; window.gsap.set(cuerpo, { height: "auto" }); }
          });
        } else {
          det.open = true;
          window.gsap.fromTo(cuerpo, { height: 0 }, { height: "auto", duration: D.media, ease: EASE });
        }
      });
    });
  }

  /* --- scroll suave (Lenis), enganchado al ticker de GSAP --------------- */
  function suavizar() {
    if (quieto || typeof window.Lenis === "undefined") return null;
    var lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
    lenis.on("scroll", function () {
      if (window.ScrollTrigger) window.ScrollTrigger.update();
    });
    window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    window.gsap.ticker.lagSmoothing(0);
    document.documentElement.style.scrollBehavior = "auto";
    return lenis;
  }

  /* --- motion con GSAP -------------------------------------------------- */
  function animar() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    var ST = window.ScrollTrigger;

    /* hero: entrada en secuencia, termina en ~1,8 s */
    var hero = document.querySelector(".hero");
    if (hero) {
      var tl = gsap.timeline({ defaults: { ease: EASE, duration: D.larga } });
      tl.from(".cabezal__logo", { opacity: 0, y: -14, duration: D.media }, 0)
        .from(".nav > *, .cabezal .btn", { opacity: 0, y: -10, duration: 0.4, stagger: 0.05 }, 0.1)
        .from(".hero__rotulo", { opacity: 0, y: 16 }, 0.25)
        .from(".hero h1 strong", { opacity: 0, y: 34 }, 0.35)
        .from(".hero h1 span", { opacity: 0, y: 28 }, 0.45)
        .from(".hero__bajada", { opacity: 0, y: 22 }, 0.65)
        .from(".hero__botones > *", { opacity: 0, y: 18, stagger: 0.06 }, 0.8)
        .from(".redes a", { opacity: 0, x: 14, stagger: 0.05 }, 0.85)
        .from(".hero__fondo img", { scale: 1.08, duration: 1.8, ease: "power2.out" }, 0);
    }

    /* Entradas y salidas: todo entra al aparecer y se va cuando deja la
       pantalla, en cualquiera de las dos direcciones (toggleActions). */
    var IDA_VUELTA = "play reverse play reverse";

    gsap.utils.toArray("[data-sube]").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: D.larga, ease: EASE,
        scrollTrigger: {
          trigger: el, start: "top 88%", end: "bottom 8%", toggleActions: IDA_VUELTA
        }
      });
    });

    /* grillas: un solo disparador por grilla, escalonado parejo de 50 ms */
    gsap.utils.toArray("[data-cascada]").forEach(function (grilla) {
      var hijos = grilla.querySelectorAll(":scope > *");
      // las grillas con filtro entran una sola vez: despues las maneja el filtro
      var conFiltro = !!grilla.closest("#modelos, #obras");
      gsap.set(hijos, { opacity: 0, y: 22 });
      gsap.to(hijos, {
        opacity: 1, y: 0, duration: D.media, ease: EASE, stagger: 0.05,
        scrollTrigger: conFiltro
          ? { trigger: grilla, start: "top 86%", once: true }
          : { trigger: grilla, start: "top 86%", end: "bottom 8%", toggleActions: IDA_VUELTA }
      });
    });

    /* fotos: entran de abajo hacia arriba y acompanan el scroll con un parallax corto */
    gsap.utils.toArray("[data-foto]").forEach(function (caja) {
      var img = caja.querySelector("img");
      gsap.fromTo(caja, { opacity: 0, y: 32 }, {
        opacity: 1, y: 0, duration: D.larga, ease: EASE,
        scrollTrigger: {
          trigger: caja, start: "top 90%", end: "bottom 8%", toggleActions: IDA_VUELTA
        }
      });
      if (img) {
        gsap.fromTo(img, { yPercent: -4 }, {
          yPercent: 4, ease: "none",
          scrollTrigger: { trigger: caja, start: "top bottom", end: "bottom top", scrub: 1 }
        });
      }
    });

    /* deriva: el bloque sube un poco mientras baja el scroll y vuelve al subir.
       Va atado al scroll (scrub), asi que es reversible por definicion. */
    gsap.utils.toArray("[data-deriva]").forEach(function (caja) {
      gsap.fromTo(caja, { y: 0 }, {
        // en mobile el texto va debajo de la foto: con todo el recorrido se despegaba de los datos
        y: function () { return window.innerWidth < 768 ? -24 : -Math.min(window.innerHeight * 0.13, window.innerWidth * 0.068, 130); },
        ease: "none",
        scrollTrigger: {
          trigger: caja.closest("section") || caja,
          start: "top bottom", end: "bottom top", scrub: 1,
          invalidateOnRefresh: true
        }
      });
    });

    /* frases que se pintan palabra por palabra con el scroll */
    gsap.utils.toArray(".pintar").forEach(function (frase) {
      var palabras = frase.querySelectorAll("span");
      if (!palabras.length) return;
      ST.create({
        trigger: frase, start: "top 80%", end: "bottom 55%", scrub: 0.6,
        onUpdate: function (self) {
          var corte = Math.round(self.progress * palabras.length);
          for (var i = 0; i < palabras.length; i++) {
            palabras[i].classList.toggle("on", i < corte);
          }
        }
      });
    });

    /* la tarjeta de "Todo lo que incluye" se expande al entrar */
    gsap.utils.toArray("[data-expande]").forEach(function (caja) {
      gsap.fromTo(caja, { scale: 0.9, y: 40, opacity: 0.35 }, {
        scale: 1, y: 0, opacity: 1, ease: "none",
        scrollTrigger: { trigger: caja, start: "top 95%", end: "top 45%", scrub: 0.6 }
      });
    });

    /* entrada de abajo hacia arriba, uno despues del otro (los dos brochures) */
    gsap.utils.toArray("[data-entra]").forEach(function (caja) {
      gsap.to(caja.children, {
        opacity: 1, y: 0, duration: D.larga, ease: EASE, stagger: 0.16,
        scrollTrigger: {
          trigger: caja, start: "top 86%", end: "bottom 8%", toggleActions: IDA_VUELTA
        }
      });
    });

    /* cifras: cuentan la primera vez que entran, a ritmo medio */
    gsap.utils.toArray("[data-contar]").forEach(function (el) {
      var fin = parseFloat(el.dataset.contar.replace(/\./g, "").replace(",", "."));
      var miles = el.dataset.contar.indexOf(".") > -1;
      var dec = (el.dataset.dec | 0);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: fin, duration: 1.9, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onUpdate: function () {
          var n = obj.v.toFixed(dec);
          if (miles) n = Number(n).toLocaleString("es-AR", { maximumFractionDigits: dec });
          el.textContent = n.replace(".", dec ? "," : ".");
        },
        onComplete: function () {
          el.textContent = el.dataset.contar;
        }
      });
    });
  }

  /* --- plano de planta: un solo <dialog> con las 12 laminas adentro ------ */
  function planos(lenis) {
    var dlg = document.getElementById("plano");
    if (!dlg) return;
    var caja = dlg.querySelector(".plano__caja");
    var cerrar = dlg.querySelector(".plano__cerrar");
    var laminas = dlg.querySelectorAll(".plano__lam");
    var gsap = window.gsap;
    var anima = !!gsap && !quieto;
    var volver = null;
    var tl = null;
    var yendose = false;

    function partes(lam) {
      // en el orden en que entran: rotulo, titulo, bajada, datos, dibujo, pie
      return Array.prototype.slice.call(lam.querySelectorAll("[data-pl]"))
        .sort(function (a, b) { return a.dataset.pl - b.dataset.pl; });
    }

    /* entrada escalonada: primero el fondo, despues la caja, y recien ahi el
       contenido de arriba hacia abajo. El dibujo entra con un respiro. */
    function entrar(lam) {
      if (tl) tl.kill();
      var p = partes(lam);
      tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, 0)
        .fromTo(caja, { yPercent: 2.5, scale: 0.985 },
                { yPercent: 0, scale: 1, duration: 0.62 }, 0)
        .fromTo(p, { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 }, 0.14)
        .fromTo(lam.querySelector(".plano__dibujo img"),
                { opacity: 0, scale: 1.04 },
                { opacity: 1, scale: 1, duration: 0.7 }, 0.34);
      return tl;
    }

    /* salida: al reves y mas rapido. El dialogo se cierra recien al terminar. */
    function salir() {
      if (yendose) return;
      var lam = dlg.querySelector(".plano__lam:not([hidden])");
      if (!anima || !lam) { dlg.close(); return; }
      yendose = true;
      if (tl) tl.kill();
      var p = partes(lam).reverse();
      tl = gsap.timeline({
        defaults: { ease: EASE_CORTO },
        onComplete: function () { yendose = false; dlg.close(); }
      });
      tl.to(p, { opacity: 0, y: -10, duration: 0.26, stagger: 0.035 }, 0)
        .to(caja, { yPercent: 1.5, scale: 0.99, duration: 0.34 }, 0.04)
        .to(dlg, { opacity: 0, duration: 0.26, ease: "none" }, 0.12);
    }

    function abrir(clave, disparador) {
      var elegida = null;
      for (var i = 0; i < laminas.length; i++) {
        var esta = laminas[i].dataset.plano === clave;
        laminas[i].hidden = !esta;
        if (esta) elegida = laminas[i];
      }
      if (!elegida) return;
      volver = disparador || null;
      // el <dialog> modal ya frena el scroll nativo; el suave de Lenis no se
      // entera, asi que hay que pararlo a mano. Tocar overflow del html ademas
      // esconderia la barra y correria la pagina 15 px.
      if (lenis) lenis.stop();
      caja.scrollTop = 0;
      dlg.showModal();
      if (anima) entrar(elegida);
    }

    dlg.addEventListener("close", function () {
      if (tl) { tl.kill(); tl = null; }
      yendose = false;
      if (anima) gsap.set([dlg, caja], { clearProps: "all" });
      if (lenis) lenis.start();
      if (volver) { volver.focus(); volver = null; }
    });

    // Escape: el navegador cierra de una, asi que se le gana de mano para que
    // la salida tambien se anime
    dlg.addEventListener("cancel", function (ev) {
      if (!anima || yendose) return;
      ev.preventDefault();
      salir();
    });

    // clic fuera de la caja: el <dialog> ocupa toda la pantalla, asi que el
    // click llega al propio dialog cuando cae en el fondo
    dlg.addEventListener("click", function (ev) {
      if (ev.target === dlg) salir();
    });
    cerrar.addEventListener("click", salir);

    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-planta]");
      if (!btn) return;
      ev.preventDefault();
      abrir(btn.dataset.planta, btn);
    });
  }

  /* --- arranque --------------------------------------------------------- */
  function iniciar() {
    menu();
    cabezal();
    filtros("#modelos");
    filtros("#obras");
    faq();

    // el <head> ya puso .js-motion para que nada parpadee antes de animar;
    // si GSAP no cargo o el usuario pide menos movimiento, se saca y todo queda visible.
    var lenis = null;
    if (hayGsap && !quieto) {
      lenis = suavizar();
      animar();
    } else {
      document.documentElement.classList.remove("js-motion");
    }
    planos(lenis);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
