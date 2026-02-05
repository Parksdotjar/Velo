import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import useDebounce from '../lib/useDebounce';
import { formatDate } from '../lib/utils';
import { useToast } from '../components/ToastProvider';

const PAGE_SIZE = 24;
const SORT_OPTIONS = ['Newest', 'Most Downloaded'];

const downloadTutorial = async (id, filename, showToast) => {
  try {
    const response = await fetch(`/api/download/tutorial?id=${id}`);
    if (!response.ok) throw new Error('download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+?)"/);
    link.href = url;
    link.download = match?.[1] || filename || 'tutorial.mp4';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showToast('Download failed. Please try again.');
  }
};

export default function Tutorials() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Newest');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const debouncedQuery = useDebounce(query, 300);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount]
  );

  useEffect(() => {
    const loadTutorials = async () => {
      setLoading(true);
      let request = supabase
        .from('clips')
        .select('id,title,created_at,video_path,downloads_count,profiles!clips_user_id_fkey(username)', { count: 'exact' })
        .eq('content_kind', 'tutorial')
        .eq('visibility', 'public');

      if (debouncedQuery) {
        request = request.ilike('title', `%${debouncedQuery}%`);
      }

      request = sort === 'Most Downloaded'
        ? request.order('downloads_count', { ascending: false })
        : request.order('created_at', { ascending: false });

      request = request.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      const { data, count, error } = await request;
      if (error) {
        setTutorials([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      setTutorials(data || []);
      setTotalCount(count || 0);
      setLoading(false);
    };

    loadTutorials();
  }, [debouncedQuery, page, sort]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sort]);

  const getPublicVideoUrl = (path) => {
    if (!path) return '';
    const { data } = supabase.storage.from('clips').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Tutorials</h1>
          <p>Search tutorials...</p>
        </div>
      </section>

      <div className="search-row">
        <input
          className="input"
          placeholder="Search tutorials..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-row">
          <label className="filter-label">Sort</label>
          <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="footer-note">Loading tutorials...</div>}
      {!loading && tutorials.length === 0 && (
        <div className="footer-note">No tutorials found.</div>
      )}

      <section className="grid cols-3">
        {tutorials.map((tutorial) => (
          <article key={tutorial.id} className="clip-card asset-card">
            <div className="clip-thumb">
              <div className="clip-thumb-media asset-thumb"></div>
            </div>
            <div className="clip-meta">
              <h3>{tutorial.title}</h3>
              <span>{tutorial.profiles?.username || 'Unknown'} · {formatDate(tutorial.created_at)}</span>
            </div>
            <div className="tag-row">
              <span className="tag type-badge">Tutorial</span>
            </div>
            <div className="tag-row">
              <button
                className="button-primary accent-button"
                onClick={() => setActiveTutorial(tutorial)}
              >
                Watch
              </button>
              <button
                className="button-secondary"
                onClick={() => downloadTutorial(tutorial.id, `${tutorial.title}.mp4`, showToast)}
              >
                Download Video
              </button>
            </div>
          </article>
        ))}
      </section>

      <div className="pagination">
        <button
          className="button-secondary"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Previous
        </button>
        <span className="footer-note">Page {page} of {totalPages}</span>
        <button
          className="button-secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Next
        </button>
      </div>

      {activeTutorial && (
        <div className="modal active" onClick={() => setActiveTutorial(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="player">
              <video
                src={getPublicVideoUrl(activeTutorial.video_path)}
                controls
                playsInline
                style={{ width: '100%', borderRadius: '16px' }}
              />
            </div>
            <div className="meta-stack">
              <h3>{activeTutorial.title}</h3>
              <div className="footer-note">{activeTutorial.profiles?.username || 'Unknown'}</div>
              <button className="button-secondary" onClick={() => setActiveTutorial(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
