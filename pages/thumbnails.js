import { useEffect, useMemo, useState } from 'react';
import Layout from '../layout';
import { supabase } from '../supabaseClient';
import useDebounce from '../useDebounce';
import { formatDate, normalizeAssetType } from '../utils';
import { useToast } from '../toastProvider';

const PAGE_SIZE = 24;
const TYPE_OPTIONS = ['All', 'Background', 'Player PNG'];
const SORT_OPTIONS = ['Newest', 'Most Downloaded'];

const downloadAsset = async (id, filename, showToast) => {
  try {
    const response = await fetch(`/api/download/thumbnail?id=${id}`);
    if (!response.ok) throw new Error('download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+?)"/);
    link.href = url;
    link.download = match?.[1] || filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showToast('Download failed. Please try again.');
  }
};

export default function ThumbnailAssets() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [assetType, setAssetType] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount]
  );

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      let request = supabase
        .from('thumbnail_assets')
        .select('id,title,asset_type,owner_id,created_at,downloads_count,original_filename', { count: 'exact' });

      if (assetType !== 'All') {
        request = request.eq('asset_type', normalizeAssetType(assetType));
      }

      if (debouncedQuery) {
        const terms = debouncedQuery.split(' ').filter(Boolean);
        const orParts = [`title.ilike.%${debouncedQuery}%`];
        terms.forEach((term) => {
          orParts.push(`tags.cs.{${term}}`);
        });
        request = request.or(orParts.join(','));
      }

      request = sort === 'Most Downloaded'
        ? request.order('downloads_count', { ascending: false })
        : request.order('created_at', { ascending: false });

      request = request.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      const { data, count, error } = await request;
      if (error) {
        setAssets([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set((data || []).map((row) => row.owner_id))).filter(Boolean);
      let profileMap = new Map();
      if (ownerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id,username')
          .in('id', ownerIds);
        profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.username]));
      }

      const withProfiles = (data || []).map((asset) => ({
        ...asset,
        uploader: profileMap.get(asset.owner_id) || 'Unknown'
      }));
      setAssets(withProfiles);
      setTotalCount(count || 0);
      setLoading(false);
    };

    loadAssets();
  }, [assetType, debouncedQuery, page, sort]);

  useEffect(() => {
    setPage(1);
  }, [assetType, debouncedQuery, sort]);

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Thumbnail Assets</h1>
          <p>Search thumbnail backgrounds and player PNGs...</p>
        </div>
      </section>

      <div className="search-row">
        <input
          className="input"
          placeholder="Search thumbnail backgrounds and player PNGs..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-row">
          <label className="filter-label">Type</label>
          <select className="input" value={assetType} onChange={(event) => setAssetType(event.target.value)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="filter-row">
          <label className="filter-label">Sort</label>
          <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="footer-note">Loading assets...</div>}
      {!loading && assets.length === 0 && (
        <div className="footer-note">No thumbnail assets found.</div>
      )}

      <section className="grid cols-3">
        {assets.map((asset) => (
          <article key={asset.id} className="clip-card asset-card">
            <div className="clip-thumb">
              <div className="clip-thumb-media asset-thumb"></div>
            </div>
            <div className="clip-meta">
              <h3>{asset.title}</h3>
              <span>{asset.uploader || 'Unknown'} · {formatDate(asset.created_at)}</span>
            </div>
            <div className="tag-row">
              <span className="tag type-badge">{asset.asset_type?.replace(/_/g, ' ')}</span>
            </div>
            <div className="tag-row">
              <button
                className="button-secondary"
                onClick={() => downloadAsset(asset.id, asset.original_filename, showToast)}
              >
                Download
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
    </Layout>
  );
}
