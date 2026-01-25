const modal = document.querySelector('[data-modal]');
const modalTriggers = document.querySelectorAll('[data-open-modal]');
const modalClose = document.querySelector('[data-close-modal]');
const authToggle = document.querySelector('[data-toggle-auth]');
const loader = document.querySelector('.loader-overlay');
const navRoot = document.querySelector('nav');
const mainRoot = document.querySelector('main');
const groupedItems = [];
let flatItems = [];
let isTransitioning = false;
const authBlocker = (() => {
  const blocker = document.createElement('div');
  blocker.className = 'auth-blocker';
  blocker.innerHTML = '<div class="auth-message">Login First</div>';
  document.body.appendChild(blocker);
  return blocker;
})();

const getBuildVersion = () => {
  const script = document.querySelector('script[src*="app.js"]');
  if (!script) return null;
  try {
    const url = new URL(script.src, window.location.href);
    return url.searchParams.get('v');
  } catch (error) {
    return null;
  }
};

const showBuildBadge = () => {
  if (document.querySelector('.version-badge')) return;
  const version = getBuildVersion();
  const badge = document.createElement('div');
  badge.className = 'version-badge';
  badge.textContent = version ? `Build v${version}` : 'Build (no version)';
  document.body.appendChild(badge);
};

const isLoggedIn = () => document.body.getAttribute('data-auth') === 'logged-in';
const isAuthReady = () => document.body.getAttribute('data-auth-ready') === 'true';

const showAuthBlocker = (redirect = null) => {
  document.body.classList.add('is-blurred');
  authBlocker.classList.add('active');
  setTimeout(() => {
    authBlocker.classList.remove('active');
    document.body.classList.remove('is-blurred');
    if (redirect) window.location.href = redirect;
  }, 2000);
};

const getDomOrder = (items) => {
  return items.sort((a, b) => {
    if (a === b) return 0;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
};

const openModal = () => {
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
};

const closeModal = () => {
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  const player = document.querySelector('[data-modal-player]');
  if (player) player.innerHTML = 'Fullscreen Clip Player';
};

const buildGroups = () => {
  const used = new Set();
  const groups = [];

  if (navRoot) {
    const navItems = getDomOrder([navRoot, ...navRoot.querySelectorAll('*')]);
    groups.push({ items: navItems, type: 'nav' });
    navItems.forEach((item) => used.add(item));
  }

  if (mainRoot) {
    const primarySelectors = [
      '.hero',
      '.search-row',
      '.chip-row',
      '.tabs',
      '.stat-grid',
      '.split',
      '.section',
      '.panel'
    ];

    const primaryContainers = getDomOrder(
      Array.from(mainRoot.querySelectorAll(primarySelectors.join(',')))
    );

    primaryContainers.forEach((container) => {
      const children = Array.from(container.children).filter(
        (child) => !child.closest('.clip-card')
      );
      const groupItems = children.length ? children : [container];
      const ordered = getDomOrder(groupItems);
      const filtered = ordered.filter((item) => !used.has(item));
      if (filtered.length) {
        groups.push({ items: filtered, type: 'section' });
        filtered.forEach((item) => used.add(item));
      }
    });

    const grids = Array.from(mainRoot.querySelectorAll('.grid'));
    grids.forEach((grid) => {
      const cards = getDomOrder(Array.from(grid.querySelectorAll('.clip-card'))).filter(
        (item) => !used.has(item)
      );
      cards.forEach((card) => {
        if (!used.has(card)) {
          groups.push({ items: [card], type: 'card' });
          used.add(card);
        }
      });
    });

    const remaining = getDomOrder(Array.from(mainRoot.querySelectorAll('*'))).filter(
      (item) => !used.has(item) && !item.closest('.clip-card')
    );
    if (remaining.length) {
      groups.push({ items: remaining, type: 'misc' });
      remaining.forEach((item) => used.add(item));
    }
  }

  groupedItems.length = 0;
  groups.forEach((group) => groupedItems.push(group));
  return groups;
};

const prepareStagger = () => {
  document.querySelectorAll('.stagger-item').forEach((item) => {
    item.classList.remove('stagger-item', 'reveal', 'leave');
    item.style.animationDelay = '';
  });

  const groups = buildGroups();
  const nonCardGroups = groups.filter((group) => group.type !== 'card');
  const cardGroups = groups.filter((group) => group.type === 'card');

  const nonCardItemDelay = 12;
  const nonCardGroupOffset = 30;
  let nonCardEnd = 0;

  nonCardGroups.forEach((group, groupIndex) => {
    const items = group.items || group;
    const groupStart = groupIndex * nonCardGroupOffset;

    items.forEach((item, itemIndex) => {
      item.classList.add('stagger-item');
      item.classList.remove('leave');
      item.style.animationDelay = `${groupStart + itemIndex * nonCardItemDelay}ms`;
    });

    const groupEnd = groupStart + items.length * nonCardItemDelay;
    nonCardEnd = Math.max(nonCardEnd, groupEnd);
  });

  const cardItemDelay = 30;
  const cardGap = 60;
  let cardStart = nonCardEnd + 80;

  cardGroups.forEach((group) => {
    const items = group.items || group;
    items.forEach((item, itemIndex) => {
      item.classList.add('stagger-item');
      item.classList.remove('leave');
      item.style.animationDelay = `${cardStart + itemIndex * cardItemDelay}ms`;
    });
    cardStart += items.length * cardItemDelay + cardGap;
  });

  flatItems = groups.flatMap((group) => group.items || group);
};

const runReveal = () => {
  requestAnimationFrame(() => {
    flatItems.forEach((item) => {
      item.classList.add('reveal');
    });
  });
};

window.veloStagger = {
  prepareStagger,
  runReveal
};

modalTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    if (event.target.closest('[data-no-modal]')) return;
    const card = trigger.closest('[data-clip-id]');
    if (card) {
      const modalFollow = document.querySelector('[data-follow-btn]');
      const creatorId = card.getAttribute('data-user-id');
      if (modalFollow && creatorId) {
        modalFollow.setAttribute('data-follow-id', creatorId);
      }
    }
    openModal();
  });
});

if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

if (authToggle) {
  authToggle.addEventListener('click', () => {
    const body = document.body;
    const current = body.getAttribute('data-auth');
    body.setAttribute('data-auth', current === 'logged-in' ? 'logged-out' : 'logged-in');
  });
}

document.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
    return;
  }

  if (event.key === '/') {
    event.preventDefault();
    const search = document.querySelector('[data-search]');
    if (search) search.focus();
  }

  if (event.key.toLowerCase() === 'u') {
    if (isAuthReady() && !isLoggedIn()) {
      showAuthBlocker();
      return;
    }
    window.location.href = 'upload.html';
  }

  if (event.key.toLowerCase() === 'd') {
    if (isAuthReady() && !isLoggedIn()) {
      showAuthBlocker();
      return;
    }
    window.location.href = 'dashboard.html';
  }

  if (event.key === 'Escape') {
    closeModal();
  }
});

const dismissLoader = (delay = 900, callback) => {
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('dismiss');
    if (callback) callback();
  }, delay);
};

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-enter');
  showBuildBadge();
  prepareStagger();
  if (!loader) {
    document.body.classList.add('is-loaded');
    runReveal();
  }
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href') || '';
  const protectedRoutes = ['upload.html', 'dashboard.html', 'settings.html'];
  if (protectedRoutes.includes(href) && isAuthReady() && !isLoggedIn()) {
    event.preventDefault();
    showAuthBlocker();
  }
});

window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    if (loader) {
      dismissLoader(1200, () => {
        document.body.classList.add('is-loaded');
        runReveal();
      });
    } else {
      document.body.classList.add('is-loaded');
      runReveal();
    }
    const page = document.body.getAttribute('data-page');
    const checkProtected = () => {
      if (!isAuthReady()) {
        setTimeout(checkProtected, 100);
        return;
      }
      if (!isLoggedIn() && (page === 'upload' || page === 'dashboard' || page === 'settings')) {
        showAuthBlocker('login.html');
      }
    };
    checkProtected();
  });
});

setTimeout(() => {
  dismissLoader(0, () => {
    if (!document.body.classList.contains('is-loaded')) {
      document.body.classList.add('is-loaded');
      runReveal();
    }
  });
}, 2500);

// Page exit transitions removed to prevent flicker on navigation.
