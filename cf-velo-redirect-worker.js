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
    const target = `https://juagusbfswxcwenzegfg.supabase.co/storage/v1/object/public/${path}`;

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
