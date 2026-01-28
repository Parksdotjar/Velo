const ACCESS_KEY = 'lostsignal_access';
const DOWNLOADS_KEY = 'lostsignal_downloads';
const DEFAULT_ACCESS = 'free';
const MEMBERSHIP_URL = 'https://www.patreon.com/15484552/join';
const PATREON_URL = 'https://www.patreon.com/cw/LostSignalStore';

const assets = [
  {
    id: 'ls-sfx-echo',
    title: 'Echo Drift SFX',
    description: 'Ambient whooshes and glitch hits for moody edits.',
    type: 'SFX',
    required_access: 'free',
    tags: ['audio', 'glitch', 'ambient'],
    file_size: '86 MB',
    updated: '2026-01-12',
    featured: true,
    preview_style: 'aurora'
  },
  {
    id: 'ls-overlay-grain',
    title: 'Analog Grain Overlays',
    description: 'High-res texture overlays with film grit and dust.',
    type: 'Overlay',
    required_access: 'supporter',
    tags: ['film', 'texture', 'overlay'],
    file_size: '320 MB',
    updated: '2026-01-18',
    featured: true,
    preview_style: 'coal'
  },
  {
    id: 'ls-pack-subtitles',
    title: 'Subtitle Motion Pack',
    description: 'Stylized subtitle presets with motion blur.',
    type: 'Subtitles',
    required_access: 'supporter',
    tags: ['text', 'captions', 'motion'],
    file_size: '42 MB',
    updated: '2026-01-05',
    featured: false,
    preview_style: 'signal'
  },
  {
    id: 'ls-pack-transitions',
    title: 'Signal Transition Pack',
    description: 'Glitch, warp, and static transitions for cuts.',
    type: 'Transition Pack',
    required_access: 'vip',
    tags: ['glitch', 'cut', 'warp'],
    file_size: '210 MB',
    updated: '2026-01-21',
    featured: true,
    preview_style: 'pulse'
  },
  {
    id: 'ls-overlay-flares',
    title: 'Neon Flares',
    description: 'Soft neon bloom overlays for stylized footage.',
    type: 'Overlay',
    required_access: 'free',
    tags: ['neon', 'light', 'overlay'],
    file_size: '128 MB',
    updated: '2025-12-29',
    featured: false,
    preview_style: 'flare'
  },
  {
    id: 'ls-pack-presets',
    title: 'Midnight Grade Presets',
    description: 'Cinematic grading presets tuned for dark scenes.',
    type: 'Preset Pack',
    required_access: 'supporter',
    tags: ['color', 'grade', 'cinematic'],
    file_size: '24 MB',
    updated: '2026-01-10',
    featured: false,
    preview_style: 'midnight'
  },
  {
    id: 'ls-sfx-cyber',
    title: 'Cyber UI SFX',
    description: 'Button taps, scans, and futuristic UI sounds.',
    type: 'SFX',
    required_access: 'vip',
    tags: ['ui', 'tech', 'interface'],
    file_size: '64 MB',
    updated: '2026-01-03',
    featured: false,
    preview_style: 'matrix'
  },
  {
    id: 'ls-pack-overlays',
    title: 'Signal Noise Overlays',
    description: 'Noise, scanlines, and signal distortion layers.',
    type: 'Overlay',
    required_access: 'supporter',
    tags: ['noise', 'scanline', 'retro'],
    file_size: '190 MB',
    updated: '2026-01-14',
    featured: true,
    preview_style: 'static'
  },
  {
    id: 'ls-pack-vhs',
    title: 'VHS Damage Pack',
    description: 'Tape warps, dropouts, and analog flicker.',
    type: 'Preset Pack',
    required_access: 'vip',
    tags: ['vhs', 'retro', 'texture'],
    file_size: '156 MB',
    updated: '2025-12-18',
    featured: false,
    preview_style: 'vhs'
  },
  {
    id: 'ls-pack-titles',
    title: 'Minimal Title Toolkit',
    description: 'Clean, minimal titles for cinematic edits.',
    type: 'Preset Pack',
    required_access: 'free',
    tags: ['title', 'minimal', 'clean'],
    file_size: '18 MB',
    updated: '2025-12-22',
    featured: false,
    preview_style: 'mono'
  },
  {
    id: 'ls-pack-luts',
    title: 'Deep Shadow LUTs',
    description: 'High-contrast LUTs for moody footage.',
    type: 'Preset Pack',
    required_access: 'supporter',
    tags: ['lut', 'color', 'shadow'],
    file_size: '12 MB',
    updated: '2026-01-08',
    featured: false,
    preview_style: 'shadow'
  },
  {
    id: 'ls-pack-kinetic',
    title: 'Kinetic Text Animations',
    description: 'Fast, punchy typography animations.',
    type: 'Subtitles',
    required_access: 'vip',
    tags: ['text', 'kinetic', 'motion'],
    file_size: '72 MB',
    updated: '2026-01-19',
    featured: true,
    preview_style: 'kinetic'
  }
];

const previewStyles = {
  aurora: 'linear-gradient(135deg, #0f0f0f, #3a3a3a 40%, #111)',
  coal: 'linear-gradient(135deg, #070707, #1a1a1a 55%, #000)',
  signal: 'linear-gradient(135deg, #101010, #2a2a2a 50%, #141414)',
  pulse: 'linear-gradient(135deg, #0a0a0a, #353535 50%, #111)',
  flare: 'linear-gradient(135deg, #1a1a1a, #3f3f3f 55%, #0c0c0c)',
  midnight: 'linear-gradient(135deg, #0b0b0b, #262626 50%, #0d0d0d)',
  matrix: 'linear-gradient(135deg, #0a0a0a, #2f2f2f 45%, #121212)',
  static: 'linear-gradient(135deg, #101010, #2a2a2a 55%, #080808)',
  vhs: 'linear-gradient(135deg, #0b0b0b, #333333 50%, #0f0f0f)',
  mono: 'linear-gradient(135deg, #0b0b0b, #1f1f1f 50%, #121212)',
  shadow: 'linear-gradient(135deg, #0a0a0a, #242424 55%, #111)',
  kinetic: 'linear-gradient(135deg, #0b0b0b, #3a3a3a 55%, #0c0c0c)'
};

function getAccess() {
  return localStorage.getItem(ACCESS_KEY) || DEFAULT_ACCESS;
}

function setAccess(level) {
  localStorage.setItem(ACCESS_KEY, level);
}

function hasAccess(required) {
  const order = ['free', 'supporter', 'vip'];
  return order.indexOf(getAccess()) >= order.indexOf(required);
}

function formatTier(tier) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function showToast(message) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function openModal(message, requiredTier) {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  const text = modal.querySelector('[data-modal-text]');
  if (text) {
    text.textContent = message || `This asset requires ${formatTier(requiredTier)}.`;
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function logDownload(asset) {
  const history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY) || '[]');
  history.unshift({ assetId: asset.id, title: asset.title, timeISO: new Date().toISOString() });
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history.slice(0, 50)));
}

function renderBadge(required) {
  return `<span class="badge ${required}">${formatTier(required)}</span>`;
}

function createAssetCard(asset) {
  const preview = previewStyles[asset.preview_style] || previewStyles.mono;
  const downloadLabel = hasAccess(asset.required_access) ? 'Download' : 'Join to Unlock';
  return `
    <article class="card" data-type="${asset.type}" data-access="${asset.required_access}">
      <div class="preview" style="background:${preview}"></div>
      ${renderBadge(asset.required_access)}
      <h3>${asset.title}</h3>
      <div class="meta">${asset.type} • Updated ${asset.updated}</div>
      <p class="meta">${asset.description}</p>
      <div class="card-actions">
        <a class="btn secondary" href="asset.html?id=${asset.id}">View</a>
        <button class="btn" data-download="${asset.id}">${downloadLabel}</button>
      </div>
    </article>
  `;
}

function applyFilters(list, query, chip, sort) {
  let filtered = list.slice();
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((asset) => {
      return (
        asset.title.toLowerCase().includes(q) ||
        asset.type.toLowerCase().includes(q) ||
        asset.tags.join(' ').toLowerCase().includes(q)
      );
    });
  }

  if (chip && chip !== 'All') {
    if (['Free', 'Supporter', 'VIP'].includes(chip)) {
      filtered = filtered.filter((asset) => formatTier(asset.required_access) === chip);
    } else {
      filtered = filtered.filter((asset) => asset.type.toLowerCase().includes(chip.toLowerCase()));
    }
  }

  if (sort === 'Newest') {
    filtered.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  } else if (sort === 'Featured') {
    filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
  } else if (sort === 'Name') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  return filtered;
}

function initExplorePage() {
  const grid = document.querySelector('[data-asset-grid]');
  if (!grid) return;

  const searchInput = document.querySelector('[data-search]');
  const chips = document.querySelectorAll('.chip');
  const sortSelect = document.querySelector('[data-sort]');

  let activeChip = 'All';

  function render() {
    const query = searchInput ? searchInput.value.trim() : '';
    const sort = sortSelect ? sortSelect.value : 'Newest';
    const results = applyFilters(assets, query, activeChip, sort);
    grid.innerHTML = results.map(createAssetCard).join('') || '<p class="note">No assets match that search.</p>';
    bindDownloadButtons();
  }

  if (searchInput) {
    searchInput.addEventListener('input', render);
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeChip = chip.dataset.filter || chip.textContent.trim();
      render();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', render);
  }

  render();
}

function initAssetPage() {
  const container = document.querySelector('[data-asset-detail]');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const asset = assets.find((item) => item.id === id) || assets[0];

  const preview = previewStyles[asset.preview_style] || previewStyles.mono;
  container.innerHTML = `
    <div class="preview" style="background:${preview}; height: 260px;"></div>
    <div class="tags">
      ${renderBadge(asset.required_access)}
      <span class="tag">${asset.type}</span>
      <span class="tag">${asset.file_size}</span>
      <span class="tag">Updated ${asset.updated}</span>
    </div>
    <h2>${asset.title}</h2>
    <p class="meta">${asset.description}</p>
    <div class="card-actions">
      <button class="btn" data-download="${asset.id}">${hasAccess(asset.required_access) ? 'Download' : 'Join to Unlock'}</button>
      <a class="btn secondary" href="${MEMBERSHIP_URL}" target="_blank" rel="noreferrer">Join Patreon</a>
    </div>
  `;

  const related = assets.filter((item) => item.id !== asset.id).slice(0, 4);
  const relatedGrid = document.querySelector('[data-related-grid]');
  if (relatedGrid) {
    relatedGrid.innerHTML = related.map(createAssetCard).join('');
  }

  bindDownloadButtons();
}

function initDashboardPage() {
  const levelEl = document.querySelector('[data-access-level]');
  const selectEl = document.querySelector('[data-access-select]');
  const downloadsEl = document.querySelector('[data-downloads]');
  const clearBtn = document.querySelector('[data-clear-downloads]');
  const lockedEl = document.querySelector('[data-locked-grid]');

  if (!levelEl) return;

  function renderDownloads() {
    const history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY) || '[]');
    if (!downloadsEl) return;
    if (!history.length) {
      downloadsEl.innerHTML = '<div class="note">No downloads yet.</div>';
      return;
    }
    downloadsEl.innerHTML = history.slice(0, 12).map((item) => {
      const time = new Date(item.timeISO).toLocaleString();
      return `<div class="list-item"><span>${item.title}</span><span>${time}</span></div>`;
    }).join('');
  }

  function renderLocked() {
    if (!lockedEl) return;
    const current = getAccess();
    const locked = assets.filter((asset) => !hasAccess(asset.required_access));
    lockedEl.innerHTML = locked.slice(0, 4).map(createAssetCard).join('') || '<div class="note">No locked assets.</div>';
  }

  function updateAccess(level) {
    setAccess(level);
    levelEl.textContent = formatTier(level);
    if (selectEl) selectEl.value = level;
    renderDownloads();
    renderLocked();
  }

  if (selectEl) {
    selectEl.addEventListener('change', (event) => {
      updateAccess(event.target.value);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(DOWNLOADS_KEY);
      renderDownloads();
    });
  }

  updateAccess(getAccess());
}

function initHelpPage() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;
  items.forEach((item) => {
    const button = item.querySelector('.faq-question');
    if (!button) return;
    button.addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

function bindDownloadButtons() {
  document.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const asset = assets.find((item) => item.id === button.dataset.download);
      if (!asset) return;
      if (!hasAccess(asset.required_access)) {
        openModal(`This asset requires ${formatTier(asset.required_access)}.`);
        return;
      }
      logDownload(asset);
      showToast('Download started (demo)');
    });
  });
}

function initNav() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open');
  });
}

function initModal() {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  const closeBtn = modal.querySelector('[data-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  const joinBtn = modal.querySelector('[data-modal-join]');
  if (joinBtn) joinBtn.setAttribute('href', MEMBERSHIP_URL);
  const viewBtn = modal.querySelector('[data-modal-view]');
  if (viewBtn) viewBtn.setAttribute('href', PATREON_URL);
}

function initPage() {
  initNav();
  initModal();
  initExplorePage();
  initAssetPage();
  initDashboardPage();
  initHelpPage();
}

document.addEventListener('DOMContentLoaded', initPage);
