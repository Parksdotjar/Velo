const modal = document.querySelector('[data-modal]');
const modalTriggers = document.querySelectorAll('[data-open-modal]');
const modalClose = document.querySelector('[data-close-modal]');
const authToggle = document.querySelector('[data-toggle-auth]');
const revealItems = document.querySelectorAll('.clip-card');

const openModal = () => {
  if (!modal) return;
  modal.classList.add('active');
};

const closeModal = () => {
  if (!modal) return;
  modal.classList.remove('active');
};

const staggerReveal = () => {
  revealItems.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add('reveal');
    }, 70 * index);
  });
};

modalTriggers.forEach((trigger) => {
  trigger.addEventListener('click', openModal);
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
    window.location.href = 'upload.html';
  }

  if (event.key.toLowerCase() === 'd') {
    window.location.href = 'dashboard.html';
  }

  if (event.key === 'Escape') {
    closeModal();
  }
});

window.addEventListener('load', () => {
  document.body.classList.add('is-loaded');
  staggerReveal();
});
