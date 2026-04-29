/**
 * Inline pre-hydration theme apply, runs before React mounts to avoid FOUC.
 * Reads localStorage; falls back to prefers-color-scheme.
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var raw = localStorage.getItem('aegishub.theme');
    var stored = null;
    if (raw) {
      try { stored = JSON.parse(raw).state ? JSON.parse(raw).state.theme : JSON.parse(raw).theme; } catch (e) {}
    }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
