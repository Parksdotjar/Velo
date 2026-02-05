import { Readable } from 'stream';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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

  const { data: asset, error } = await supabaseAdmin
    .from('thumbnail_assets')
    .select('id,file_path,original_filename,bucket,mime_type,downloads_count')
    .eq('id', id)
    .single();

  if (error || !asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  const { data: signed, error: signedError } = await supabaseAdmin
    .storage
    .from(asset.bucket)
    .createSignedUrl(asset.file_path, 60);

  if (signedError || !signed?.signedUrl) {
    res.status(500).json({ error: 'Failed to create signed url' });
    return;
  }

  supabaseAdmin
    .from('thumbnail_assets')
    .update({ downloads_count: (asset.downloads_count || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  supabaseAdmin
    .from('asset_downloads')
    .insert({ asset_kind: 'thumbnail', asset_id: id })
    .then(() => {});

  const upstream = await fetch(signed.signedUrl);
  if (!upstream.ok) {
    res.status(502).json({ error: 'Failed to fetch asset' });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${asset.original_filename}"`);
  res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
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
