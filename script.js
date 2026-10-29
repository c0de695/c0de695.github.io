/* ============================================
   纸间札记 v2 · Shared Scripts
   ============================================ */

(function () {
  'use strict';

  // ---------- Theme Toggle ----------
  const STORAGE_KEY = 'paperink-v2-theme';
  const themeBtns = document.querySelectorAll('#themeToggle, #themeToggle2');

  function getInitialTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }
  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
    const icon = theme === 'light' ? '☀️' : '🌙';
    themeBtns.forEach(function (btn) {
      var iconEl = btn.querySelector('.theme-icon');
      if (iconEl) {
        iconEl.textContent = icon;
      } else {
        btn.textContent = icon;
      }
    });
  }
  applyTheme(getInitialTheme());
  themeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cur = document.body.getAttribute('data-theme');
      applyTheme(cur === 'light' ? 'dark' : 'light');
    });
  });

  // ---------- Sidebar (mobile) ----------
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      sidebarOverlay?.classList.toggle('show');
    });
  }
  if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      sidebarOverlay?.classList.remove('show');
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      sidebarOverlay?.classList.remove('show');
    });
  }

  // ---------- Today's Date ----------
  const todayEl = document.getElementById('todayDate');
  if (todayEl) {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    todayEl.textContent = `${yy}.${mm}.${dd} · ${weekdays[d.getDay()]}`;
  }

  // ---------- Diary Count ----------
  const diaryCountEl = document.getElementById('diaryCount');
  if (diaryCountEl) {
    try {
      const raw = localStorage.getItem('diary-entries');
      if (raw) {
        const entries = JSON.parse(raw);
        diaryCountEl.textContent = entries.length;
      }
    } catch {}
  }

  // ---------- Active Nav ----------
  const navItems = document.querySelectorAll('.side-nav__item[data-target]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // ---------- Smooth scroll ----------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('show');
      }
    });
  });

  // ---------- Mood rotation (each visit random) ----------
  const moodEl = document.getElementById('todayMood');
  if (moodEl) {
    const moods = ['✨', '🌙', '☕', '🍃', '🐙', '🎮', '📚', '🌈', '🌸', '🎧'];
    const seed = new Date().getDate();
    moodEl.textContent = moods[seed % moods.length];
  }

})();
