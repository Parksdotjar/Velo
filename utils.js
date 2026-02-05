export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const sanitizeFilename = (name) =>
  (name || 'file')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildAssetPath = (ownerId, file) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeName = sanitizeFilename(file.name);
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
  return `${ownerId}/${year}/${month}/${uuid}_${safeName}`;
};

export const normalizeAssetType = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '');

export const parseTags = (raw) =>
  (raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
