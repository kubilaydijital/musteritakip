// Ortak tasarım sistemi - panel (App.jsx) ile aynı renk dili.
// Landing page, demo, blog ve diğer tüm tanıtım sayfaları bu paleti kullanır.

export const T = {
  primary: '#7C5CFC',
  primaryDark: '#6C3FFC',
  primaryLight: 'rgba(124,92,252,0.16)',
  bg: '#070D18',
  card: '#0C1626',
  cardSoft: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSoft: '#94A3B8',
  textFaint: '#64748B',
  green: '#22C55E',
  greenBg: 'rgba(34,197,94,0.14)',
  orange: '#F59E0B',
  orangeBg: 'rgba(245,158,11,0.14)',
  red: '#EF4444',
  redBg: 'rgba(239,68,68,0.14)',
  blue: '#3B82F6',
  blueBg: 'rgba(59,130,246,0.14)',
}

export const cardStyle = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
}

export const inputStyle = {
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${T.border}`,
  boxSizing: 'border-box',
  fontSize: 14,
  fontFamily: 'inherit',
  background: T.cardSoft,
  color: T.text,
  colorScheme: 'dark',
  width: '100%',
}

export const btnPrimary = {
  background: T.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '13px 26px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
}

export const btnSecondary = {
  background: 'transparent',
  color: T.text,
  border: `1.5px solid ${T.border}`,
  borderRadius: 10,
  padding: '13px 26px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  transition: 'border-color 0.15s ease, background 0.15s ease',
}

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  html, body { overflow-x: hidden; max-width: 100%; margin: 0; }
  body { background: ${T.bg}; }
  select, input, textarea { font-family: 'Inter', system-ui, sans-serif; max-width: 100%; }
  ::placeholder { color: ${T.textFaint}; }
  a { color: inherit; }
  .mt-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(124,92,252,0.35); }
  .mt-btn-secondary:hover { border-color: ${T.primary}; background: rgba(124,92,252,0.08); }
  .mt-fade-up { animation: mtFadeUp 0.6s ease backwards; }
  @keyframes mtFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) { .mt-fade-up { animation: none !important; } }
  button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible {
    outline: 2px solid ${T.primary}; outline-offset: 2px;
  }
  @media (max-width: 860px) {
    .mt-hero-grid { grid-template-columns: 1fr !important; }
    .mt-grid-2 { grid-template-columns: 1fr !important; }
    .mt-grid-3 { grid-template-columns: 1fr !important; }
    .mt-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .mt-nav-links { display: none !important; }
  }
`

export const PAGE_MAX = 1180
