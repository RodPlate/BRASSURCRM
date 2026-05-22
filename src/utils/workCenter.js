import { isOpenOpportunity } from './opportunities';
import { parseCRMDate, startOfDay } from './parseDate';
import {
  buildFollowUpItems,
  groupByBucket,
  addDays,
} from './followUps';

const MS_PER_DAY = 86400000;

export { startOfDay };

export const parseActivityDate = (value) => parseCRMDate(value);

export const getLastActivityForSupplier = (supplierId, activities) => {
  try {
    const safe = Array.isArray(activities) ? activities : [];
    const dates = safe
      .filter((a) => a?.supplierId === supplierId)
      .map((a) => parseActivityDate(a.date))
      .filter(Boolean);
    if (!dates.length) return null;
    return dates.reduce((a, b) => (a > b ? a : b));
  } catch (err) {
    console.warn('[Hoy] getLastActivityForSupplier:', err);
    return null;
  }
};

export const daysBetween = (from, to = startOfDay()) => {
  if (!from) return null;
  try {
    return Math.floor((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
  } catch {
    return null;
  }
};

export const classifyTodayFollowUp = (item) => {
  if (item.sourceType === 'Actividad') {
    const t = item.entity?.type || '';
    if (t === 'Llamada') return 'llamada';
    if (t === 'Reunión') return 'reunion';
    if (t === 'Visita') return 'visita';
    if (t === 'WhatsApp') return 'whatsapp';
  }
  return 'seguimiento';
};

export const enrichFollowUpItem = (item, suppliers, activities) => {
  try {
    const supplier = suppliers.find((s) => s.id === item.supplierId);
    const lastActivity = getLastActivityForSupplier(item.supplierId, activities);
    const today = startOfDay();
    const overdueDays =
      item.bucket === 'vencidos' ? daysBetween(item.date, today) : 0;

    return {
      ...item,
      supplierName: supplier?.companyName || '—',
      supplier,
      lastActivity,
      overdueDays,
      todayCategory: classifyTodayFollowUp(item),
    };
  } catch (err) {
    console.warn('[Hoy] enrichFollowUpItem:', item?.id, err);
    return {
      ...item,
      supplierName: '—',
      supplier: null,
      lastActivity: null,
      overdueDays: 0,
      todayCategory: 'seguimiento',
    };
  }
};

export const buildHotOpportunities = (opportunities, suppliers, activities) => {
  try {
    const safeOpps = Array.isArray(opportunities) ? opportunities : [];
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const today = startOfDay();
    const cutoff = addDays(today, -7);
    const supplierMap = Object.fromEntries(safeSuppliers.map((s) => [s.id, s]));

    return safeOpps
      .filter((o) => {
        try {
          if (o.negotiationStatus !== 'Negociando') return false;
          const supplier = supplierMap[o.supplierId];
          if (supplier?.priority !== 'Alta') return false;
          const last = getLastActivityForSupplier(o.supplierId, activities);
          if (!last) return true;
          return last < cutoff;
        } catch {
          return false;
        }
      })
      .map((o) => {
        const supplier = supplierMap[o.supplierId];
        const last = getLastActivityForSupplier(o.supplierId, activities);
        return {
          opportunity: o,
          supplier,
          supplierName: supplier?.companyName || '—',
          daysWithoutActivity: last ? daysBetween(last, today) : null,
          material: o.material,
        };
      })
      .sort((a, b) => (b.daysWithoutActivity ?? 999) - (a.daysWithoutActivity ?? 999));
  } catch (err) {
    console.error('[Hoy] buildHotOpportunities:', err);
    return [];
  }
};

export const buildTopSuppliersToContact = (suppliers, activities, opportunities, limit = 8) => {
  try {
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const today = startOfDay();

    const scored = safeSuppliers
      .map((s) => {
        try {
          let score = 0;
          const openOpps = (opportunities || []).filter(
            (o) => o.supplierId === s.id && isOpenOpportunity(o.negotiationStatus)
          );
          if (openOpps.length) score += 35;
          if (openOpps.some((o) => o.negotiationStatus === 'Negociando')) score += 15;

          const vol = Number(s.estimatedMonthlyVolumeKg) || 0;
          if (vol >= 10000) score += 30;
          else if (vol >= 5000) score += 22;
          else if (vol >= 1000) score += 12;
          else if (vol > 0) score += 5;

          const last = getLastActivityForSupplier(s.id, activities);
          const daysSince = last ? daysBetween(last, today) : null;
          if (daysSince == null) score += 28;
          else if (daysSince > 30) score += 25;
          else if (daysSince > 14) score += 18;
          else if (daysSince > 7) score += 12;

          if (s.priority === 'Alta') score += 10;

          return {
            supplier: s,
            score,
            daysSinceContact: daysSince,
            openOpportunities: openOpps.length,
            volumeKg: vol,
          };
        } catch {
          return null;
        }
      })
      .filter((row) => row && row.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  } catch (err) {
    console.error('[Hoy] buildTopSuppliersToContact:', err);
    return [];
  }
};

export const splitTodayItems = (hoyItems) => {
  const groups = {
    seguimientos: [],
    llamadas: [],
    reuniones: [],
    visitas: [],
    whatsapp: [],
    otras: [],
  };

  (hoyItems || []).forEach((item) => {
    try {
      const cat = item.todayCategory || 'seguimiento';
      if (cat === 'llamada') groups.llamadas.push(item);
      else if (cat === 'reunion') groups.reuniones.push(item);
      else if (cat === 'visita') groups.visitas.push(item);
      else if (cat === 'whatsapp') groups.whatsapp.push(item);
      else if (cat === 'seguimiento') groups.seguimientos.push(item);
      else groups.otras.push(item);
    } catch (err) {
      console.warn('[Hoy] splitTodayItems:', err);
    }
  });

  return groups;
};

const emptySnapshot = () => ({
  vencidos: [],
  hoy: [],
  todayGroups: splitTodayItems([]),
  proximos7: [],
  hotOpportunities: [],
  topSuppliers: [],
  seguimientosCount: 0,
  priorityOpportunities: 0,
});

export const buildWorkCenterSnapshot = (suppliers, activities, opportunities) => {
  try {
    const items = buildFollowUpItems(suppliers, activities, opportunities).map((item) =>
      enrichFollowUpItem(item, suppliers, activities)
    );
    const buckets = groupByBucket(items);

    const vencidos = buckets.vencidos || [];
    const hoy = buckets.hoy || [];
    const proximos7 = buckets.proximos7 || [];

    let hotOpportunities = [];
    let topSuppliers = [];
    try {
      hotOpportunities = buildHotOpportunities(opportunities, suppliers, activities);
    } catch (err) {
      console.error('[Hoy] sección oportunidades calientes:', err);
    }
    try {
      topSuppliers = buildTopSuppliersToContact(suppliers, activities, opportunities);
    } catch (err) {
      console.error('[Hoy] sección top proveedores:', err);
    }

    const todayGroups = splitTodayItems(hoy);
    const seguimientosCount = vencidos.length + hoy.length;
    const priorityOpportunities = hotOpportunities.length;

    return {
      vencidos,
      hoy,
      todayGroups,
      proximos7,
      hotOpportunities,
      topSuppliers,
      seguimientosCount,
      priorityOpportunities,
    };
  } catch (err) {
    console.error('[Hoy] error construyendo snapshot:', err);
    return emptySnapshot();
  }
};

export const formatUserGreetingName = (user) => {
  if (!user) return 'equipo';
  if (user.displayName) {
    return user.displayName.split(' ')[0];
  }
  const local = (user.email || '').split('@')[0] || 'equipo';
  const part = local.split(/[._-]/)[0];
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
};

export const buildGreetingMessage = (user, seguimientosCount, priorityCount) => {
  const name = formatUserGreetingName(user);
  return `Buen día ${name}, hoy tenés ${seguimientosCount} seguimiento${seguimientosCount === 1 ? '' : 's'} y ${priorityCount} oportunidad${priorityCount === 1 ? '' : 'es'} prioritaria${priorityCount === 1 ? '' : 's'}.`;
};

/** ¿Hay alguna tarea visible en el centro de trabajo? */
export const hasWorkCenterTasks = (snapshot) => {
  if (!snapshot) return false;
  return (
    snapshot.vencidos?.length > 0 ||
    snapshot.hoy?.length > 0 ||
    snapshot.proximos7?.length > 0 ||
    snapshot.hotOpportunities?.length > 0 ||
    snapshot.topSuppliers?.length > 0
  );
};
