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
    return Response.redirect(target, 302);
  }
};
