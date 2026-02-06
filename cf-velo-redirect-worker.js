export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v/')) {
      return new Response('Not found', { status: 404 });
    }
    const path = url.pathname.replace(/^\/v\//, '');
    if (!path) {
      return new Response('Missing path', { status: 400 });
    }
    const target = `https://supabase.velogg.org/storage/v1/object/public/${path}`;

    const userAgent = request.headers.get('User-Agent') || '';
    const accept = request.headers.get('Accept') || '';
    const wantsHtml =
      url.searchParams.get('preview') === '1' ||
      /discordbot|discord/i.test(userAgent) ||
      accept.includes('text/html');

    if (wantsHtml) {
      const title = 'VELO Clip';
      const description = 'Watch this clip on VELO.';
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url.href}">
  <meta property="og:video" content="${target}">
  <meta property="og:video:secure_url" content="${target}">
  <meta property="og:video:type" content="video/mp4">
  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="${target}">
  <meta name="twitter:player:stream" content="${target}">
  <meta name="twitter:player:stream:content_type" content="video/mp4">
  <title>${title}</title>
</head>
<body style="background:#000;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <video src="${target}" controls playsinline style="max-width:92vw;max-height:92vh;border-radius:16px;"></video>
</body>
</html>`;
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const headers = new Headers();
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);

    const upstream = await fetch(target, { headers });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Content-Disposition', 'inline');
    responseHeaders.set('Accept-Ranges', 'bytes');

    if (path.toLowerCase().endsWith('.mp4')) {
      responseHeaders.set('Content-Type', 'video/mp4');
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  }
};
