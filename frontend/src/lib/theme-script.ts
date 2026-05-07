// This script runs before React hydration to prevent theme flash
export const themeScript = `
(function() {
  try {
    var stored = JSON.parse(localStorage.getItem('theme-storage') || '{}').state || {};
    var theme = stored.theme || 'dark';
    var accentColor = stored.accentColor || 'blue';
    var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var effectiveTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
    var isDark = effectiveTheme === 'dark';

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);

    var accents = {
      blue:   { l: ['oklch(0.623 0.214 259.815)', 'oklch(0.623 0.214 259.815)'], d: ['oklch(0.546 0.245 262.881)', 'oklch(0.488 0.243 264.376)'] },
      purple: { l: ['oklch(0.62 0.2 300)',         'oklch(0.62 0.2 300)'],         d: ['oklch(0.55 0.22 300)',        'oklch(0.50 0.22 300)'] },
      green:  { l: ['oklch(0.58 0.18 148)',        'oklch(0.58 0.18 148)'],        d: ['oklch(0.52 0.2 148)',         'oklch(0.48 0.2 148)'] },
      rose:   { l: ['oklch(0.63 0.22 15)',         'oklch(0.63 0.22 15)'],         d: ['oklch(0.58 0.22 15)',         'oklch(0.52 0.22 15)'] },
      orange: { l: ['oklch(0.67 0.19 55)',         'oklch(0.67 0.19 55)'],         d: ['oklch(0.62 0.2 55)',          'oklch(0.56 0.2 55)'] },
      teal:   { l: ['oklch(0.6 0.15 195)',         'oklch(0.6 0.15 195)'],         d: ['oklch(0.54 0.17 195)',        'oklch(0.48 0.17 195)'] }
    };
    var preset = accents[accentColor] || accents.blue;
    var colors = isDark ? preset.d : preset.l;
    var fg = 'oklch(0.985 0 0)';
    var root = document.documentElement;
    root.style.setProperty('--primary', colors[0]);
    root.style.setProperty('--primary-foreground', fg);
    root.style.setProperty('--ring', colors[1]);
    root.style.setProperty('--sidebar-primary', colors[0]);
    root.style.setProperty('--sidebar-primary-foreground', fg);
    root.style.setProperty('--sidebar-ring', colors[1]);
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`