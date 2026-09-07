import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Wikimedia-logo_black.svg/512px-Wikimedia-logo_black.svg.png';

function cleanQuery(value: string) {
  return value.replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q') || 'cryptocurrency';
  const query = cleanQuery(raw);
  if (!query) return Response.redirect(FALLBACK, 302);

  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '8',
      prop: 'imageinfo',
      iiprop: 'url|mime',
      iiurlwidth: '900',
      format: 'json',
      origin: '*',
    });
    const response = await fetch(`${COMMONS_API}?${params.toString()}`, {
      headers: { accept: 'application/json', 'user-agent': 'B20-AI-Launcher/1.0' },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return Response.redirect(FALLBACK, 302);
    const json = await response.json();
    const pages = Object.values(json?.query?.pages ?? {}) as any[];
    const image = pages
      .map((page) => page?.imageinfo?.[0])
      .find((info) => info?.thumburl || info?.url);
    const url = image?.thumburl || image?.url || FALLBACK;
    return Response.redirect(url, 302);
  } catch {
    return Response.redirect(FALLBACK, 302);
  }
}
