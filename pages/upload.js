import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { buildAssetPath, normalizeAssetType, parseTags } from '../lib/utils';
import { useToast } from '../components/ToastProvider';

const EDITING_TYPES = ['Preset', 'Sound Effect', 'Background', 'PNG'];
const THUMBNAIL_TYPES = ['Background', 'Player PNG'];

const ensureUniqueClipSlug = async (title, userId) => {
  const base = (title || 'tutorial')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'tutorial';
  const suffixBase = userId ? userId.slice(0, 6) : Math.random().toString(36).slice(2, 6);
  const candidates = [
    base,
    `${base}-${suffixBase}`,
    `${base}-${Date.now().toString(36)}`,
    `${base}-${Math.random().toString(36).slice(2, 8)}`
  ];
  for (const candidate of candidates) {
    const { data } = await supabase
      .from('clips')
      .select('id')
      .eq('clip_slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
};

const createThumbnail = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration || 0;
      const seekTime = Math.min(1, Math.max(0, duration / 4));
      video.currentTime = seekTime;
    });

    video.addEventListener('seeked', () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve({ blob, duration: video.duration || 0 });
      }, 'image/jpeg', 0.82);
    });
  });

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default function Upload() {
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [kind, setKind] = useState('editing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [assetType, setAssetType] = useState(EDITING_TYPES[0]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const typeOptions = useMemo(() => (
    kind === 'editing' ? EDITING_TYPES : THUMBNAIL_TYPES
  ), [kind]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!session) {
      setMessage('You must be signed in to upload.');
      return;
    }
    if (!file) {
      setMessage('Please choose a file.');
      return;
    }
    setUploading(true);

    try {
      if (kind === 'editing' || kind === 'thumbnail') {
        const bucket = kind === 'editing' ? 'ccave-editing' : 'ccave-thumbnails';
        const path = buildAssetPath(session.user.id, file);
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
        if (uploadError) throw uploadError;

        const payload = {
          owner_id: session.user.id,
          title: title.trim() || file.name,
          description: description.trim() || null,
          asset_type: normalizeAssetType(assetType),
          tags: parseTags(tags),
          file_path: path,
          bucket,
          original_filename: file.name,
          mime_type: file.type || null,
          file_size: file.size || null
        };

        const table = kind === 'editing' ? 'editing_assets' : 'thumbnail_assets';
        const { error: insertError } = await supabase.from(table).insert(payload);
        if (insertError) throw insertError;
      } else {
        const path = buildAssetPath(session.user.id, file);
        const { error: uploadError } = await supabase.storage.from('clips').upload(path, file);
        if (uploadError) throw uploadError;

        const { blob, duration } = await createThumbnail(file);
        let thumbPath = null;
        if (blob) {
          const thumbName = buildAssetPath(session.user.id, new File([blob], `${file.name}.jpg`, { type: 'image/jpeg' }));
          const { error: thumbErr } = await supabase.storage.from('thumbs').upload(thumbName, blob);
          if (!thumbErr) thumbPath = thumbName;
        }

        const clipSlug = await ensureUniqueClipSlug(title, session.user.id);
        const clipSecret = Math.random().toString(36).slice(2, 10);

        const { data: clipData, error: clipError } = await supabase.from('clips').insert({
          user_id: session.user.id,
          title: title.trim() || file.name,
          description: description.trim() || null,
          visibility: 'public',
          video_path: path,
          thumb_path: thumbPath,
          duration: formatDuration(duration),
          duration_seconds: Math.floor(duration),
          allow_downloads: true,
          allow_embed: true,
          content_warning: false,
          clip_slug: clipSlug,
          clip_secret: clipSecret,
          content_kind: 'tutorial'
        }).select().single();
        if (clipError) throw clipError;

        const tagList = parseTags(tags);
        for (const tag of tagList) {
          const { data: tagRow } = await supabase.from('tags').upsert({ name: tag }).select().single();
          if (tagRow) {
            await supabase.from('clip_tags').insert({ clip_id: clipData.id, tag_id: tagRow.id });
          }
        }
      }

      showToast('Upload complete.');
      setTitle('');
      setDescription('');
      setTags('');
      setFile(null);
      setMessage('');
    } catch (error) {
      showToast('Upload failed. Please try again.');
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Upload</h1>
          <p>Choose an asset type and publish it to CCAVE.</p>
        </div>
      </section>

      <section className="panel" style={{ padding: '18px' }}>
        <form className="form-section" onSubmit={handleUpload}>
          <div className="form-group">
            <label>What are you uploading?</label>
            <select className="input" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="editing">Editing Asset</option>
              <option value="thumbnail">Thumbnail Asset</option>
              <option value="tutorial">Tutorial Video</option>
            </select>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              className="input"
              placeholder={kind === 'tutorial' ? 'e.g., How to Make a Clean Velocity Edit' : 'e.g., Smooth Zoom Preset'}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          {(kind === 'editing' || kind === 'thumbnail') && (
            <div className="form-group">
              <label>Type</label>
              <select className="input" value={assetType} onChange={(event) => setAssetType(event.target.value)}>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="textarea"
              placeholder="Optional description..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input
              className="input"
              placeholder="minecraft, pvp, cinematic (comma separated)"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{kind === 'tutorial' ? 'Choose video file' : 'Choose file'}</label>
            <input
              className="input"
              type="file"
              accept={kind === 'tutorial' ? 'video/*' : undefined}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>

          {message && <div className="footer-note">{message}</div>}

          <button className="button-primary accent-button" type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : (kind === 'tutorial' ? 'Upload Tutorial' : 'Upload')}
          </button>
        </form>
      </section>
    </Layout>
  );
}
