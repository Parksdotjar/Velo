import { Readable } from 'stream';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const sanitize = (value) =>
  (value || 'tutorial')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const { data: clip, error } = await supabaseAdmin
    .from('clips')
    .select('id,title,video_path,downloads_count')
    .eq('id', id)
    .eq('content_kind', 'tutorial')
    .single();

  if (error || !clip) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  const { data: signed, error: signedError } = await supabaseAdmin
    .storage
    .from('clips')
    .createSignedUrl(clip.video_path, 60);

  if (signedError || !signed?.signedUrl) {
    res.status(500).json({ error: 'Failed to create signed url' });
    return;
  }

  supabaseAdmin
    .from('clips')
    .update({ downloads_count: (clip.downloads_count || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  supabaseAdmin
    .from('asset_downloads')
    .insert({ asset_kind: 'tutorial', asset_id: id })
    .then(() => {});

  const upstream = await fetch(signed.signedUrl);
  if (!upstream.ok) {
    res.status(502).json({ error: 'Failed to fetch tutorial' });
    return;
  }

  const filename = `${sanitize(clip.title)}.mp4`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');

  if (!upstream.body) {
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200).end(buffer);
    return;
  }

  const nodeStream = Readable.fromWeb(upstream.body);
  res.status(200);
  nodeStream.pipe(res);
}
