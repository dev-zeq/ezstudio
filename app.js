const html = document.documentElement;
const header = document.getElementById('siteHeader');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const menuButton = document.getElementById('menuButton');
const menuClose = document.getElementById('menuClose');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('ez-theme', theme);

  if (themeIcon) {
    themeIcon.classList.toggle('is-dark', theme === 'dark');
  }
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem('ez-theme');

  if (savedTheme) {
    return savedTheme;
  }

  return 'light';
}

function openMenu() {
  if (!mobileMenu || !menuButton) {
    return;
  }

  mobileMenu.classList.add('open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  if (!mobileMenu || !menuButton) {
    return;
  }

  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

setTheme(getInitialTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

if (menuButton) {
  menuButton.addEventListener('click', openMenu);
}

if (menuClose) {
  menuClose.addEventListener('click', closeMenu);
}

mobileLinks.forEach((link) => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.14,
  rootMargin: '0px 0px -48px 0px',
});

document.querySelectorAll('.reveal').forEach((element) => {
  revealObserver.observe(element);
});

const progressObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-width]').forEach((bar) => {
        bar.style.width = bar.dataset.width;
      });
      progressObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.35,
});

document.querySelectorAll('.score-card').forEach((card) => {
  progressObserver.observe(card);
});
