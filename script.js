/* ============================================
   纸间札记 · Paper & Ink
   Interactions & Enhancements
   ============================================ */

(function () {
  'use strict';

  // ---------- Theme Toggle ----------
  const themeToggle = document.getElementById('themeToggle');
  const STORAGE_KEY = 'paperink-theme';

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    // Prefer light by default for editorial feel
    return 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '☀' : '◐';
      themeToggle.title = theme === 'dark' ? '切换到日间模式' : '切换到夜间模式';
    }
  }

  applyTheme(getInitialTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------- Scroll Reveal ----------
  const revealTargets = document.querySelectorAll(
    '.featured-card, .archive__item, .about__inner, .hero__headline'
  );

  revealTargets.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealTargets.forEach(function (el) { observer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('visible'); });
  }

  // ---------- Current Year in Colophon ----------
  const yearSpan = document.querySelector('[data-current-year]');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- Active nav link on scroll ----------
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollY = window.pageYOffset + 150;
    let current = '';
    sections.forEach(function (section) {
      if (scrollY >= section.offsetTop) current = section.getAttribute('id');
    });
    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

})();
