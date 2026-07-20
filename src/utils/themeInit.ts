export const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('theme');
      var isDark = false;
      if (saved && saved !== 'system') {
        isDark = saved === 'dark';
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })()
`.trim();
