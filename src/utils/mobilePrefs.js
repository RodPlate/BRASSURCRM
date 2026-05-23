const KEYS = {
  lastSupplierId: 'crm-last-supplier-id',
  lastActivityType: 'crm-last-activity-type',
  lastPath: 'crm-last-path',
};

export const getLastSupplierId = () => {
  try {
    return localStorage.getItem(KEYS.lastSupplierId) || '';
  } catch {
    return '';
  }
};

export const setLastSupplierId = (id) => {
  try {
    if (id) localStorage.setItem(KEYS.lastSupplierId, id);
    else localStorage.removeItem(KEYS.lastSupplierId);
  } catch {
    /* ignore */
  }
};

export const getLastActivityType = () => {
  try {
    return localStorage.getItem(KEYS.lastActivityType) || 'Llamada';
  } catch {
    return 'Llamada';
  }
};

export const setLastActivityType = (type) => {
  try {
    if (type) localStorage.setItem(KEYS.lastActivityType, type);
  } catch {
    /* ignore */
  }
};

export const getLastPath = () => {
  try {
    return localStorage.getItem(KEYS.lastPath) || '';
  } catch {
    return '';
  }
};

export const setLastPath = (path) => {
  try {
    if (path) localStorage.setItem(KEYS.lastPath, path);
  } catch {
    /* ignore */
  }
};
