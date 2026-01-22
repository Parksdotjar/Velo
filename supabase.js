const SUPABASE_URL = 'https://juagusbfswxcwenzegfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWd1c2Jmc3d4Y3dlbnplZ2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzk5NzksImV4cCI6MjA4NDYxNTk3OX0.fe76LO6mVP9Okqj9JNhr2EQF7mx-o6F95QrEIOz8yaw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const page = document.body.getAttribute('data-page');

const setAuthState = (session) => {
  document.body.setAttribute('data-auth', session ? 'logged-in' : 'logged-out');
};

const fetchSession = async () => {
  const { data } = await supabase.auth.getSession();
  setAuthState(data.session);
  return data.session;
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const clipCache = new Map();

const buildClipCard = (clip) => {
  const tags = (clip.clip_tags || []).map((ct) => ct.tags?.name).filter(Boolean);
  const creator = clip.profiles?.username || 'unknown';
  const creatorId = clip.profiles?.id || '';
  const time = formatTimeAgo(clip.created_at);
  const thumbUrl = clip.thumb_path
    ? `${SUPABASE_URL}/storage/v1/object/public/thumbs/${clip.thumb_path}`
    : '';
  const likesCount = clip.likes_count ?? 0;

  return `
    <article class="clip-card" data-open-modal data-clip-id="${clip.id}" data-user-id="${creatorId}">
      <div class="clip-thumb" style="${thumbUrl ? `background-image: url('${thumbUrl}'); background-size: cover; background-position: center;` : ''}">
        <div class="thumb-overlay">${clip.duration || '00:00'}</div>
      </div>
      <div class="clip-meta">
        <h3>${clip.title || 'Untitled Clip'}</h3>
        <span>@${creator} • ${time}</span>
      </div>
      <div class="tag-row">
        ${tags.slice(0, 3).map((tag) => `<span class="tag">#${tag}</span>`).join('')}
      </div>
      <div class="quick-actions">
        <div class="tag-row">
          <button class="icon-button" data-action="like" aria-label="Like">
            <svg class="icon"><use href="sprite.svg#icon-heart"></use></svg>
          </button>
          <span class="like-count">${likesCount}</span>
          <button class="icon-button" data-action="save" aria-label="Save">
            <svg class="icon"><use href="sprite.svg#icon-bookmark"></use></svg>
          </button>
          <button class="icon-button" aria-label="Share">
            <svg class="icon"><use href="sprite.svg#icon-share"></use></svg>
          </button>
        </div>
        <button class="icon-button" aria-label="More">
          <svg class="icon"><use href="sprite.svg#icon-more"></use></svg>
        </button>
      </div>
    </article>
  `;
};

let exploreState = {
  sort: 'new',
  duration: null,
  tag: null,
  search: ''
};

const parseSearch = (value) => {
  const parts = value.split(' ').filter(Boolean);
  const tags = parts.filter((p) => p.startsWith('#')).map((p) => p.replace('#', ''));
  const text = parts.filter((p) => !p.startsWith('#')).join(' ');
  return { text, tags };
};

const loadExplore = async () => {
  const grid = document.querySelector('[data-clips-grid]');
  if (!grid) return;

  let query = supabase
    .from('clips')
    .select('id,title,created_at,visibility,thumb_path,duration,duration_seconds,likes_count,views_count,profiles(id,username),clip_tags(tags(name))')
    .eq('visibility', 'public');

  const { text, tags } = parseSearch(exploreState.search);
  if (text) {
    query = query.ilike('title', `%${text}%`);
  }

  if (exploreState.sort === 'views') {
    query = query.order('views_count', { ascending: false });
  } else if (exploreState.sort === 'likes') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(40);
  if (error) {
    console.error(error);
    return;
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

  clipCache.clear();
  filtered.forEach((clip) => clipCache.set(clip.id, clip));

  grid.innerHTML = filtered.map(buildClipCard).join('');
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
      }

      if (chip.dataset.duration) {
        document.querySelectorAll('[data-duration]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        exploreState.duration = chip.dataset.duration === '60+' ? '60-+' : chip.dataset.duration;
      }

      if (chip.dataset.tag) {
        document.querySelectorAll('[data-tag]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        exploreState.tag = chip.dataset.tag;
      }

      loadExplore();
    });
  });
};

const loadDashboard = async () => {
  const grid = document.querySelector('[data-dashboard-grid]');
  if (!grid) return;
  const session = await fetchSession();
  if (!session) return;

  const { data, error } = await supabase
    .from('clips')
    .select('id,title,created_at,visibility,thumb_path,duration')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  grid.innerHTML = (data || []).map((clip) => `
    <article class="clip-card" data-clip-id="${clip.id}">
      <div class="clip-thumb" style="${clip.thumb_path ? `background-image: url('${SUPABASE_URL}/storage/v1/object/public/thumbs/${clip.thumb_path}'); background-size: cover; background-position: center;` : ''}"></div>
      <div class="clip-meta">
        <h3>${clip.title || 'Untitled Clip'}</h3>
        <span>${clip.visibility} • ${formatTimeAgo(clip.created_at)}</span>
      </div>
      <div class="tag-row">
        <button class="button-secondary" data-action="visibility">Visibility</button>
        <button class="button-secondary" data-action="delete">Delete</button>
      </div>
    </article>
  `).join('');

  if (window.veloStagger) {
    window.veloStagger.prepareStagger();
    window.veloStagger.runReveal();
  }
};

const loadProfile = async () => {
  const grid = document.querySelector('[data-profile-grid]');
  const nameEl = document.querySelector('[data-profile-name]');
  const userEl = document.querySelector('[data-profile-username]');
  const bioEl = document.querySelector('[data-profile-bio]');
  const avatarEl = document.querySelector('[data-profile-avatar]');
  const followBtn = document.querySelector('.modal [data-follow-id]');

  const params = new URLSearchParams(window.location.search);
  const username = params.get('user');
  const userId = params.get('id');

  if (!username && !userId) return;

  const profileQuery = userId
    ? supabase.from('profiles').select('*').eq('id', userId).single()
    : supabase.from('profiles').select('*').eq('username', username).single();

  const { data: profile } = await profileQuery;
  if (!profile) return;

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
    const { data: clips } = await supabase
      .from('clips')
      .select('id,title,created_at,visibility,thumb_path,duration,likes_count,views_count,profiles(id,username),clip_tags(tags(name))')
      .eq('user_id', profile.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    grid.innerHTML = (clips || []).map(buildClipCard).join('');
    if (window.veloStagger) {
      window.veloStagger.prepareStagger();
      window.veloStagger.runReveal();
    }
  }
};

const loadClipPage = async () => {
  if (page !== 'clip') return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const secret = params.get('secret');
  const id = params.get('id');

  let clip;
  if (slug && secret) {
    const { data } = await supabase.rpc('get_unlisted_clip', { p_slug: slug, p_secret: secret });
    clip = data?.[0];
  } else if (id) {
    const { data } = await supabase.from('clips').select('*').eq('id', id).single();
    clip = data;
  }

  if (!clip) return;

  const titleEl = document.querySelector('[data-clip-title]');
  const creatorEl = document.querySelector('[data-clip-creator]');
  if (titleEl) titleEl.textContent = clip.title || 'Untitled Clip';
  if (creatorEl) creatorEl.textContent = '@creator';
};

const hydrateUserReactions = async (clipIds) => {
  const session = await fetchSession();
  if (!session || clipIds.length === 0) return;

  const { data: liked } = await supabase
    .from('likes')
    .select('clip_id')
    .in('clip_id', clipIds)
    .eq('user_id', session.user.id);

  const { data: saved } = await supabase
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
    }
    if (savedSet.has(clipId)) {
      const saveBtn = card.querySelector('[data-action="save"]');
      if (saveBtn) saveBtn.setAttribute('aria-pressed', 'true');
    }
  });
};

const setupClipActions = () => {
  document.addEventListener('click', async (event) => {
    const likeBtn = event.target.closest('[data-action="like"]');
    const saveBtn = event.target.closest('[data-action="save"]');
    const card = event.target.closest('[data-clip-id]');

    if (likeBtn && card) {
      event.preventDefault();
      const session = await fetchSession();
      if (!session) return alert('Please log in to like clips.');
      const clipId = card.getAttribute('data-clip-id');
      const isActive = likeBtn.getAttribute('aria-pressed') === 'true';
      const countEl = card.querySelector('.like-count');
      const currentCount = countEl ? Number(countEl.textContent) : 0;
      if (isActive) {
        await supabase.from('likes').delete().eq('clip_id', clipId).eq('user_id', session.user.id);
        likeBtn.setAttribute('aria-pressed', 'false');
        if (countEl) countEl.textContent = Math.max(0, currentCount - 1);
      } else {
        await supabase.from('likes').insert({ clip_id: clipId, user_id: session.user.id });
        likeBtn.setAttribute('aria-pressed', 'true');
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
        await supabase.from('saves').delete().eq('clip_id', clipId).eq('user_id', session.user.id);
        saveBtn.setAttribute('aria-pressed', 'false');
      } else {
        await supabase.from('saves').insert({ clip_id: clipId, user_id: session.user.id });
        saveBtn.setAttribute('aria-pressed', 'true');
      }
    }

    if (card && !likeBtn && !saveBtn) {
      const clipId = card.getAttribute('data-clip-id');
      if (clipId) {
        await supabase.from('views').insert({ clip_id: clipId });
      }
    }

    if (card && event.target.closest('[data-action="delete"]')) {
      const clipId = card.getAttribute('data-clip-id');
      if (!clipId) return;
      if (!confirm('Delete this clip?')) return;
      await supabase.from('clips').delete().eq('id', clipId);
      card.remove();
    }

    if (card && event.target.closest('[data-action="visibility"]')) {
      const clipId = card.getAttribute('data-clip-id');
      if (!clipId) return;
      const meta = card.querySelector('.clip-meta span');
      const current = meta?.textContent?.split(' • ')[0] || 'public';
      const next = current === 'public' ? 'unlisted' : current === 'unlisted' ? 'private' : 'public';
      await supabase.from('clips').update({ visibility: next }).eq('id', clipId);
      if (meta) meta.textContent = `${next} • just now`;
    }
  });
};

const setupAuthForms = () => {
  const loginForm = document.querySelector('[data-login-form]');
  const signupForm = document.querySelector('[data-signup-form]');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value;
      const password = loginForm.querySelector('[name="password"]').value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.href = 'dashboard.html';
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = signupForm.querySelector('[name="email"]').value;
      const password = signupForm.querySelector('[name="password"]').value;
      const displayName = signupForm.querySelector('[name="display_name"]').value;
      const username = signupForm.querySelector('[name="username"]').value;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, username } }
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          display_name: displayName
        });
      }

      window.location.href = 'dashboard.html';
    });
  }
};

const randomSecret = () => Math.random().toString(36).slice(2, 10);

const setupUpload = () => {
  const uploadForm = document.querySelector('[data-upload-form]');
  const fileInput = document.querySelector('[data-upload-file]');
  if (!uploadForm || !fileInput) return;

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const session = await fetchSession();
    if (!session) return alert('Please log in first.');

    const file = fileInput.files[0];
    if (!file) return alert('Select a video file.');

    const title = uploadForm.querySelector('[name="title"]').value;
    const description = uploadForm.querySelector('[name="description"]').value;
    const visibility = uploadForm.querySelector('[name="visibility"]:checked')?.value || 'public';
    const tagsRaw = uploadForm.querySelector('[name="tags"]').value;
    const tags = tagsRaw.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);

    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('clips').upload(fileName, file);
    if (uploadError) return alert(uploadError.message);

    const slug = `${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const clipSecret = randomSecret();

    const { data: clipData, error: clipError } = await supabase.from('clips').insert({
      user_id: session.user.id,
      title,
      description,
      visibility,
      video_path: fileName,
      clip_slug: slug || `${session.user.id}-${Date.now()}`,
      clip_secret: clipSecret
    }).select().single();

    if (clipError) return alert(clipError.message);

    if (tags.length) {
      for (const tag of tags) {
        const { data: tagRow } = await supabase.from('tags').upsert({ name: tag }).select().single();
        if (tagRow) {
          await supabase.from('clip_tags').insert({ clip_id: clipData.id, tag_id: tagRow.id });
        }
      }
    }

    window.location.href = 'dashboard.html';
  });
};

const hydrateFollows = async () => {
  const session = await fetchSession();
  if (!session) return;

  const buttons = Array.from(document.querySelectorAll('[data-follow-id]'))
    .filter((btn) => btn.getAttribute('data-follow-id'));

  if (buttons.length === 0) return;

  const followIds = buttons.map((btn) => btn.getAttribute('data-follow-id'));
  const { data } = await supabase
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
    const followBtn = event.target.closest('[data-follow-id]');
    if (!followBtn) return;
    const targetId = followBtn.getAttribute('data-follow-id');
    if (!targetId) return;

    const session = await fetchSession();
    if (!session) return alert('Please log in to follow creators.');

    const isFollowing = followBtn.getAttribute('aria-pressed') === 'true';
    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', targetId);
      followBtn.textContent = 'Follow';
      followBtn.setAttribute('aria-pressed', 'false');
    } else {
      await supabase.from('follows').insert({
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
  const followBtn = document.querySelector('[data-follow-id]');

  if (titleEl) titleEl.textContent = clip.title || 'Untitled Clip';
  if (creatorEl) creatorEl.textContent = `@${clip.profiles?.username || 'creator'}`;
  if (tagsEl) {
    const tags = (clip.clip_tags || []).map((ct) => ct.tags?.name).filter(Boolean);
    tagsEl.innerHTML = tags.map((tag) => `<span class="tag">#${tag}</span>`).join('');
  }
  if (followBtn) followBtn.setAttribute('data-follow-id', clip.profiles?.id || '');
};

const bootstrap = async () => {
  await fetchSession();
  setupAuthForms();
  setupUpload();
  setupClipActions();
  setupFollowButtons();
  await hydrateFollows();

  if (page === 'explore') {
    setupExploreFilters();
    await loadExplore();
  }
  if (page === 'dashboard') await loadDashboard();
  if (page === 'profile') await loadProfile();
  await loadClipPage();

  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-clip-id]');
    if (card) {
      hydrateModal(card.getAttribute('data-clip-id'));
    }
  });
};

bootstrap();
