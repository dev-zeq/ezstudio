/* ============================================================
   EzStudio — app.js
   JavaScript puro (sem frameworks).
   Tudo é progressivo: se algo falhar, o site continua usável.
   Animações respeitam "prefers-reduced-motion".
   ============================================================ */

(function () {
  'use strict';

  // Atalho seguro para selecionar elementos
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // O usuário pediu menos movimento? (acessibilidade)
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     1. ANO ATUAL NO RODAPÉ
     ---------------------------------------------------------- */
  const anoEl = $('#year');
  if (anoEl) anoEl.textContent = new Date().getFullYear();


  /* ----------------------------------------------------------
     2. TEMA CLARO / ESCURO (com memória no navegador)
     ---------------------------------------------------------- */
  const html        = document.documentElement;
  const btnTema      = $('#themeToggle');
  const iconeTema    = $('#themeIcon');

  // Aplica um tema e atualiza o ícone
  function aplicarTema(tema) {
    html.setAttribute('data-theme', tema);
    if (iconeTema) iconeTema.classList.toggle('is-dark', tema === 'dark');
  }

  // Lê preferência salva (se houver). try/catch porque alguns
  // navegadores bloqueiam o localStorage em modo privado.
  let temaSalvo = null;
  try { temaSalvo = localStorage.getItem('ez-tema'); } catch (e) { /* ignora */ }

  if (temaSalvo) {
    aplicarTema(temaSalvo);
  } else {
    // Sem preferência salva → segue o sistema operacional do visitante
    const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    aplicarTema(sistemaEscuro ? 'dark' : 'light');
  }

  if (btnTema) {
    btnTema.addEventListener('click', () => {
      const novo = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      aplicarTema(novo);
      try { localStorage.setItem('ez-tema', novo); } catch (e) { /* ignora */ }
    });
  }


  /* ----------------------------------------------------------
     3. EFEITOS DE SCROLL (header, barra de progresso, botão flutuante)
        Tudo num único listener "leve", controlado por requestAnimationFrame
        para não pesar no celular.
     ---------------------------------------------------------- */
  const header   = $('#siteHeader');
  const progresso = $('#scrollProgress');
  const waFloat   = $('#waFloat');
  let ticking = false;

  function aoRolar() {
    const y = window.scrollY || window.pageYOffset;

    // 3a. Sombra/borda no cabeçalho depois de rolar um pouco
    if (header) header.classList.toggle('scrolled', y > 8);

    // 3b. Barra de progresso de leitura (0% → 100%)
    if (progresso) {
      const altura = document.documentElement.scrollHeight - window.innerHeight;
      const pct = altura > 0 ? (y / altura) * 100 : 0;
      progresso.style.width = pct + '%';
    }

    // 3c. Botão flutuante do WhatsApp aparece após sair do topo
    if (waFloat) waFloat.classList.toggle('show', y > 600);

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(aoRolar);
      ticking = true;
    }
  }, { passive: true });

  aoRolar(); // executa uma vez ao carregar (caso a página abra rolada)


  /* ----------------------------------------------------------
     4. REVEAL ON SCROLL — elementos surgem suavemente ao entrar na tela
        Usa IntersectionObserver (nativo). Com "reduzir movimento",
        o CSS já deixa tudo visível, então aqui só revelamos sem drama.
     ---------------------------------------------------------- */
  const alvosReveal = $$('.reveal');

  if ('IntersectionObserver' in window && !reduzMovimento) {
    const obs = new IntersectionObserver((entradas, observador) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible');
          observador.unobserve(entrada.target); // anima só uma vez
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    alvosReveal.forEach((el) => obs.observe(el));
  } else {
    // Sem suporte ou movimento reduzido → mostra tudo imediatamente
    alvosReveal.forEach((el) => el.classList.add('visible'));
  }


  /* ----------------------------------------------------------
     5. BARRAS DE QUALIDADE — preenchem quando a seção aparece
     ---------------------------------------------------------- */
  const cartaoQualidade = $('.quality-card');

  function preencherBarras() {
    $$('.progress-list b').forEach((b) => {
      const largura = b.getAttribute('data-width');
      if (largura) b.style.width = largura;
    });
  }

  if (cartaoQualidade) {
    if ('IntersectionObserver' in window && !reduzMovimento) {
      const obsBarras = new IntersectionObserver((entradas, observador) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            preencherBarras();
            observador.disconnect();
          }
        });
      }, { threshold: 0.3 });
      obsBarras.observe(cartaoQualidade);
    } else {
      preencherBarras(); // movimento reduzido → preenche direto
    }
  }


  /* ----------------------------------------------------------
     6. UTILITÁRIOS DE FOCO E TRAVA DE ROLAGEM
        (compartilhados pelo menu mobile e pelos modais)
     ---------------------------------------------------------- */
  const SELETOR_FOCAVEL =
    'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])';

  // Mantém o foco "preso" dentro de um elemento (Tab e Shift+Tab)
  function prenderFoco(container, evento) {
    const focaveis = $$(SELETOR_FOCAVEL, container).filter((el) => el.offsetParent !== null);
    if (focaveis.length === 0) return;

    const primeiro = focaveis[0];
    const ultimo   = focaveis[focaveis.length - 1];

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  let travas = 0; // conta quantas coisas estão "abertas" travando o scroll
  function travarScroll()   { travas++; document.body.style.overflow = 'hidden'; }
  function destravarScroll() {
    travas = Math.max(0, travas - 1);
    if (travas === 0) document.body.style.overflow = '';
  }


  /* ----------------------------------------------------------
     7. MENU MOBILE (abrir / fechar / acessibilidade)
     ---------------------------------------------------------- */
  const menu       = $('#mobileMenu');
  const btnMenu     = $('#menuButton');
  const btnFechar   = $('#menuClose');
  let focoAnteriorMenu = null;

  function abrirMenu() {
    if (!menu) return;
    focoAnteriorMenu = document.activeElement;
    menu.classList.add('open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'true');
    travarScroll();
    // Leva o foco para o primeiro item do menu
    const primeiro = $(SELETOR_FOCAVEL, menu);
    if (primeiro) primeiro.focus();
  }

  function fecharMenu() {
    if (!menu) return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    destravarScroll();
    if (focoAnteriorMenu) focoAnteriorMenu.focus(); // devolve o foco ao botão
  }

  if (btnMenu)   btnMenu.addEventListener('click', abrirMenu);
  if (btnFechar) btnFechar.addEventListener('click', fecharMenu);

  // Clicar em qualquer link do menu também fecha
  if (menu) {
    $$('a', menu).forEach((link) => link.addEventListener('click', fecharMenu));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') prenderFoco(menu, e);
    });
  }


  /* ----------------------------------------------------------
     8. MODAIS DE PROJETO (mini cases do portfólio)
     ---------------------------------------------------------- */
  let modalAberto   = null;
  let focoAnteriorModal = null;

  function abrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    focoAnteriorModal = document.activeElement;
    modal.hidden = false; // o CSS anima a entrada (popIn) ao reaparecer
    modalAberto = modal;
    travarScroll();

    // Foca o painel (que tem tabindex="-1")
    const painel = $('.case-panel', modal);
    if (painel) painel.focus();
  }

  function fecharModal() {
    if (!modalAberto) return;
    modalAberto.hidden = true;
    destravarScroll();
    if (focoAnteriorModal) focoAnteriorModal.focus(); // devolve o foco ao card
    modalAberto = null;
  }

  // Botões "Detalhes" abrem o modal correspondente
  $$('[data-modal]').forEach((btn) => {
    btn.addEventListener('click', () => abrirModal(btn.getAttribute('data-modal')));
  });

  // Qualquer elemento com [data-close] (X e fundo escuro) fecha
  $$('[data-close]').forEach((el) => {
    el.addEventListener('click', fecharModal);
  });

  // Prender o foco dentro do modal aberto ao usar Tab
  document.addEventListener('keydown', (e) => {
    if (modalAberto && e.key === 'Tab') prenderFoco(modalAberto, e);
  });


  /* ----------------------------------------------------------
     9. TECLA ESC — fecha o que estiver aberto (modal tem prioridade)
     ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalAberto) {
      fecharModal();
    } else if (menu && menu.classList.contains('open')) {
      fecharMenu();
    }
  });


  /* ----------------------------------------------------------
     10. ROLAGEM SUAVE para links internos (#secao)
         Só se o navegador não fizer sozinho e sem mov. reduzido.
     ---------------------------------------------------------- */
  if (!reduzMovimento) {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        const destino = document.querySelector(id);
        if (destino) {
          e.preventDefault();
          destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }


  /* ----------------------------------------------------------
     11 + 12. MICROINTERAÇÕES PREMIUM (discretas)
        Só rodam em dispositivos com mouse de verdade (pointer fino)
        e quando o visitante NÃO pediu menos movimento.
     ---------------------------------------------------------- */
  const pointerFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (pointerFino && !reduzMovimento) {

    // 11. Leve inclinação do prisma seguindo o mouse
    const prisma = $('.prism-svg');
    const heroSec = $('.hero');
    if (prisma && heroSec) {
      let rafTilt = null;
      heroSec.addEventListener('mousemove', (e) => {
        const r = heroSec.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width  - 0.5; // -0.5 → 0.5
        const py = (e.clientY - r.top)  / r.height - 0.5;
        if (rafTilt) cancelAnimationFrame(rafTilt);
        rafTilt = requestAnimationFrame(() => {
          // ângulos pequenos = efeito sutil e elegante
          prisma.style.setProperty('--pry', (px * 10).toFixed(2) + 'deg');
          prisma.style.setProperty('--prx', (-py * 8).toFixed(2) + 'deg');
        });
      });
      // Ao tirar o mouse, o prisma volta suavemente ao lugar
      heroSec.addEventListener('mouseleave', () => {
        prisma.style.setProperty('--pry', '0deg');
        prisma.style.setProperty('--prx', '0deg');
      });
    }

    // 12. Brilho dos cards acompanhando o cursor
    $$('.project-card, .service-card, .testimonial-card, .demo-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
      });
    });
  }

})();
