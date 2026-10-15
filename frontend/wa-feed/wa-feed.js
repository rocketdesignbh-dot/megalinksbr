/* WA Feed — conversa de grupo de ofertas do WhatsApp rolando sozinha, de baixo
   para cima, como alguém passando o dedo pela conversa.

   Uma fonte de conteúdo (MENSAGENS) e uma lógica de animação (linhaDoTempo +
   posicao) para as duas apresentações:
     - site:     WAFeed.auto(host, "site")  — relógio próprio, loop contínuo,
                 pausa fora da tela, respeita prefers-reduced-motion.
     - showreel: WAFeed.mount(host, "reel") — sem relógio; quem dirige é a
                 timeline do HyperFrames chamando feed.seek(t). Determinístico.

   Como a rolagem funciona: a lista de mensagens é renderizada 3 vezes em
   sequência dentro de uma janela de altura fixa (overflow:hidden) e o conjunto
   inteiro desloca por translateY. As "paradas" são mensagens que ficam
   centralizadas na tela; entre uma parada e outra a distância é percorrida em
   1-3 "puxadas" de dedo (acelera rápido, desacelera longo), com pequenas
   variações de distância, duração e intervalo vindas de um gerador com semente
   fixa — natural, mas idêntico a cada execução. No loop, a última parada é a
   primeira mensagem da cópia seguinte, exatamente H pixels abaixo; a posição é
   reduzida módulo H e a volta ao início não tem salto. */
(function (global) {
  "use strict";

  // Pasta deste script: as imagens são resolvidas a partir dela, então o mesmo
  // arquivo serve em /wa-feed/ no site e em ../../frontend/wa-feed/ no showreel.
  var BASE = (function () {
    var s = document.currentScript;
    return s && s.src ? s.src.replace(/[^\/?#]*([?#].*)?$/, "") : "";
  })();

  /* ---------------- conteúdo (fonte única) ----------------
     Produtos e preços das capturas de referência. Os links usam o encurtador da
     própria plataforma (o que o MegaLinksBR entrega de verdade) com códigos de
     demonstração — não são clicáveis. Nada de depoimento ou "testei e aprovei". */
  var MENSAGENS = [
    { id: "bomdia", tipo: "texto", hora: "08:30",
      texto: "Bom dia, grupo! ☀️\nAs ofertas de hoje começam agora 👇" },
    { id: "aspirador", tipo: "oferta", hora: "08:35", img: "img/aspirador.webp", w: 730, h: 740,
      titulo: "Aspirador de Pó e Água Electrolux 1400W Rodas 360° Preto e Azul",
      de: 459.80, por: 229.90, cupom: "LIMPEZA", cta: "🚀 Limitado! Corra antes que acabe.",
      loja: "Shopee", link: "k7Qe2" },
    { id: "mesas", tipo: "oferta", hora: "09:12", img: "img/mesas.webp", w: 744, h: 745,
      titulo: "Kit 3 Mesas Lateral Forma Orgânica – Perfeitas para Sala, Quarto ou Escritório",
      de: 169.31, por: 99.89, cta: "🎯 Envio imediato.", loja: "Shopee", link: "Mx4pT" },
    { id: "whey", tipo: "oferta", hora: "10:04", img: "img/whey.webp", w: 732, h: 745,
      titulo: "Whey Protein Concentrado 100% 900g Refil Dark Lab Sabor Cookies",
      de: 499.90, por: 149.90, cta: "💸 Cupom ativo SÓ HOJE — aproveita!",
      loja: "Mercado Livre", link: "W9hLa" },
    { id: "sofa", tipo: "oferta", hora: "11:20", img: "img/sofa.webp", w: 744, h: 730,
      titulo: "Sofá Retrátil e Reclinável 3 lugares com Molas 2,00m Livia Suede Adonai Estofados",
      de: 1594.46, por: 1179.90, cta: "🛒 Toque no link antes que esgote!",
      loja: "Shopee", link: "Sf2Rk" },
    { id: "aviso", tipo: "texto", hora: "11:21",
      texto: "⚠️ Preços podem mudar a qualquer momento." },
    { id: "pista", tipo: "oferta", hora: "12:40", img: "img/pista.webp", w: 740, h: 738,
      titulo: "Pista de Carrinho Brinquedo Estacionamento e Garagem De Carros De Corrida Diversas Peças e Carrinhos",
      de: 34.53, por: 22.79, cta: "🚀 Limitado! Corra antes que acabe.",
      loja: "Shopee", link: "Pt8Gc" },
    { id: "oleo", tipo: "oferta", hora: "13:15", img: "img/oleo.webp", w: 744, h: 735,
      titulo: "Matrix Food For Soft Óleo Capilar Hidratante, Com Ácido Hialurônico, 50ml",
      de: 108.00, por: 94.04, cta: "✨ Para cabelos secos.", loja: "Amazon", link: "Ol5Mz" }
  ];

  var GRUPO = {
    nome: "🔥 Mega Ofertas",
    membros: "Ana, Bruno, Carla, você",
    avatar: "🔥",
    relogio: "13:20"
  };

  /* ---------------- presets (tudo o que é ajustável) ----------------
     paradas: mensagens onde a rolagem para. pausa = segundos parada.
              desvio = px a mais para baixo (mensagem entra só parcialmente).
     velocidade: px/s de cada puxada; puxadaMax: px máximos por puxada;
     puxadaBase: duração mínima de uma puxada; intervalo: [min,max] entre puxadas;
     inicio: segundos parado antes da primeira puxada; loop; semente. */
  var PRESETS = {
    site: {
      loop: true, semente: 7, inicio: 0,
      velocidade: 680, puxadaMax: 420, puxadaBase: 0.45, intervalo: [0.12, 0.26],
      paradas: [
        { id: "aspirador", pausa: 2.1 },
        { id: "mesas", pausa: 1.7 },
        { id: "whey", pausa: 2.1 },
        { id: "sofa", pausa: 2.1 },
        { id: "pista", pausa: 1.7 },
        { id: "oleo", pausa: 1.7 }
      ]
    },
    reel: {
      loop: false, semente: 3, inicio: 1.1,
      velocidade: 1050, puxadaMax: 600, puxadaBase: 0.4, intervalo: [0.07, 0.15],
      paradas: [
        { id: "aspirador", pausa: 0, desvio: 250 },
        { id: "mesas", pausa: 0.9 },
        { id: "whey", pausa: 2.0 },     // destaque: a oferta que segura o olhar
        { id: "sofa", pausa: 0.5 },
        { id: "pista", pausa: 0.25 },
        { id: "oleo", pausa: 0.25 },
        { id: "aspirador", pausa: 0 }     // cópia seguinte: termina numa oferta forte
      ]
    }
  };

  /* ---------------- utilitários ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function brl(v) {
    var p = v.toFixed(2).split(".");
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
  }
  function semente(a) {               // mulberry32
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bezier(x1, y1, x2, y2) {   // cubic-bezier como no CSS
    function c(a1, a2) { return [3 * a1, 3 * (a2 - a1) - 3 * a1, 1 - 3 * a2 + 3 * a1]; }
    var cx = c(x1, x2), cy = c(y1, y2);
    function f(k, t) { return ((k[2] * t + k[1]) * t + k[0]) * t; }
    function df(k, t) { return (3 * k[2] * t + 2 * k[1]) * t + k[0]; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var e = f(cx, t) - x, d = df(cx, t);
        if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      if (t < 0 || t > 1 || Math.abs(f(cx, t) - x) > 1e-4) {   // fallback: bisseção
        var lo = 0, hi = 1; t = x;
        for (var j = 0; j < 30; j++) { if (f(cx, t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      }
      return f(cy, t);
    };
  }
  // Puxada de dedo: pega velocidade rápido e solta devagar (inércia).
  var PUXADA = bezier(0.32, 0, 0.12, 1);

  var ICON = {
    check: '<svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6l3 3 6-7.5M6.5 8.6l.9.9 6-7.5"/></svg>',
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    video: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/></svg>',
    fone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3.5h3.5l1.8 4.6-2.4 1.6a11 11 0 006.4 6.4l1.6-2.4 4.6 1.8V19a2 2 0 01-2 2A17 17 0 013 5.5a2 2 0 012-2z"/></svg>',
    mais: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>',
    sinal: '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>',
    wifi: '<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 008 .5 10.8 10.8 0 00.5 3.4l1.2 1.3A9 9 0 018 2.2zm0 3.5c1.4 0 2.8.5 3.8 1.5l1.2-1.3A7.3 7.3 0 008 4a7.3 7.3 0 00-5 1.9l1.2 1.3c1-1 2.4-1.5 3.8-1.5zM8 9.2l2.2-1.5a3.5 3.5 0 00-4.4 0z"/><circle cx="8" cy="10.6" r="1.3"/></svg>',
    bat: '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2.5" y="2.5" width="16" height="8" rx="1.8" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45"/></svg>',
    emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 007 0" stroke-linecap="round"/><circle cx="9" cy="9.8" r=".6" fill="currentColor"/><circle cx="15" cy="9.8" r=".6" fill="currentColor"/></svg>',
    clip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.8-7.8"/></svg>',
    cam: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 8.5A2 2 0 015 6.5h2.5L9 4.5h6l1.5 2H19a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.8"/></svg>',
    mic: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="8.5" y="2.5" width="7" height="12.5" rx="3.5"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    down: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7l6 6 6-6M6 13l6 6 6-6"/></svg>'
  };

  /* ---------------- render ---------------- */
  function textoOferta(m) {
    var pct = Math.round((1 - m.por / m.de) * 100);
    var l = [
      "🔥 OFERTA RELÂMPAGO 🔥",
      esc(m.titulo),
      "<s>De R$ " + brl(m.de) + "</s> por <span class=\"waf-p\">R$ " + brl(m.por) + "</span> <span class=\"waf-off\">(" + pct + "% OFF)</span>"
    ];
    if (m.cupom) l.push("🏷️ Use o cupom: " + esc(m.cupom));
    l.push("", esc(m.cta), "🛒 " + esc(m.loja),
      "Compre aqui 👉 <span class=\"waf-a\">https://megalinksbr.com.br/r/" + esc(m.link) + "</span>");
    return l.join("\n");
  }
  function meta(m) {
    return "<span class=\"waf-sp\"></span><span class=\"waf-meta\">" + esc(m.hora) + " " + ICON.check + "</span>";
  }
  function htmlMensagem(m) {
    if (m.tipo === "texto") {
      return "<div class=\"waf-m waf-txt\" data-id=\"" + m.id + "\"><div class=\"waf-b\"><div class=\"waf-t\">" +
        esc(m.texto) + meta(m) + "</div></div></div>";
    }
    return "<div class=\"waf-m\" data-id=\"" + m.id + "\"><div class=\"waf-b\">" +
      // altura inteira em px: layout sem frações mantém a emenda do loop exata
      "<div class=\"waf-media\" style=\"height:" + Math.round(294 * m.h / m.w) + "px\">" +
      "<img src=\"" + BASE + m.img + "\" width=\"" + m.w + "\" height=\"" + m.h + "\" alt=\"\" decoding=\"async\" draggable=\"false\"></div>" +
      "<div class=\"waf-t\">" + textoOferta(m) + meta(m) + "</div></div></div>";
  }
  function htmlTela(msgs, copias) {
    var lista = msgs.map(htmlMensagem).join("");
    var c = "";
    for (var i = 0; i < copias; i++) c += "<div class=\"waf-copy\">" + lista + "</div>";
    return "<div class=\"waf-stage\"><div class=\"waf-phone\"><div class=\"waf-screen\">" +
      "<div class=\"waf-status\"><span>" + GRUPO.relogio + "</span><span class=\"waf-status-i\">" + ICON.sinal + ICON.wifi + ICON.bat + "</span></div>" +
      "<div class=\"waf-head\"><span class=\"waf-back\">" + ICON.back + "</span><span class=\"waf-av\">" + GRUPO.avatar + "</span>" +
      "<span class=\"waf-ttl\"><b>" + esc(GRUPO.nome) + "</b><span>" + esc(GRUPO.membros) + "</span></span>" +
      "<span class=\"waf-acts\">" + ICON.video + ICON.fone + ICON.mais + "</span></div>" +
      "<div class=\"waf-chat\"><div class=\"waf-list\">" + c + "<div style=\"height:12px\"></div></div>" +
      "<span class=\"waf-down\">" + ICON.down + "</span></div>" +
      "<div class=\"waf-bar\"><div class=\"waf-box\">" + ICON.emoji + "<span>Mensagem</span>" + ICON.clip + ICON.cam + "</div>" +
      "<span class=\"waf-mic\">" + ICON.mic + "</span></div>" +
      "</div></div></div>";
  }

  /* ---------------- linha do tempo ----------------
     Retorna { segs:[{t0,t1,y0,y1,ease}], duracao, H }. Pura: só depende do
     layout medido e da configuração. */
  function linhaDoTempo(cfg, medida, msgs) {
    var rnd = semente(cfg.semente || 1);
    var ordem = msgs.map(function (m) { return m.id; });
    var paradas = cfg.paradas.slice();
    // loop: a volta termina na 1ª parada da cópia seguinte (H px abaixo)
    if (cfg.loop) paradas.push({ id: paradas[0].id, desvio: paradas[0].desvio, pausa: 0 });

    // Posição (translateY) de cada parada: mensagem centralizada na janela.
    var copia = 1, anterior = -1, ys = [];
    paradas.forEach(function (p) {
      var i = ordem.indexOf(p.id);
      if (i < 0) throw new Error("WAFeed: parada desconhecida " + p.id);
      if (i <= anterior) copia++;
      anterior = i;
      var r = medida.caixa(copia, p.id);
      ys.push(Math.max(0, r.top + r.h / 2 - medida.janela / 2 - (p.desvio || 0)));
    });
    if (cfg.loop) ys[ys.length - 1] = ys[0] + medida.H;   // emenda exata, sem arredondamento

    var segs = [], t = 0, y = ys[0];
    function seg(dur, y1, ease) { segs.push({ t0: t, t1: t + dur, y0: y, y1: y1, ease: ease }); t += dur; y = y1; }
    var pausa0 = (cfg.inicio || 0) + (paradas[0].pausa || 0);
    if (pausa0 > 0) seg(pausa0, y);

    for (var k = 1; k < paradas.length; k++) {
      var d = ys[k] - y, n = Math.max(1, Math.ceil(Math.abs(d) / cfg.puxadaMax));
      var pesos = [], soma = 0;
      for (var j = 0; j < n; j++) { var w = 0.82 + rnd() * 0.36; pesos.push(w); soma += w; }
      var alvo = y;
      for (j = 0; j < n; j++) {
        var dj = d * pesos[j] / soma;
        alvo = j === n - 1 ? ys[k] : alvo + dj;
        var dur = (cfg.puxadaBase + Math.abs(dj) / cfg.velocidade) * (0.94 + rnd() * 0.12);
        seg(dur, alvo, PUXADA);
        if (j < n - 1) seg(cfg.intervalo[0] + rnd() * (cfg.intervalo[1] - cfg.intervalo[0]), alvo);
      }
      seg(paradas[k].pausa || 0, y);
    }
    return { segs: segs.filter(function (s) { return s.t1 > s.t0; }), duracao: t, H: medida.H };
  }

  function posicao(tl, t, loop) {
    var s = tl.segs, n = s.length;
    if (!n) return 0;
    if (loop) t = ((t % tl.duracao) + tl.duracao) % tl.duracao;
    if (t <= s[0].t0) return s[0].y0;
    if (t >= s[n - 1].t1) return s[n - 1].y1;
    var lo = 0, hi = n - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (s[mid].t1 < t) lo = mid + 1; else hi = mid; }
    var g = s[lo], u = (t - g.t0) / (g.t1 - g.t0);
    return g.y0 + (g.y1 - g.y0) * (g.ease ? g.ease(u) : u);
  }

  /* ---------------- montagem ---------------- */
  function opcoes(o) {
    if (typeof o === "string") o = { preset: o };
    o = o || {};
    var base = PRESETS[o.preset || "site"], cfg = {};
    for (var k in base) cfg[k] = base[k];
    for (k in o) if (k !== "preset") cfg[k] = o[k];
    return cfg;
  }

  function mount(host, o) {
    var cfg = opcoes(o);
    var msgs = cfg.mensagens || MENSAGENS;
    host.classList.add("waf");
    host.innerHTML = htmlTela(msgs, 3);
    var stage = host.querySelector(".waf-stage");
    var chat = host.querySelector(".waf-chat");
    var list = host.querySelector(".waf-list");
    var copias = host.querySelectorAll(".waf-copy");
    var tl, tAtual = 0, ultimoY = null, ro = null;

    function escala() {
      var w = host.clientWidth;
      if (w) stage.style.setProperty("--waf-s", (w / 414).toFixed(5));
    }
    function medir() {
      // offsetTop é medido em px de layout: a escala do palco não interfere.
      tl = linhaDoTempo(cfg, {
        janela: chat.clientHeight,
        H: copias[1].offsetTop - copias[0].offsetTop,
        caixa: function (c, id) {
          var el = copias[c].querySelector("[data-id=\"" + id + "\"]");
          return { top: el.offsetTop, h: el.offsetHeight };
        }
      }, msgs);
      ctrl.duracao = tl.duracao;
    }
    function aplicar(y) {
      if (cfg.loop) y = tl.H + (((y - tl.H) % tl.H) + tl.H) % tl.H;  // volta sem salto
      if (y === ultimoY) return;
      ultimoY = y;
      list.style.transform = "translate3d(0," + (-y).toFixed(2) + "px,0)";
    }

    var ctrl = {
      el: host, config: cfg, duracao: 0,
      seek: function (t) { tAtual = t; aplicar(posicao(tl, t, cfg.loop)); return ctrl; },
      tempo: function () { return tAtual; },
      posicaoInicial: function () { return posicao(tl, 0, cfg.loop); },
      remedir: function () { medir(); ultimoY = null; ctrl.seek(tAtual); },
      destroy: function () { if (ro) ro.disconnect(); host.innerHTML = ""; host.classList.remove("waf", "is-static"); }
    };

    escala();
    medir();
    ctrl.seek(0);

    // escala acompanha o contêiner; altura das mensagens pode mudar quando a
    // fonte de emoji termina de carregar — remede e continua do mesmo instante.
    if (global.ResizeObserver) {
      var hPrev = list.offsetHeight;
      ro = new ResizeObserver(function () {
        escala();
        if (list.offsetHeight !== hPrev) { hPrev = list.offsetHeight; ctrl.remedir(); }
      });
      ro.observe(host); ro.observe(list);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ctrl.remedir(); });
    return ctrl;
  }

  /* ---------------- modo site: relógio próprio ----------------
     Roda só quando a seção está visível; com prefers-reduced-motion a conversa
     fica parada e vira rolável com o dedo/mouse. `botao` (opcional) alterna
     pausar/retomar (WCAG 2.2.2: conteúdo que se move sozinho precisa poder parar). */
  function auto(host, o, botao) {
    var feed = mount(host, o || "site");
    var raf = 0, visivel = false, pausado = false, ultimo = 0, t = 0;
    var mq = global.matchMedia ? global.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function quadro(agora) {
      var dt = ultimo ? Math.min((agora - ultimo) / 1000, 1 / 15) : 0;   // aba em 2º plano não pula
      ultimo = agora; t += dt;
      feed.seek(t);
      raf = requestAnimationFrame(quadro);
    }
    function sync() {
      var parado = !!(mq && mq.matches);
      host.classList.toggle("is-static", parado);
      if (parado) {
        var chat = host.querySelector(".waf-chat");
        if (!chat.dataset.pos) { chat.scrollTop = feed.posicaoInicial(); chat.dataset.pos = "1"; }
      }
      var rodar = visivel && !pausado && !parado;
      if (rodar && !raf) { ultimo = 0; raf = requestAnimationFrame(quadro); }
      if (!rodar && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (botao) {
        botao.hidden = parado;
        botao.setAttribute("aria-pressed", pausado ? "true" : "false");
        botao.textContent = pausado ? "Retomar demonstração" : "Pausar demonstração";
      }
    }
    if (global.IntersectionObserver) {
      new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(host);
    } else visivel = true;
    if (mq) (mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync));
    if (botao) botao.addEventListener("click", function () { pausado = !pausado; sync(); });
    sync();
    return feed;
  }

  global.WAFeed = {
    mensagens: MENSAGENS, grupo: GRUPO, presets: PRESETS,
    mount: mount, auto: auto, linhaDoTempo: linhaDoTempo, posicao: posicao
  };
})(window);
