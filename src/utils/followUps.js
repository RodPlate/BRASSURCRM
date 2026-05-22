import { parseCRMDate, startOfDay } from './parseDate';

export { startOfDay };

export const FOLLOW_UP_TYPES = ['Proveedor', 'Actividad', 'Oportunidad'];

export const DATE_BUCKETS = ['vencidos', 'hoy', 'proximos7', 'futuros'];

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/** Alias de parseCRMDate para campos de seguimiento. */
export const parseFollowUpDate = parseCRMDate;

export const getDateBucket = (date) => {
  if (!date) return null;
  const today = startOfDay();
  const weekEnd = addDays(today, 7);
  const d = startOfDay(date);

  if (d < today) return 'vencidos';
  if (d.getTime() === today.getTime()) return 'hoy';
  if (d <= weekEnd) return 'proximos7';
  return 'futuros';
};

export const bucketLabels = {
  vencidos: 'Seguimientos vencidos',
  hoy: 'Seguimientos de hoy',
  proximos7: 'Próximos 7 días',
  futuros: 'Seguimientos futuros',
};

export const buildFollowUpItems = (suppliers = [], activities = [], opportunities = []) => {
  try {
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const safeActivities = Array.isArray(activities) ? activities : [];
    const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];

    const supplierMap = Object.fromEntries(safeSuppliers.map((s) => [s.id, s]));
    const items = [];

    safeSuppliers.forEach((s) => {
      try {
        const date = parseFollowUpDate(s.nextFollowUpDate);
        if (!date) return;
        items.push({
          id: `supplier-${s.id}`,
          sourceType: 'Proveedor',
          sourceId: s.id,
          supplierId: s.id,
          date,
          bucket: getDateBucket(date),
          detail: `Seguimiento: ${s.companyName || 'Proveedor'}`,
          status: s.status || '—',
          priority: s.priority || '—',
          entity: s,
        });
      } catch (err) {
        console.warn('[Seguimientos] proveedor ignorado:', s?.id, err);
      }
    });

    safeActivities.forEach((a) => {
      try {
        const date = parseFollowUpDate(a.nextFollowUpDate);
        if (!date) return;
        const supplier = supplierMap[a.supplierId];
        items.push({
          id: `activity-${a.id}`,
          sourceType: 'Actividad',
          sourceId: a.id,
          supplierId: a.supplierId,
          date,
          bucket: getDateBucket(date),
          detail: a.summary || a.nextAction || 'Actividad de seguimiento',
          status: a.type || '—',
          priority: supplier?.priority || '—',
          entity: a,
        });
      } catch (err) {
        console.warn('[Seguimientos] actividad ignorada:', a?.id, err);
      }
    });

    safeOpportunities.forEach((o) => {
      try {
        const date = parseFollowUpDate(o.expectedPurchaseDate);
        if (!date) return;
        const supplier = supplierMap[o.supplierId];
        items.push({
          id: `opportunity-${o.id}`,
          sourceType: 'Oportunidad',
          sourceId: o.id,
          supplierId: o.supplierId,
          date,
          bucket: getDateBucket(date),
          detail: `${o.material || 'Oportunidad'}${o.estimatedVolumeKg ? ` · ${o.estimatedVolumeKg} kg` : ''}`,
          status: o.negotiationStatus || '—',
          priority: supplier?.priority || '—',
          entity: o,
        });
      } catch (err) {
        console.warn('[Seguimientos] oportunidad ignorada:', o?.id, err);
      }
    });

    return items.sort((a, b) => a.date - b.date);
  } catch (err) {
    console.error('[Seguimientos] error construyendo items:', err);
    return [];
  }
};

export const computeFollowUpStats = (items) => ({
  vencidos: items.filter((i) => i.bucket === 'vencidos').length,
  hoy: items.filter((i) => i.bucket === 'hoy').length,
  proximos7: items.filter((i) => i.bucket === 'proximos7').length,
  futuros: items.filter((i) => i.bucket === 'futuros').length,
  total: items.length,
});

export const filterFollowUpItems = (items, filters) => {
  const {
    bucket = '',
    supplierId = '',
    sourceType = '',
    status = '',
    priority = '',
    dateFrom = '',
    dateTo = '',
  } = filters;

  return items.filter((item) => {
    if (bucket && item.bucket !== bucket) return false;
    if (supplierId && item.supplierId !== supplierId) return false;
    if (sourceType && item.sourceType !== sourceType) return false;
    if (status && item.status !== status) return false;
    if (priority && item.priority !== priority) return false;

    if (dateFrom) {
      const from = parseFollowUpDate(dateFrom);
      if (from && item.date < from) return false;
    }
    if (dateTo) {
      const to = parseFollowUpDate(dateTo);
      if (to && item.date > to) return false;
    }

    return true;
  });
};

export const groupByBucket = (items) => ({
  vencidos: items.filter((i) => i.bucket === 'vencidos'),
  hoy: items.filter((i) => i.bucket === 'hoy'),
  proximos7: items.filter((i) => i.bucket === 'proximos7'),
  futuros: items.filter((i) => i.bucket === 'futuros'),
});
