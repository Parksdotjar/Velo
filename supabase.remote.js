
const SUPABASE_URL = 'https://supabase.velogg.org';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTU2OTQ0MCwiZXhwIjo0OTI1MjQzMDQwLCJyb2xlIjoiYW5vbiJ9.aUrVH2AfYa9FamE_1RTaTdbcznxwxopPQkJU5h4hGPo';

const supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const page = document.body.getAttribute('data-page');
const getBaseUrl = () => {
  const path = window.location.pathname;
  const base = path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
  return `${window.location.origin}${base}`;
};
const AUTH_REDIRECT = `${getBaseUrl()}login.html`;
const isUnsupportedOrigin = () => {
  if (location.protocol === 'file:') return true;
  if (location.hostname.endsWith('github.com')) return true;
  return false;
};
const debugState = { banner: null };

const setDebugStatus = (key, ok, text) => {
  const el = debugState.banner?.querySelector(`[data-debug="${key}"]`);
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'bad');
  el.classList.add(ok ? 'ok' : 'bad');
};

const initDebugBanner = () => {
  if (!document.body) return;
  const banner = document.createElement('div');
  banner.className = 'debug-banner';
  banner.innerHTML = `
    <div><strong>VELO Debug</strong></div>
    <div class="debug-row"><span>Origin</span><span class="debug-status" data-debug="origin"></span></div>
    <div class="debug-row"><span>Supabase CDN</span><span class="debug-status" data-debug="cdn"></span></div>
    <div class="debug-row"><span>Supabase Client</span><span class="debug-status" data-debug="client"></span></div>
    <div class="debug-row"><span>Auth State</span><span class="debug-status" data-debug="auth"></span></div>
  `;
  document.body.appendChild(banner);
  debugState.banner = banner;

  const originOk = !isUnsupportedOrigin();
  setDebugStatus('origin', originOk, originOk ? window.location.origin : 'invalid origin');
  setDebugStatus('cdn', Boolean(window.supabase?.createClient), window.supabase?.createClient ? 'loaded' : 'missing');
  setDebugStatus('client', Boolean(supabaseClient), supabaseClient ? 'ready' : 'null');
  setDebugStatus('auth', false, 'unknown');
};

const showToast = (message) => {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const setAuthState = (session) => {
  document.body.setAttribute('data-auth', session ? 'logged-in' : 'logged-out');
  setDebugStatus('auth', Boolean(session), session ? 'logged-in' : 'logged-out');
};

const fetchSession = async () => {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  setAuthState(data.session);
  return data.session;
};

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setAuthState(session);
    if (session) {
      const profileLink = document.querySelector('a[aria-label="Profile"]');
      if (profileLink) profileLink.href = `profile.html?id=${session.user.id}`;
    }
  });
}

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const randomSecret = () => Math.random().toString(36).slice(2, 10);

const selectFile = (accept) => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
};

const createThumbnail = (file) => {
  return new Promise((resolve) => {
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
};

const buildClipCard = (clip) => {
  const tags = (clip.clip_tags || []).map((ct) => ct.tags?.name).filter(Boolean);
  const creator = clip.profiles?.username || 'unknown';
  const creatorId = clip.profiles?.id || '';
  const time = formatTimeAgo(clip.created_at);
  const thumbUrl = clip.thumb_path
    ? `${SUPABASE_URL}/storage/v1/object/public/thumbs/${clip.thumb_path}`
    : '';
  const likesCount = clip.likes_count ?? 0;
  const likeIcon = 'sprite.svg#icon-heart';

  return `
    <article class="clip-card" data-open-modal data-clip-id="${clip.id}" data-user-id="${creatorId}">
      <div class="clip-thumb" style="${thumbUrl ? `background-image: url('${thumbUrl}'); background-size: cover; background-position: center;` : ''}">
        <div class="thumb-overlay">${clip.duration || '00:00'}</div>
      </div>
      <div class="clip-meta">
        <h3>${clip.title || 'Untitled Clip'}</h3>
        <span>@${creator} � ${time}</span>
      </div>
      <div class="tag-row">
        ${tags.slice(0, 3).map((tag) => `<span class="tag">#${tag}</span>`).join('')}
      </div>
      <div class="quick-actions">
        <div class="tag-row">
          <button class="icon-button" data-action="like" aria-label="Like">
            <svg class="icon" data-like-icon><use href="${likeIcon}"></use></svg>
          </button>
          <span class="like-count">${likesCount}</span>
          <button class="icon-button" data-action="save" aria-label="Save">
            <svg class="icon"><use href="sprite.svg#icon-bookmark"></use></svg>
          </button>
          <button class="icon-button" data-action="share" aria-label="Share">
            <svg class="icon"><use href="sprite.svg#icon-share"></use></svg>
          </button>
          ${clip.allow_downloads ? `
          <button class="icon-button" data-action="download" aria-label="Download">
            <svg class="icon"><use href="sprite.svg#icon-download"></use></svg>
          </button>
          ` : ''}
        </div>
        <button class="icon-button" aria-label="More">
          <svg class="icon"><use href="sprite.svg#icon-more"></use></svg>
        </button>
      </div>
    </article>
  `;
};

const buildDashboardCard = (clip) => {
  const thumbUrl = clip.thumb_path
    ? `${SUPABASE_URL}/storage/v1/object/public/thumbs/${clip.thumb_path}`
    : '';
  return `
    <article class="clip-card" data-clip-id="${clip.id}">
      <div class="clip-thumb" style="${thumbUrl ? `background-image: url('${thumbUrl}'); background-size: cover; background-position: center;` : ''}"></div>
      <div class="clip-meta">
        <h3>${clip.title || 'Untitled Clip'}</h3>
        <span>${clip.visibility} � ${formatTimeAgo(clip.created_at)}</span>
      </div>
      <div class="tag-row">
        <button class="button-secondary" data-action="edit">Edit</button>
        <button class="button-secondary" data-action="visibility">Visibility</button>
        <button class="button-secondary" data-action="replace">Replace</button>
      </div>
      <div class="tag-row">
        <button class="icon-button" data-action="thumbnail" aria-label="Regenerate thumbnail">
          <svg class="icon"><use href="sprite.svg#icon-grid"></use></svg>
        </button>
        <button class="icon-button" data-action="pin" aria-label="Pin">
          <svg class="icon"><use href="sprite.svg#icon-bookmark"></use></svg>
        </button>
        <button class="icon-button" data-action="delete" aria-label="Delete">
          <svg class="icon"><use href="sprite.svg#icon-trash"></use></svg>
        </button>
      </div>
    </article>
  `;
};
const clipCache = new Map();
let currentClipId = null;

const EXPLORE_PAGE_SIZE = 124;
const EXPLORE_PAGE_WINDOW = 10;

let exploreState = {
  sort: 'new',
  duration: null,
  tag: null,
  search: '',
  page: 1,
  totalCount: 0,
  totalPages: 1
};

const parseSearch = (value) => {
  const parts = value.split(' ').filter(Boolean);
  const tags = parts.filter((p) => p.startsWith('#')).map((p) => p.replace('#', ''));
  const text = parts.filter((p) => !p.startsWith('#')).join(' ');
  return { text, tags };
};

const getExploreOrder = () => {
  if (exploreState.sort === 'views') return ['views_count', 'created_at'];
  if (exploreState.sort === 'likes') return ['likes_count', 'created_at'];
  if (exploreState.sort === 'trending') return ['views_count', 'likes_count'];
  return ['created_at'];
};

const applyExploreDuration = (query) => {
  if (!exploreState.duration) return query;
  const [min, max] = exploreState.duration.split('-');
  if (max === '+') {
    return query.or(`duration_seconds.is.null,duration_seconds.gte.${Number(min)}`);
  }
  return query.or(`duration_seconds.is.null,and(duration_seconds.gte.${Number(min)},duration_seconds.lt.${Number(max)})`);
};

const updateExploreStatus = (shown) => {
  const note = document.querySelector('[data-explore-status]');
  if (!note) return;
  const total = exploreState.totalCount || 0;
  if (!total) {
    note.textContent = 'No public clips yet.';
    return;
  }
  if (!shown) {
    note.textContent = 'No clips match your filters.';
    return;
  }
  const start = (exploreState.page - 1) * EXPLORE_PAGE_SIZE + 1;
  const end = Math.min(total, start + shown - 1);
  note.textContent = `Showing ${start}-${end} of ${total} public clips - Page ${exploreState.page} of ${exploreState.totalPages}`;
};

const renderExplorePagination = () => {
  const pagination = document.querySelector('[data-pagination]');
  if (!pagination) return;
  const total = exploreState.totalCount || 0;
  const totalPages = exploreState.totalPages || 1;
  if (total <= EXPLORE_PAGE_SIZE) {
    pagination.style.display = 'none';
    return;
  }
  pagination.style.display = 'flex';
  const prevBtn = pagination.querySelector('[data-page-prev]');
  const nextBtn = pagination.querySelector('[data-page-next]');
  const buttons = pagination.querySelector('[data-page-buttons]');
  if (!buttons) return;

  const currentPage = exploreState.page;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  const windowStart = Math.max(1, currentPage - EXPLORE_PAGE_WINDOW + 1);
  const windowEnd = Math.min(totalPages, windowStart + EXPLORE_PAGE_WINDOW - 1);
  const pageButtons = [];
  for (let page = windowStart; page <= windowEnd; page += 1) {
    const isActive = page === currentPage;
    pageButtons.push(`
      <button class="button-secondary page-button${isActive ? ' active' : ''}" data-page="${page}"${isActive ? ' aria-current="page"' : ''}>
        ${page}
      </button>
    `);
  }
  buttons.innerHTML = pageButtons.join('');
};

const loadExplore = async () => {
  if (!supabaseClient) return;
  const grid = document.querySelector('[data-clips-grid]');
  if (!grid) return;

  const baseSelect = 'id,title,created_at,visibility,thumb_path,video_path,duration,duration_seconds,likes_count,views_count,allow_downloads,allow_embed,clip_slug,clip_secret';
  const fullSelect = `${baseSelect},profiles!clips_user_id_fkey(id,username),clip_tags(tags(name))`;

  let query = supabaseClient
    .from('clips')
    .select(fullSelect, { count: 'exact' })
    .eq('visibility', 'public');

  const { text, tags } = parseSearch(exploreState.search);
  if (text) {
    query = query.ilike('title', `%${text}%`);
  }

  query = applyExploreDuration(query);
  const [orderPrimary, orderSecondary] = getExploreOrder();
  query = query.order(orderPrimary, { ascending: false });
  if (orderSecondary) {
    query = query.order(orderSecondary, { ascending: false });
  }

  const from = (exploreState.page - 1) * EXPLORE_PAGE_SIZE;
  const to = from + EXPLORE_PAGE_SIZE - 1;
  let { data, error, count } = await query.range(from, to);
  if (error) {
    console.error(error);
    showToast(`Explore error: ${error.message}`);
    // Fallback: fetch without joins if RLS blocks related tables
    let fallback = supabaseClient
      .from('clips')
      .select(baseSelect, { count: 'exact' })
      .eq('visibility', 'public');
    if (text) {
      fallback = fallback.ilike('title', `%${text}%`);
    }
    fallback = applyExploreDuration(fallback);
    const [fallbackPrimary, fallbackSecondary] = getExploreOrder();
    fallback = fallback.order(fallbackPrimary, { ascending: false });
    if (fallbackSecondary) {
      fallback = fallback.order(fallbackSecondary, { ascending: false });
    }
    const fallbackResult = await fallback.range(from, to);
    data = fallbackResult.data || [];
    count = fallbackResult.count;
  }

  exploreState.totalCount = count || 0;
  exploreState.totalPages = Math.max(1, Math.ceil((count || 0) / EXPLORE_PAGE_SIZE));
  if (exploreState.page > exploreState.totalPages) {
    exploreState.page = exploreState.totalPages;
    return loadExplore();
  }

  let filtered = data || [];

  if (exploreState.tag) {
    filtered = filtered.filter((clip) =>
      (clip.clip_tags || []).some((ct) => ct.tags?.name === exploreState.tag)
    );
  }

  if (tags.length) {
    filtered = filtered.filter((clip) =>
      tags.every((tag) => (clip.clip_tags || []).some((ct) => ct.tags?.name === tag))
    );
  }

  if (exploreState.duration && filtered.length) {
    const [min, max] = exploreState.duration.split('-');
    filtered = filtered.filter((clip) => {
      if (!clip.duration_seconds) return true;
      if (max === '+') return clip.duration_seconds >= Number(min);
      return clip.duration_seconds >= Number(min) && clip.duration_seconds < Number(max);
    });
  }

  if (exploreState.sort === 'views') {
    filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
  } else if (exploreState.sort === 'likes') {
    filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  } else if (exploreState.sort === 'trending') {
    filtered.sort((a, b) => ((b.views_count || 0) + (b.likes_count || 0)) - ((a.views_count || 0) + (a.likes_count || 0)));
  } else {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  clipCache.clear();
  filtered.forEach((clip) => clipCache.set(clip.id, clip));

  grid.innerHTML = filtered.map(buildClipCard).join('');
  updateExploreStatus(filtered.length);
  renderExplorePagination();
  await hydrateUserReactions(filtered.map((clip) => clip.id));
  if (window.veloStagger) {
    window.veloStagger.prepareStagger();
    window.veloStagger.runReveal();
  }
};

const setupExploreFilters = () => {
  const searchInput = document.querySelector('[data-search]');
  const chips = document.querySelectorAll('.chip');
  let searchTimer;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        exploreState.search = searchInput.value.trim();
        exploreState.page = 1;
        loadExplore();
      }, 250);
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.sort) {
        document.querySelectorAll('[data-sort]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        exploreState.sort = chip.dataset.sort;
        exploreState.page = 1;
      }

      if (chip.dataset.duration) {
        document.querySelectorAll('[data-duration]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        exploreState.duration = chip.dataset.duration === '60+' ? '60-+' : chip.dataset.duration;
        exploreState.page = 1;
      }

      if (chip.dataset.tag) {
        document.querySelectorAll('[data-tag]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        exploreState.tag = chip.dataset.tag;
        exploreState.page = 1;
      }

      loadExplore();
    });
  });

  const filterBtn = document.querySelector('.filter-button');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      showToast('Advanced filters coming next.');
    });
  }
};

const setupExplorePagination = () => {
  const pagination = document.querySelector('[data-pagination]');
  if (!pagination) return;
  const prevBtn = pagination.querySelector('[data-page-prev]');
  const nextBtn = pagination.querySelector('[data-page-next]');
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (exploreState.page <= 1) return;
      exploreState.page -= 1;
      loadExplore();
      scrollToTop();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (exploreState.page >= exploreState.totalPages) return;
      exploreState.page += 1;
      loadExplore();
      scrollToTop();
    });
  }

  pagination.addEventListener('click', (event) => {
    const pageBtn = event.target.closest('[data-page]');
    if (!pageBtn) return;
    const page = Number(pageBtn.getAttribute('data-page'));
    if (!Number.isFinite(page) || page === exploreState.page) return;
    exploreState.page = page;
    loadExplore();
    scrollToTop();
  });
};
const loadDashboard = async () => {
  if (!supabaseClient) return;
  const grid = document.querySelector('[data-dashboard-grid]');
  if (!grid) return;
  const session = await fetchSession();
  if (!session) return;

  const { data, error } = await supabaseClient
    .from('clips')
    .select('id,title,created_at,visibility,thumb_path,likes_count,views_count,saves_count,pinned')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  grid.innerHTML = (data || []).map(buildDashboardCard).join('');

  const uploads = data?.length || 0;
  const views = (data || []).reduce((sum, clip) => sum + (clip.views_count || 0), 0);
  const likes = (data || []).reduce((sum, clip) => sum + (clip.likes_count || 0), 0);
  const saves = (data || []).reduce((sum, clip) => sum + (clip.saves_count || 0), 0);

  const statUploads = document.querySelector('[data-stat-uploads]');
  const statViews = document.querySelector('[data-stat-views]');
  const statLikes = document.querySelector('[data-stat-likes]');
  const statSaves = document.querySelector('[data-stat-saves]');
  const statStorage = document.querySelector('[data-stat-storage]');

  if (statUploads) statUploads.textContent = uploads;
  if (statViews) statViews.textContent = views;
  if (statLikes) statLikes.textContent = likes;
  if (statSaves) statSaves.textContent = saves;
  if (statStorage) statStorage.textContent = `${(uploads * 0.15).toFixed(1)} GB`;

  if (window.veloStagger) {
    window.veloStagger.prepareStagger();
    window.veloStagger.runReveal();
  }
};

const loadSaved = async () => {
  if (!supabaseClient) return;
  const grid = document.querySelector('[data-saved-grid]');
  if (!grid) return;
  const session = await fetchSession();
  if (!session) return;

  const { data } = await supabaseClient
    .from('saves')
    .select('clip_id, clips (id,title,created_at,visibility,thumb_path,video_path,duration,likes_count,views_count,profiles!clips_user_id_fkey(id,username),clip_tags(tags(name)))')
    .eq('user_id', session.user.id);

  const clips = (data || []).map((row) => row.clips).filter(Boolean);
  grid.innerHTML = clips.map(buildClipCard).join('');
};

const loadCollections = async () => {
  if (!supabaseClient) return;
  const grid = document.querySelector('[data-collections-grid]');
  if (!grid) return;
  const session = await fetchSession();

  let query = supabaseClient.from('collections').select('*').order('created_at', { ascending: false });
  if (session) query = query.eq('user_id', session.user.id);
  else query = query.eq('visibility', 'public');

  const { data } = await query;
  grid.innerHTML = (data || []).map((col) => `
    <article class="clip-card" data-collection-id="${col.id}">
      <div class="clip-thumb"></div>
      <div class="clip-meta">
        <h3>${col.title}</h3>
        <span>${col.visibility} � ${formatTimeAgo(col.created_at)}</span>
      </div>
    </article>
  `).join('');
};

const loadFollowing = async () => {
  if (!supabaseClient) return;
  const grid = document.querySelector('[data-following-grid]');
  if (!grid) return;
  const session = await fetchSession();
  if (!session) return;

  const { data: follows } = await supabaseClient
    .from('follows')
    .select('following_id')
    .eq('follower_id', session.user.id);

  const ids = (follows || []).map((row) => row.following_id);
  if (!ids.length) {
    grid.innerHTML = '';
    return;
  }

  const { data } = await supabaseClient
    .from('clips')
    .select('id,title,created_at,visibility,thumb_path,video_path,duration,likes_count,views_count,profiles!clips_user_id_fkey(id,username),clip_tags(tags(name))')
    .in('user_id', ids)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  grid.innerHTML = (data || []).map(buildClipCard).join('');
};

const loadTagPage = async () => {
  if (!supabaseClient || page !== 'tag') return;
  const grid = document.querySelector('[data-tag-grid]');
  const title = document.querySelector('[data-tag-title]');
  const subtitle = document.querySelector('[data-tag-subtitle]');
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');
  if (!tag || !grid) return;

  if (title) title.textContent = `#${tag}`;

  const { data } = await supabaseClient
    .from('clips')
    .select('id,title,created_at,visibility,thumb_path,video_path,duration,likes_count,views_count,profiles!clips_user_id_fkey(id,username),clip_tags(tags(name))')
    .eq('visibility', 'public');

  const filtered = (data || []).filter((clip) =>
    (clip.clip_tags || []).some((ct) => ct.tags?.name === tag)
  );

  if (subtitle) subtitle.textContent = `${filtered.length} clips`;
  grid.innerHTML = filtered.map(buildClipCard).join('');
};

const loadProfile = async () => {
  if (!supabaseClient || page !== 'profile') return;
  const grid = document.querySelector('[data-profile-grid]');
  const nameEl = document.querySelector('[data-profile-name]');
  const userEl = document.querySelector('[data-profile-username]');
  const bioEl = document.querySelector('[data-profile-bio]');
  const avatarEl = document.querySelector('[data-profile-avatar]');
  const followBtn = document.querySelector('[data-follow-id]');

  const params = new URLSearchParams(window.location.search);
  const username = params.get('user');
  const userId = params.get('id');

  if (!username && !userId) return;

  const profileQuery = userId
    ? supabaseClient.from('profiles').select('*').eq('id', userId).single()
    : supabaseClient.from('profiles').select('*').eq('username', username).single();

  const { data: profile } = await profileQuery;
  if (!profile) return;

  if (!profile.profile_visible) {
    if (nameEl) nameEl.textContent = 'Private Profile';
    if (userEl) userEl.textContent = '';
    if (bioEl) bioEl.textContent = '';
    if (grid) grid.innerHTML = '';
    return;
  }

  if (nameEl) nameEl.textContent = profile.display_name || profile.username;
  if (userEl) userEl.textContent = `@${profile.username}`;
  if (bioEl) bioEl.textContent = profile.bio || '';
  if (avatarEl && profile.avatar_url) {
    avatarEl.style.backgroundImage = `url('${profile.avatar_url}')`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
  }
  if (followBtn) followBtn.setAttribute('data-follow-id', profile.id);

  if (grid) {
    const { data: clips } = await supabaseClient
      .from('clips')
      .select('id,title,created_at,visibility,thumb_path,video_path,duration,likes_count,views_count,profiles!clips_user_id_fkey(id,username),clip_tags(tags(name))')
      .eq('user_id', profile.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    grid.innerHTML = (clips || []).map(buildClipCard).join('');
  }
};

const loadClipPage = async () => {
  if (!supabaseClient || page !== 'clip') return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const secret = params.get('secret');
  const id = params.get('id');

  let clip;
  if (slug && secret) {
    const { data } = await supabaseClient.rpc('get_unlisted_clip', { p_slug: slug, p_secret: secret });
    clip = data?.[0];
  } else if (id) {
    const { data } = await supabaseClient.from('clips').select('*').eq('id', id).single();
    clip = data;
  }

  if (!clip) return;

  const titleEl = document.querySelector('[data-clip-title]');
  const creatorEl = document.querySelector('[data-clip-creator]');
  const embedEl = document.querySelector('[data-embed-code]');
  const player = document.querySelector('[data-clip-player]');
  const copyBtn = document.querySelector('[data-clip-copy]');
  if (titleEl) titleEl.textContent = clip.title || 'Untitled Clip';
  if (creatorEl) creatorEl.textContent = '@creator';
  if (embedEl) {
    const url = clip.visibility === 'unlisted'
      ? `${getBaseUrl()}clip.html?slug=${clip.clip_slug}&secret=${clip.clip_secret}`
      : `${getBaseUrl()}clip.html?id=${clip.id}`;
    embedEl.textContent = `<iframe src=\"${url}\" width=\"640\" height=\"360\" frameborder=\"0\"></iframe>`;
    if (copyBtn) copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    };
  }
  if (player) {
    const url = `${SUPABASE_URL}/storage/v1/object/public/clips/${clip.video_path}`;
    player.innerHTML = `<video src="${url}" controls playsinline style="width:100%; height:100%;"></video>`;
  }
};
const hydrateUserReactions = async (clipIds) => {
  if (!supabaseClient) return;
  const session = await fetchSession();
  if (!session || clipIds.length === 0) return;

  const { data: liked } = await supabaseClient
    .from('likes')
    .select('clip_id')
    .in('clip_id', clipIds)
    .eq('user_id', session.user.id);

  const { data: saved } = await supabaseClient
    .from('saves')
    .select('clip_id')
    .in('clip_id', clipIds)
    .eq('user_id', session.user.id);

  const likedSet = new Set((liked || []).map((row) => row.clip_id));
  const savedSet = new Set((saved || []).map((row) => row.clip_id));

  document.querySelectorAll('[data-clip-id]').forEach((card) => {
    const clipId = card.getAttribute('data-clip-id');
    if (likedSet.has(clipId)) {
      const likeBtn = card.querySelector('[data-action="like"]');
      if (likeBtn) likeBtn.setAttribute('aria-pressed', 'true');
      const likeIcon = card.querySelector('[data-like-icon] use');
      if (likeIcon) likeIcon.setAttribute('href', 'sprite.svg#icon-heart-filled');
    }
    if (savedSet.has(clipId)) {
      const saveBtn = card.querySelector('[data-action="save"]');
      if (saveBtn) saveBtn.setAttribute('aria-pressed', 'true');
    }
  });
};

const setupClipActions = () => {
  document.addEventListener('click', async (event) => {
    if (!supabaseClient) return;
    const likeBtn = event.target.closest('[data-action="like"]');
    const saveBtn = event.target.closest('[data-action="save"]');
    const shareBtn = event.target.closest('[data-action="share"]');
    const downloadBtn = event.target.closest('[data-action="download"]');
    const card = event.target.closest('[data-clip-id]');

    if (likeBtn && card) {
      event.preventDefault();
      const session = await fetchSession();
      if (!session) return alert('Please log in to like clips.');
      const clipId = card.getAttribute('data-clip-id');
      const isActive = likeBtn.getAttribute('aria-pressed') === 'true';
      const countEl = card.querySelector('.like-count');
      const iconUse = likeBtn.querySelector('[data-like-icon] use');
      const currentCount = countEl ? Number(countEl.textContent) : 0;
      if (isActive) {
        await supabaseClient.from('likes').delete().eq('clip_id', clipId).eq('user_id', session.user.id);
        likeBtn.setAttribute('aria-pressed', 'false');
        if (iconUse) iconUse.setAttribute('href', 'sprite.svg#icon-heart');
        if (countEl) countEl.textContent = Math.max(0, currentCount - 1);
      } else {
        await supabaseClient.from('likes').insert({ clip_id: clipId, user_id: session.user.id });
        likeBtn.setAttribute('aria-pressed', 'true');
        if (iconUse) iconUse.setAttribute('href', 'sprite.svg#icon-heart-filled');
        if (countEl) countEl.textContent = currentCount + 1;
      }
    }

    if (saveBtn && card) {
      event.preventDefault();
      const session = await fetchSession();
      if (!session) return alert('Please log in to save clips.');
      const clipId = card.getAttribute('data-clip-id');
      const isActive = saveBtn.getAttribute('aria-pressed') === 'true';
      if (isActive) {
        await supabaseClient.from('saves').delete().eq('clip_id', clipId).eq('user_id', session.user.id);
        saveBtn.setAttribute('aria-pressed', 'false');
      } else {
        await supabaseClient.from('saves').insert({ clip_id: clipId, user_id: session.user.id });
        saveBtn.setAttribute('aria-pressed', 'true');
      }
    }

    if (shareBtn && card) {
      event.preventDefault();
      const clipId = card.getAttribute('data-clip-id');
      const clip = clipCache.get(clipId);
      if (clip) {
        const shareUrl = clip.visibility === 'unlisted'
          ? `${getBaseUrl()}clip.html?slug=${clip.clip_slug}&secret=${clip.clip_secret}`
          : `${getBaseUrl()}clip.html?id=${clip.id}`;
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied');
      }
    }

    if (downloadBtn && card) {
      event.preventDefault();
      const clipId = card.getAttribute('data-clip-id');
      const clip = clipCache.get(clipId);
      if (!clip) return;
      if (!clip.allow_downloads) {
        showToast('Downloads disabled');
        return;
      }
      const url = `${SUPABASE_URL}/storage/v1/object/public/clips/${clip.video_path}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = clip.video_path?.split('/').pop() || 'velo-clip';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error(err);
        showToast('Download failed');
      }
    }

    if (card && !likeBtn && !saveBtn && !shareBtn) {
      const clipId = card.getAttribute('data-clip-id');
      if (clipId) {
        await supabaseClient.from('views').insert({ clip_id: clipId });
      }
    }

    if (card && event.target.closest('[data-action="delete"]')) {
      const clipId = card.getAttribute('data-clip-id');
      if (!clipId) return;
      if (!confirm('Delete this clip?')) return;
      await supabaseClient.from('clips').delete().eq('id', clipId);
      card.remove();
    }

    if (card && event.target.closest('[data-action="visibility"]')) {
      const clipId = card.getAttribute('data-clip-id');
      if (!clipId) return;
      const meta = card.querySelector('.clip-meta span');
      const current = meta?.textContent?.split(' � ')[0] || 'public';
      const next = current === 'public' ? 'unlisted' : current === 'unlisted' ? 'private' : 'public';
      await supabaseClient.from('clips').update({ visibility: next }).eq('id', clipId);
      if (meta) meta.textContent = `${next} � just now`;
    }

    if (card && event.target.closest('[data-action="pin"]')) {
      const clipId = card.getAttribute('data-clip-id');
      await supabaseClient.from('clips').update({ pinned: true }).eq('id', clipId);
      showToast('Pinned');
    }

    const dismissBtn = event.target.closest('[data-action="dismiss-report"]');
    if (dismissBtn) {
      const reportId = dismissBtn.getAttribute('data-report-id');
      if (reportId) {
        await supabaseClient.from('reports').delete().eq('id', reportId);
        dismissBtn.closest('.list-item')?.remove();
        showToast('Report dismissed');
      }
    }

    if (card && event.target.closest('[data-action="edit"]')) {
      const clipId = card.getAttribute('data-clip-id');
      const newTitle = prompt('New title');
      if (!newTitle) return;
      await supabaseClient.from('clips').update({ title: newTitle }).eq('id', clipId);
      const titleEl = card.querySelector('.clip-meta h3');
      if (titleEl) titleEl.textContent = newTitle;
      showToast('Title updated');
    }

    if (card && event.target.closest('[data-action="replace"]')) {
      const clipId = card.getAttribute('data-clip-id');
      const file = await selectFile('video/*');
      if (!file) return;
      const session = await fetchSession();
      if (!session) return;

      const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseClient.storage.from('clips').upload(fileName, file);
      if (uploadError) return alert(uploadError.message);

      const { blob, duration } = await createThumbnail(file);
      let thumbPath = null;
      if (blob) {
        const thumbName = `${session.user.id}/${Date.now()}-${file.name}.jpg`;
        const { error: thumbErr } = await supabaseClient.storage.from('thumbs').upload(thumbName, blob);
        if (!thumbErr) thumbPath = thumbName;
      }

      await supabaseClient.from('clips').update({
        video_path: fileName,
        thumb_path: thumbPath,
        duration: `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`,
        duration_seconds: Math.floor(duration)
      }).eq('id', clipId);

      if (thumbPath) {
        const thumb = card.querySelector('.clip-thumb');
        if (thumb) {
          thumb.style.backgroundImage = `url('${SUPABASE_URL}/storage/v1/object/public/thumbs/${thumbPath}')`;
          thumb.style.backgroundSize = 'cover';
          thumb.style.backgroundPosition = 'center';
        }
      }
      showToast('Video replaced');
    }

    if (card && event.target.closest('[data-action="thumbnail"]')) {
      const clipId = card.getAttribute('data-clip-id');
      const file = await selectFile('image/*');
      if (!file) return;
      const session = await fetchSession();
      if (!session) return;

      const thumbName = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: thumbErr } = await supabaseClient.storage.from('thumbs').upload(thumbName, file);
      if (thumbErr) return alert(thumbErr.message);

      await supabaseClient.from('clips').update({ thumb_path: thumbName }).eq('id', clipId);
      const thumb = card.querySelector('.clip-thumb');
      if (thumb) {
        thumb.style.backgroundImage = `url('${SUPABASE_URL}/storage/v1/object/public/thumbs/${thumbName}')`;
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';
      }
      showToast('Thumbnail updated');
    }
  });
};

const setupAuthForms = () => {
  const loginForm = document.querySelector('[data-login-form]');
  const signupForm = document.querySelector('[data-signup-form]');

  const setMessage = (form, message, isError = false) => {
    const box = form?.querySelector('[data-auth-message]');
    if (!box) return;
    box.textContent = message;
    box.style.color = isError ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)';
  };

  if (isUnsupportedOrigin()) {
    const msg = 'Auth only works on GitHub Pages or a local server, not on github.com or file://';
    setMessage(loginForm, msg, true);
    setMessage(signupForm, msg, true);
  }

  if (!supabaseClient) {
    const msg = 'Supabase client failed to load. Check that supabase.js and the CDN script are loading.';
    setMessage(loginForm, msg, true);
    setMessage(signupForm, msg, true);
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value.trim();
      const password = loginForm.querySelector('[name="password"]').value.trim();
      if (!email || !password) {
        setMessage(loginForm, 'Enter your email and password.', true);
        return;
      }
      setMessage(loginForm, '');
      try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.includes('Email not confirmed')
            ? 'Please confirm your email before logging in.'
            : error.message;
          setMessage(loginForm, msg, true);
          return;
        }
        window.location.href = 'dashboard.html';
      } catch (err) {
        setMessage(loginForm, 'Network error. Open the GitHub Pages URL (not github.com or file://).', true);
        console.error(err);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = signupForm.querySelector('[name="email"]').value.trim();
      const password = signupForm.querySelector('[name="password"]').value.trim();
      const displayName = signupForm.querySelector('[name="display_name"]').value.trim();
      const rawUsername = signupForm.querySelector('[name="username"]').value.trim().replace('@', '');
      const username = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setMessage(signupForm, '');
      if (!email || !password || !username) {
        setMessage(signupForm, 'Email, password, and username are required.', true);
        return;
      }

      try {
        const { data: existing, error: existingError } = await supabaseClient
          .from('profiles')
          .select('id')
          .ilike('username', username)
          .limit(1);
        if (existingError) {
          console.warn(existingError);
        }
        if (existing && existing.length) {
          setMessage(signupForm, 'Username is already taken.', true);
          return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, username },
            emailRedirectTo: AUTH_REDIRECT
          }
        });

        if (error) {
          setMessage(signupForm, error.message, true);
          return;
        }

        if (data.session) {
          await supabaseClient.from('profiles').upsert(
            { id: data.user.id, username, display_name: displayName },
            { onConflict: 'id' }
          );
          window.location.href = 'dashboard.html';
          return;
        }

        setMessage(signupForm, 'Check your email to confirm your account, then log in.');
      } catch (err) {
        setMessage(signupForm, 'Network error. Open the GitHub Pages URL (not github.com or file://).', true);
        console.error(err);
      }
    });
  }
};

const setupUpload = () => {
  const uploadForm = document.querySelector('[data-upload-form]');
  const fileInput = document.querySelector('[data-upload-file]');
  const progressBar = document.querySelector('[data-upload-progress]');
  const statusText = document.querySelector('[data-upload-status]');
  const dropzone = document.querySelector('.dropzone');
  const previewVideo = document.querySelector('[data-upload-preview]');
  const loadedText = document.querySelector('[data-upload-loaded]');
  let isUploading = false;
  if (!uploadForm || !fileInput || !supabaseClient) return;

  fetchSession().then(async (session) => {
    if (!session) return;
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) return;
    const visibilityRadio = uploadForm.querySelector(`[name=\"visibility\"][value=\"${profile.default_visibility}\"]`);
    if (visibilityRadio) visibilityRadio.checked = true;
    const allowDownloads = uploadForm.querySelector('[name=\"allow_downloads\"]');
    const allowEmbed = uploadForm.querySelector('[name=\"allow_embed\"]');
    if (allowDownloads) allowDownloads.checked = Boolean(profile.default_allow_downloads);
    if (allowEmbed) allowEmbed.checked = Boolean(profile.default_allow_embed);
  });

  const setStatusForSelection = (count) => {
    if (!loadedText || isUploading) return;
    if (count > 1) {
      loadedText.textContent = 'Loading...';
      setTimeout(() => {
        if (!isUploading) loadedText.textContent = `${count}/${count} clips loaded`;
      }, 200);
    } else {
      loadedText.textContent = '';
    }
    if (statusText && !isUploading) statusText.textContent = 'Waiting for upload...';
  };

  const clearPreview = () => {
    if (!previewVideo || !dropzone) return;
    const previousUrl = previewVideo.dataset.previewUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    previewVideo.removeAttribute('src');
    previewVideo.removeAttribute('data-preview-url');
    dropzone.classList.remove('has-preview');
    dropzone.classList.remove('is-loading');
    dropzone.classList.remove('has-bulk');
  };

  const handleSelectedFiles = (files) => {
    if (!files || !files.length) {
      clearPreview();
      setStatusForSelection(0);
      return;
    }

    if (files.length > 1) {
      clearPreview();
      dropzone.classList.add('has-bulk');
      setStatusForSelection(files.length);
      return;
    }

    const file = files[0];
    if (!file || !dropzone || !previewVideo) return;
    clearPreview();
    dropzone.classList.add('is-loading');
    const url = URL.createObjectURL(file);
    previewVideo.dataset.previewUrl = url;
    previewVideo.src = url;
    previewVideo.onloadeddata = () => {
      dropzone.classList.remove('is-loading');
      dropzone.classList.add('has-preview');
    };
    previewVideo.onerror = () => {
      dropzone.classList.remove('is-loading');
    };
    setStatusForSelection(1);
  };

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      handleSelectedFiles(Array.from(fileInput.files || []));
    });
  }

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const session = await fetchSession();
    if (!session) return alert('Please log in first.');

    const files = Array.from(fileInput.files || []);
    if (!files.length) return alert('Select a video file.');

    if (loadedText) loadedText.textContent = '';
    const baseTitle = uploadForm.querySelector('[name="title"]').value.trim();
    const description = uploadForm.querySelector('[name="description"]').value.trim();
    const visibility = uploadForm.querySelector('[name="visibility"]:checked')?.value || 'public';
    const tagsRaw = uploadForm.querySelector('[name="tags"]').value;
    const tags = tagsRaw.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    const allowDownloads = uploadForm.querySelector('[name="allow_downloads"]').checked;
    const allowEmbed = uploadForm.querySelector('[name="allow_embed"]').checked;
    const contentWarning = uploadForm.querySelector('[name="content_warning"]').checked;

    if (!baseTitle) return alert('Title is required.');

    isUploading = true;
    const total = files.length;

    for (let index = 0; index < total; index += 1) {
      const file = files[index];
      const clipTitle = total > 1 ? `${baseTitle} ${index + 1}` : baseTitle;

      if (statusText) statusText.textContent = `Uploading ${index + 1}/${total}...`;
      if (progressBar) {
        const base = 10;
        const step = 60 * (index / total);
        progressBar.style.width = `${base + step}%`;
      }

      const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseClient.storage.from('clips').upload(fileName, file);
      if (uploadError) return alert(uploadError.message);

      if (progressBar) {
        const base = 70;
        const step = 10 * (index / total);
        progressBar.style.width = `${base + step}%`;
      }
      if (statusText) statusText.textContent = `Generating thumbnail ${index + 1}/${total}...`;

      const { blob, duration } = await createThumbnail(file);
      let thumbPath = null;
      if (blob) {
        const thumbName = `${session.user.id}/${Date.now()}-${file.name}.jpg`;
        const { error: thumbErr } = await supabaseClient.storage.from('thumbs').upload(thumbName, blob);
        if (!thumbErr) thumbPath = thumbName;
      }

      if (progressBar) {
        const base = 80;
        const step = 10 * (index / total);
        progressBar.style.width = `${base + step}%`;
      }
      if (statusText) statusText.textContent = `Publishing ${index + 1}/${total}...`;

      const slug = `${clipTitle}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const clipSecret = randomSecret();

      const { data: clipData, error: clipError } = await supabaseClient.from('clips').insert({
        user_id: session.user.id,
        title: clipTitle,
        description,
        visibility,
        video_path: fileName,
        thumb_path: thumbPath,
        duration: `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`,
        duration_seconds: Math.floor(duration),
        allow_downloads: allowDownloads,
        allow_embed: allowEmbed,
        content_warning: contentWarning,
        clip_slug: slug || `${session.user.id}-${Date.now()}`,
        clip_secret: clipSecret
      }).select().single();

      if (clipError) return alert(clipError.message);

      for (const tag of tags) {
        const { data: tagRow } = await supabaseClient.from('tags').upsert({ name: tag }).select().single();
        if (tagRow) {
          await supabaseClient.from('clip_tags').insert({ clip_id: clipData.id, tag_id: tagRow.id });
        }
      }
    }

    if (progressBar) progressBar.style.width = '100%';
    if (statusText) statusText.textContent = `Published ${total}/${total}.`;
    isUploading = false;
    window.location.href = 'dashboard.html';
  });
};
const hydrateFollows = async () => {
  const session = await fetchSession();
  if (!session || !supabaseClient) return;

  const buttons = Array.from(document.querySelectorAll('[data-follow-id]'))
    .filter((btn) => btn.getAttribute('data-follow-id'));

  if (buttons.length === 0) return;

  const followIds = buttons.map((btn) => btn.getAttribute('data-follow-id'));
  const { data } = await supabaseClient
    .from('follows')
    .select('following_id')
    .in('following_id', followIds)
    .eq('follower_id', session.user.id);

  const followed = new Set((data || []).map((row) => row.following_id));
  buttons.forEach((btn) => {
    const id = btn.getAttribute('data-follow-id');
    if (followed.has(id)) {
      btn.textContent = 'Following';
      btn.setAttribute('aria-pressed', 'true');
    }
  });
};

const setupFollowButtons = () => {
  document.addEventListener('click', async (event) => {
    if (!supabaseClient) return;
    const followBtn = event.target.closest('[data-follow-id]');
    if (!followBtn) return;
    const targetId = followBtn.getAttribute('data-follow-id');
    if (!targetId) return;

    const session = await fetchSession();
    if (!session) return alert('Please log in to follow creators.');

    const isFollowing = followBtn.getAttribute('aria-pressed') === 'true';
    if (isFollowing) {
      await supabaseClient
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', targetId);
      followBtn.textContent = 'Follow';
      followBtn.setAttribute('aria-pressed', 'false');
    } else {
      await supabaseClient.from('follows').insert({
        follower_id: session.user.id,
        following_id: targetId
      });
      followBtn.textContent = 'Following';
      followBtn.setAttribute('aria-pressed', 'true');
    }
  });
};

const hydrateModal = (clipId) => {
  const clip = clipCache.get(clipId);
  if (!clip) return;
  const titleEl = document.querySelector('[data-modal-title]');
  const tagsEl = document.querySelector('[data-modal-tags]');
  const creatorEl = document.querySelector('[data-modal-creator]');
  const followBtn = document.querySelector('.modal [data-follow-id]');
  const downloadBtn = document.querySelector('[data-modal-download]');

  if (titleEl) titleEl.textContent = clip.title || 'Untitled Clip';
  if (creatorEl) creatorEl.textContent = `@${clip.profiles?.username || 'creator'}`;
  if (tagsEl) {
    const tags = (clip.clip_tags || []).map((ct) => ct.tags?.name).filter(Boolean);
    tagsEl.innerHTML = tags.map((tag) => `<span class="tag">#${tag}</span>`).join('');
  }
  if (followBtn) followBtn.setAttribute('data-follow-id', clip.profiles?.id || '');
  if (followBtn) {
    followBtn.textContent = 'Follow';
    followBtn.setAttribute('aria-pressed', 'false');
  }
  if (downloadBtn) downloadBtn.style.display = clip.allow_downloads ? 'inline-flex' : 'none';
};

const setupModalActions = () => {
  document.addEventListener('click', async (event) => {
    const copyBtn = event.target.closest('[data-modal-copy]');
    const downloadBtn = event.target.closest('[data-modal-download]');
    const reportBtn = event.target.closest('[data-modal-report]');
    const likeBtn = event.target.closest('[data-modal-like]');
    const saveBtn = event.target.closest('[data-modal-save]');
    const openCard = event.target.closest('[data-clip-id]');

    if (openCard) {
      currentClipId = openCard.getAttribute('data-clip-id');
      hydrateModal(currentClipId);
    }

    const activeClipId = currentClipId || openCard?.getAttribute('data-clip-id');
    if (copyBtn && activeClipId) {
      const clip = clipCache.get(activeClipId);
      if (!clip) return;
      const shareUrl = clip.visibility === 'unlisted'
        ? `${getBaseUrl()}clip.html?slug=${clip.clip_slug}&secret=${clip.clip_secret}`
        : `${getBaseUrl()}clip.html?id=${clip.id}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied');
    }

    if (downloadBtn && activeClipId) {
      const clip = clipCache.get(activeClipId);
      if (!clip) return;
      const url = `${SUPABASE_URL}/storage/v1/object/public/clips/${clip.video_path}`;
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = clip.video_path?.split('/').pop() || 'velo-clip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    if (reportBtn && activeClipId) {
      if (!supabaseClient) return;
      const session = await fetchSession();
      if (!session) return alert('Please log in to report clips.');
      const reason = prompt('Reason for report?');
      if (!reason) return;
      await supabaseClient.from('reports').insert({ reporter_id: session.user.id, clip_id: activeClipId, reason });
      showToast('Report submitted');
    }

    if ((likeBtn || saveBtn) && activeClipId) {
      document.querySelector(`[data-clip-id="${activeClipId}"] ${likeBtn ? '[data-action="like"]' : '[data-action="save"]'}`)?.click();
    }
  });
};

const setupDashboardTabs = () => {
  const tabs = document.querySelectorAll('[data-dashboard-tabs] .tab');
  const panels = document.querySelectorAll('[data-tab-panel]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      panels.forEach((panel) => {
        panel.style.display = panel.dataset.tabPanel === target ? '' : 'none';
      });
      if (target === 'collections') loadCollections();
      if (target === 'saved') loadSaved();
    });
  });
};

const setupDashboardActions = () => {
  document.addEventListener('click', (event) => {
    const uploadBtn = event.target.closest('[data-action="upload-new"]');
    const collectionBtn = event.target.closest('[data-action="new-collection"]');
    if (uploadBtn) window.location.href = 'upload.html';
    if (collectionBtn) createCollection();
  });
};

const createCollection = async () => {
  if (!supabaseClient) return;
  const session = await fetchSession();
  if (!session) return alert('Please log in.');
  const title = prompt('Collection title');
  if (!title) return;
  await supabaseClient.from('collections').insert({ user_id: session.user.id, title, visibility: 'private' });
  showToast('Collection created');
  loadCollections();
};

const setupSettings = async () => {
  if (!supabaseClient || page !== 'settings') return;
  const session = await fetchSession();
  if (!session) return;

  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
  const settingInputs = document.querySelectorAll('[data-setting]');
  const pendingSettings = {};
  settingInputs.forEach((input) => {
    const key = input.dataset.setting;
    if (!key || !profile) return;
    if (key === 'default_visibility') {
      input.checked = profile.default_visibility === 'public';
      pendingSettings[key] = profile.default_visibility;
    } else if (key === 'default_speed') {
      input.checked = (profile.default_speed || 1) > 1;
      pendingSettings[key] = profile.default_speed || 1.0;
    } else {
      input.checked = Boolean(profile[key]);
      pendingSettings[key] = profile[key];
    }
  });

  settingInputs.forEach((input) => {
    input.addEventListener('change', async () => {
      const key = input.dataset.setting;
      if (!key) return;
      let value;
      if (key === 'default_visibility') {
        value = input.checked ? 'public' : 'private';
      } else if (key === 'default_speed') {
        value = input.checked ? 1.25 : 1.0;
      } else {
        value = input.checked;
      }
      pendingSettings[key] = value;
    });
  });

  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'display-name') {
      const value = prompt('New display name');
      if (!value) return;
      await supabaseClient.from('profiles').update({ display_name: value }).eq('id', session.user.id);
      showToast('Display name updated');
    }

    if (action === 'username') {
      const value = prompt('New username');
      if (!value) return;
      await supabaseClient.from('profiles').update({ username: value.replace('@', '') }).eq('id', session.user.id);
      showToast('Username updated');
    }

    if (action === 'email') {
      const value = prompt('New email');
      if (!value) return;
      await supabaseClient.auth.updateUser({ email: value });
      showToast('Email update requested. Check your inbox.');
    }

    if (action === 'reset-password') {
      const value = prompt('Email for password reset');
      if (!value) return;
      await supabaseClient.auth.resetPasswordForEmail(value, { redirectTo: AUTH_REDIRECT });
      showToast('Password reset email sent');
    }

    if (action === 'save-settings') {
      await supabaseClient.from('profiles').update(pendingSettings).eq('id', session.user.id);
      showToast('Settings saved');
    }

    if (action === 'signout') {
      await supabaseClient.auth.signOut({ scope: 'global' });
      window.location.href = 'index.html';
    }

    if (action === 'export') {
      showToast('Export requested');
    }

    if (action === 'delete-account') {
      alert('Delete account requires admin privileges in Supabase.');
    }
  });
};

const setupCollectionsPage = () => {
  if (page === 'collections') loadCollections();
};

const setupFollowingPage = () => {
  if (page === 'following') loadFollowing();
};

const loadAdmin = async () => {
  if (!supabaseClient || page !== 'admin') return;
  const list = document.querySelector('[data-admin-reports]');
  if (!list) return;
  const session = await fetchSession();
  if (!session) return;

  const { data } = await supabaseClient
    .from('reports')
    .select('id,reason,created_at,clip_id,reported_user_id')
    .order('created_at', { ascending: false });

  list.innerHTML = (data || []).map((rep) => `
    <div class="list-item">
      <div>
        <strong>Report ${rep.clip_id ? `Clip` : 'User'}</strong>
        <div class="footer-note">Reason: ${rep.reason} - ${formatTimeAgo(rep.created_at)}</div>
      </div>
      <div class="tag-row">
        <button class="button-secondary" data-action="dismiss-report" data-report-id="${rep.id}">Dismiss</button>
      </div>
    </div>
  `).join('');
};

const bootstrap = async () => {
  initDebugBanner();
  if (!supabaseClient) {
    alert('Supabase client failed to load. Check your GitHub Pages URL config.');
    return;
  }

  await fetchSession();
  document.body.setAttribute('data-auth-ready', 'true');
  setupAuthForms();
  setupUpload();
  setupClipActions();
  setupModalActions();
  setupFollowButtons();
  setupDashboardTabs();
  setupDashboardActions();
  setupSettings();

  if (page === 'explore') {
    setupExploreFilters();
    setupExplorePagination();
    await loadExplore();
  }
  if (page === 'dashboard') {
    await loadDashboard();
  }
  if (page === 'profile') await loadProfile();
  if (page === 'tag') await loadTagPage();
  if (page === 'clip') await loadClipPage();
  setupCollectionsPage();
  setupFollowingPage();
  await loadAdmin();
  await hydrateFollows();
};

bootstrap();



