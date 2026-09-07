import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hash(text: string) {
  let h = 0;
  for (const c of text) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = (url.searchParams.get('name') || 'Token').slice(0, 64);
  const symbol = (url.searchParams.get('symbol') || 'TKN').slice(0, 16).toUpperCase();
  const key = `${name} ${symbol}`.toLowerCase();
  const n = hash(key);

  const themes = [
    ['rocket', '#e5e7eb', '#ef4444', '#38bdf8'],
    ['dragon', '#dcfce7', '#16a34a', '#ef4444'],
    ['dog', '#f3d19c', '#a16207', '#111827'],
    ['cat', '#e9d5ff', '#9333ea', '#111827'],
    ['bear', '#d6a66d', '#92400e', '#111827'],
    ['bull', '#fecaca', '#dc2626', '#111827'],
    ['wolf', '#cbd5e1', '#64748b', '#0f172a'],
    ['fish', '#bae6fd', '#0284c7', '#0f172a'],
    ['diamond', '#cffafe', '#06b6d4', '#e0f2fe'],
    ['coin', '#fef3c7', '#f59e0b', '#78350f'],
    ['moon', '#e0e7ff', '#6366f1', '#fef3c7'],
    ['sun', '#fef9c3', '#f59e0b', '#ef4444'],
    ['fire', '#ffedd5', '#f97316', '#dc2626'],
    ['ice', '#e0f2fe', '#38bdf8', '#2563eb'],
    ['robot', '#e5e7eb', '#64748b', '#06b6d4'],
    ['cyber', '#e0e7ff', '#7c3aed', '#22d3ee'],
    ['star', '#fef9c3', '#eab308', '#f97316'],
  ] as const;

  const found = themes.find(([word]) => key.includes(word));
  const [theme, light, main, accent] = found || themes[n % themes.length];
  const bg = ['#09090b', '#111827', '#172033', '#0b1220'][n % 4];
  const safeName = esc(name);
  const safeSymbol = esc(symbol);

  let object = '';
  if (theme === 'rocket') {
    object = `<path d="M256 72c-55 35-82 96-82 170v88l82 72 82-72v-88c0-74-27-135-82-170z" fill="url(#main)" stroke="#fff" stroke-opacity=".22" stroke-width="4"/><circle cx="256" cy="206" r="32" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="8"/><path d="M174 270l-60 45 62 18m164-63l60 45-62 18" fill="${accent}" stroke="#111827" stroke-width="5"/><path d="M215 328l41 78 41-78" fill="${accent}"/><ellipse cx="256" cy="415" rx="58" ry="16" fill="#fb923c" opacity=".55"/>`;
  } else if (theme === 'dragon') {
    object = `<path d="M145 350l35-125 58 35 18-92 18 92 58-35 35 125-62-18-49 48-49-48z" fill="url(#main)"/><path d="M205 245l-55-85 87 48 19-70 19 70 87-48-55 85" fill="${accent}"/><circle cx="222" cy="276" r="9" fill="#fff"/><circle cx="290" cy="276" r="9" fill="#fff"/>`;
  } else if (['dog','cat','bear','bull','wolf'].includes(theme)) {
    const ears = theme === 'cat' || theme === 'wolf' ? '<path d="M155 225l10-105 82 70m-46 35l-56-105m200 105l-10-105-82 70m46 35l56-105" fill="url(#main)" stroke="#fff" stroke-opacity=".12" stroke-width="5"/>' : '<circle cx="170" cy="205" r="55" fill="url(#main)"/><circle cx="342" cy="205" r="55" fill="url(#main)"/>';
    object = `${ears}<ellipse cx="256" cy="285" rx="112" ry="125" fill="url(#main)" stroke="#fff" stroke-opacity=".15" stroke-width="5"/><ellipse cx="216" cy="250" rx="18" ry="22" fill="#111827"/><ellipse cx="296" cy="250" rx="18" ry="22" fill="#111827"/><ellipse cx="256" cy="320" rx="42" ry="30" fill="${accent}"/><ellipse cx="256" cy="314" rx="13" ry="10" fill="#111827"/>`;
  } else if (theme === 'fish') {
    object = `<ellipse cx="245" cy="275" rx="125" ry="88" fill="url(#main)"/><path d="M355 275l105-72v144z" fill="${accent}"/><circle cx="190" cy="250" r="13" fill="#111827"/><path d="M235 285c30 20 60 20 90 0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="7"/><path d="M250 195v160" stroke="#fff" stroke-opacity=".18" stroke-width="8"/>`;
  } else if (theme === 'diamond') {
    object = `<path d="M128 220l62-72h132l62 72-128 190z" fill="url(#main)" stroke="#fff" stroke-opacity=".5" stroke-width="5"/><path d="M128 220h256l-128 190m-66-262l66 72 66-72m-132 72l66 190 66-190" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="8"/>`;
  } else if (theme === 'coin') {
    object = `<circle cx="256" cy="270" r="122" fill="url(#main)" stroke="#fde68a" stroke-width="8"/><circle cx="256" cy="270" r="92" fill="none" stroke="#fff7ed" stroke-opacity=".55" stroke-width="7"/><path d="M256 198v145m-38-112h54c32 0 32 43 0 43h-42c-32 0-32 43 0 43h58" fill="none" stroke="${accent}" stroke-width="15" stroke-linecap="round"/>`;
  } else if (theme === 'moon') {
    object = `<circle cx="285" cy="265" r="112" fill="url(#main)"/><circle cx="325" cy="225" r="112" fill="${bg}"/><circle cx="205" cy="195" r="10" fill="#fff"/><circle cx="180" cy="335" r="7" fill="#fff"/><circle cx="390" cy="155" r="6" fill="#fff"/>`;
  } else if (theme === 'sun' || theme === 'fire' || theme === 'star') {
    const shape = theme === 'star' ? 'M256 120l34 86 92 8-70 59 22 91-78-49-78 49 22-91-70-59 92-8z' : 'M256 115c-55 72-72 103-72 158a72 72 0 00144 0c0-55-17-86-72-158z';
    object = `<path d="${shape}" fill="url(#main)" stroke="#fff" stroke-opacity=".2" stroke-width="5"/><circle cx="220" cy="245" r="13" fill="#fff" opacity=".75"/>`;
  } else {
    object = `<rect x="145" y="155" width="222" height="220" rx="42" fill="url(#main)" stroke="#fff" stroke-opacity=".2" stroke-width="5"/><rect x="180" y="195" width="152" height="105" rx="22" fill="#0b1220" opacity=".75"/><circle cx="220" cy="245" r="15" fill="${accent}"/><circle cx="292" cy="245" r="15" fill="${accent}"/><path d="M220 285h72" stroke="#fff" stroke-opacity=".7" stroke-width="8" stroke-linecap="round"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
<defs>
  <radialGradient id="bg" cx="50%" cy="35%"><stop offset="0" stop-color="#263244"/><stop offset="1" stop-color="${bg}"/></radialGradient>
  <linearGradient id="main" x1="15%" y1="5%" x2="85%" y2="95%"><stop offset="0" stop-color="${light}"/><stop offset=".42" stop-color="${main}"/><stop offset="1" stop-color="#111827"/></linearGradient>
  <filter id="shadow"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="512" height="512" rx="64" fill="url(#bg)"/>
<ellipse cx="256" cy="410" rx="150" ry="30" fill="#000" opacity=".45" filter="url(#shadow)"/>
<circle cx="390" cy="105" r="90" fill="${accent}" opacity=".10"/>
${object}
<rect x="28" y="28" width="456" height="456" rx="48" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>
<text x="256" y="456" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" fill="#fff">${safeSymbol}</text>
<text x="256" y="482" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="#cbd5e1">${safeName.slice(0, 34)}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
