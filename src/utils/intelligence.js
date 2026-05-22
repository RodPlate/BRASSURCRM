import {
  isOpenOpportunity,
  isWonOpportunity,
  isLostOpportunity,
} from './opportunities';
import { buildFollowUpItems, startOfDay, addDays } from './followUps';
import { safeArray, safeString, safeNumber, safeDate } from './safeData';

export const SCORE_LABELS = {
  strategic: 'Estratégico',
  high: 'Alto potencial',
  development: 'Desarrollo',
  low: 'Baja prioridad',
};

export const getScoreClassification = (score) => {
  const s = safeNumber(score, 0);
  if (s >= 80) return SCORE_LABELS.strategic;
  if (s >= 60) return SCORE_LABELS.high;
  if (s >= 40) return SCORE_LABELS.development;
  return SCORE_LABELS.low;
};

export const getScoreClass = (score) => {
  const s = safeNumber(score, 0);
  if (s >= 80) return 'score--strategic';
  if (s >= 60) return 'score--high';
  if (s >= 40) return 'score--development';
  return 'score--low';
};

const emptyKpis = () => ({
  totalSuppliers: 0,
  activeSuppliers: 0,
  newThisMonth: 0,
  openOpportunities: 0,
  wonOpportunities: 0,
  potentialVolumeKg: 0,
  wonVolumeKg: 0,
  conversionRate: 0,
});

export const emptyIntelligenceSnapshot = () => ({
  kpis: emptyKpis(),
  ranking: [],
  byMaterial: [],
  byDepartment: [],
  recommendedActions: [],
  followUps: [],
});

export const computeSupplierScore = (supplier, activities, opportunities) => {
  try {
    if (!supplier?.id) return 0;

    let score = 50;
    const acts = safeArray(activities).filter((a) => a?.supplierId === supplier.id);
    const opps = safeArray(opportunities).filter((o) => o?.supplierId === supplier.id);
    const now = new Date();
    const days30 = addDays(startOfDay(now), -30);
    const days90 = addDays(startOfDay(now), -90);

    if (safeString(supplier.status) === 'Activo') score += 20;
    if (safeString(supplier.status) === 'Descartado') score -= 30;
    if (safeString(supplier.priority) === 'Alta') score += 10;

    if (opps.some((o) => isOpenOpportunity(safeString(o.negotiationStatus)))) score += 15;

    const hasRecentActivity = acts.some((a) => {
      const d = safeDate(a.date);
      return d && d >= days30;
    });
    if (hasRecentActivity) score += 10;

    const lastActivity = acts.reduce((max, a) => {
      const d = safeDate(a.date);
      return d && (!max || d > max) ? d : max;
    }, null);

    if (acts.length > 0 && (!lastActivity || lastActivity < days90)) {
      score -= 20;
    }
    if (acts.length === 0) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  } catch (err) {
    console.warn('[Inteligencia] computeSupplierScore:', supplier?.id, err);
    return 0;
  }
};

export const getMainMaterial = (supplier, opportunities) => {
  try {
    const supplierOpps = safeArray(opportunities).filter((o) => o?.supplierId === supplier?.id);
    if (supplierOpps.length > 0) {
      const counts = {};
      supplierOpps.forEach((o) => {
        const m = safeString(o.material);
        if (m) counts[m] = (counts[m] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) return top[0];
    }
    const raw = supplier?.generatedMaterials;
    const str = Array.isArray(raw) ? raw.join(', ') : safeString(raw);
    return str.split(',')[0]?.trim() || '—';
  } catch {
    return '—';
  }
};

export const getLastContactDate = (supplierId, activities) => {
  try {
    const dates = safeArray(activities)
      .filter((a) => a?.supplierId === supplierId)
      .map((a) => safeDate(a.date))
      .filter(Boolean);
    if (dates.length === 0) return null;
    return dates.reduce((a, b) => (a > b ? a : b));
  } catch {
    return null;
  }
};

export const computeKpis = (suppliers, opportunities) => {
  try {
    const safeSuppliers = safeArray(suppliers);
    const safeOpps = safeArray(opportunities);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeSuppliers = safeSuppliers.filter((s) => safeString(s.status) === 'Activo').length;
    const newThisMonth = safeSuppliers.filter((s) => {
      const created = safeDate(s.createdAt);
      return created && created >= monthStart;
    }).length;

    let openOpps = 0;
    let wonOpps = 0;
    let lostOpps = 0;
    let potentialVolumeKg = 0;
    let wonVolumeKg = 0;

    safeOpps.forEach((o) => {
      try {
        const vol = safeNumber(o.estimatedVolumeKg);
        const status = safeString(o.negotiationStatus);
        if (isOpenOpportunity(status)) {
          openOpps += 1;
          potentialVolumeKg += vol;
        }
        if (isWonOpportunity(status)) {
          wonOpps += 1;
          wonVolumeKg += vol;
        }
        if (isLostOpportunity(status)) lostOpps += 1;
      } catch (err) {
        console.warn('[Inteligencia] oportunidad KPI ignorada:', o?.id, err);
      }
    });

    const closed = wonOpps + lostOpps;
    const conversionRate = closed > 0 ? Math.round((wonOpps / closed) * 1000) / 10 : 0;

    return {
      totalSuppliers: safeSuppliers.length,
      activeSuppliers,
      newThisMonth,
      openOpportunities: openOpps,
      wonOpportunities: wonOpps,
      potentialVolumeKg,
      wonVolumeKg,
      conversionRate,
    };
  } catch (err) {
    console.error('[Inteligencia] computeKpis:', err);
    return emptyKpis();
  }
};

export const buildSupplierRanking = (suppliers, activities, opportunities) => {
  try {
    return safeArray(suppliers)
      .map((s) => {
        try {
          if (!s?.id) return null;
          const score = computeSupplierScore(s, activities, opportunities);
          const activityCount = safeArray(activities).filter((a) => a?.supplierId === s.id).length;
          const lastContact = getLastContactDate(s.id, activities);
          return {
            id: s.id,
            companyName: safeString(s.companyName, '—'),
            city: safeString(s.city, '—'),
            mainMaterial: getMainMaterial(s, opportunities),
            estimatedVolume: safeNumber(s.estimatedMonthlyVolumeKg),
            activityCount,
            lastContact,
            status: safeString(s.status, '—'),
            score,
            classification: getScoreClassification(score),
            scoreClass: getScoreClass(score),
          };
        } catch (err) {
          console.warn('[Inteligencia] ranking fila ignorada:', s?.id, err);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    console.error('[Inteligencia] buildSupplierRanking:', err);
    return [];
  }
};

export const analyzeByMaterial = (suppliers, opportunities) => {
  try {
    const map = {};

    const addMaterial = (name, volume, supplierId, isOpp = false) => {
      const key = safeString(name, 'Sin especificar');
      if (!map[key]) {
        map[key] = { material: key, volumeKg: 0, supplierIds: new Set(), opportunities: 0 };
      }
      map[key].volumeKg += safeNumber(volume);
      if (supplierId) map[key].supplierIds.add(supplierId);
      if (isOpp) map[key].opportunities += 1;
    };

    safeArray(suppliers).forEach((s) => {
      try {
        const materials = (
          Array.isArray(s.generatedMaterials)
            ? s.generatedMaterials.join(', ')
            : safeString(s.generatedMaterials, 'General')
        )
          .split(/[,;]+/)
          .map((m) => m.trim())
          .filter(Boolean);
        const vol = safeNumber(s.estimatedMonthlyVolumeKg) / (materials.length || 1);
        materials.forEach((m) => addMaterial(m, vol, s.id));
      } catch (err) {
        console.warn('[Inteligencia] material proveedor ignorado:', s?.id, err);
      }
    });

    safeArray(opportunities).forEach((o) => {
      try {
        addMaterial(o.material, o.estimatedVolumeKg, o.supplierId, true);
      } catch (err) {
        console.warn('[Inteligencia] material oportunidad ignorada:', o?.id, err);
      }
    });

    return Object.values(map)
      .map((row) => ({
        material: row.material,
        volumeKg: Math.round(row.volumeKg),
        supplierCount: row.supplierIds.size,
        opportunities: row.opportunities,
      }))
      .sort((a, b) => b.volumeKg - a.volumeKg);
  } catch (err) {
    console.error('[Inteligencia] analyzeByMaterial:', err);
    return [];
  }
};

export const analyzeByDepartment = (suppliers, opportunities) => {
  try {
    const map = {};

    safeArray(suppliers).forEach((s) => {
      try {
        const dept = safeString(s.department, 'Sin departamento');
        if (!map[dept]) map[dept] = { department: dept, suppliers: 0, volumeKg: 0 };
        map[dept].suppliers += 1;
        map[dept].volumeKg += safeNumber(s.estimatedMonthlyVolumeKg);
      } catch (err) {
        console.warn('[Inteligencia] geo proveedor ignorado:', s?.id, err);
      }
    });

    safeArray(opportunities).forEach((o) => {
      try {
        if (!isOpenOpportunity(safeString(o.negotiationStatus))) return;
        const supplier = safeArray(suppliers).find((s) => s?.id === o.supplierId);
        const dept = safeString(supplier?.department, 'Sin departamento');
        if (!map[dept]) map[dept] = { department: dept, suppliers: 0, volumeKg: 0 };
        map[dept].volumeKg += safeNumber(o.estimatedVolumeKg);
      } catch (err) {
        console.warn('[Inteligencia] geo oportunidad ignorada:', o?.id, err);
      }
    });

    return Object.values(map).sort((a, b) => b.volumeKg - a.volumeKg);
  } catch (err) {
    console.error('[Inteligencia] analyzeByDepartment:', err);
    return [];
  }
};

const daysSince = (date) => {
  if (!date) return Infinity;
  try {
    const today = startOfDay();
    const d = startOfDay(date);
    return Math.floor((today - d) / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
};

export const generateRecommendedActions = (
  suppliers,
  activities,
  opportunities,
  followUpItems = []
) => {
  try {
    const actions = [];
    const today = startOfDay();
    const days30 = addDays(today, -30);
    const safeSuppliers = safeArray(suppliers);
    const safeActivities = safeArray(activities);
    const safeOpportunities = safeArray(opportunities);
    const safeFollowUps = safeArray(followUpItems);

    safeFollowUps
      .filter((f) => f?.bucket === 'vencidos')
      .forEach((f) => {
        try {
          const supplier = safeSuppliers.find((s) => s?.id === f.supplierId);
          actions.push({
            id: `urgent-${f.id}`,
            priority: 'urgente',
            action: 'Contactar proveedor',
            supplierName: safeString(supplier?.companyName, 'Proveedor'),
            supplierId: f.supplierId,
            reason: `Seguimiento vencido (${safeString(f.sourceType)})`,
          });
        } catch (err) {
          console.warn('[Inteligencia] acción vencido ignorada:', err);
        }
      });

    safeSuppliers.forEach((s) => {
      try {
        if (!s?.id || safeString(s.status) === 'Descartado') return;

        const lastContact = getLastContactDate(s.id, safeActivities);
        const supplierOpps = safeOpportunities.filter((o) => o?.supplierId === s.id);
        const openOpps = supplierOpps.filter((o) =>
          isOpenOpportunity(safeString(o.negotiationStatus))
        );

        if (lastContact && lastContact < days30) {
          actions.push({
            id: `follow-${s.id}`,
            priority: 'media',
            action: 'Reactivar negociación',
            supplierName: safeString(s.companyName, 'Proveedor'),
            supplierId: s.id,
            reason: `Sin actividad hace ${daysSince(lastContact)} días`,
          });
        } else if (
          !lastContact &&
          safeActivities.filter((a) => a?.supplierId === s.id).length === 0
        ) {
          actions.push({
            id: `follow-new-${s.id}`,
            priority: 'media',
            action: 'Contactar proveedor',
            supplierName: safeString(s.companyName, 'Proveedor'),
            supplierId: s.id,
            reason: 'Sin actividades registradas',
          });
        }

        openOpps.forEach((o) => {
          const status = safeString(o.negotiationStatus);
          if (status === 'Negociando' || status === 'Cotizando') {
            actions.push({
              id: `close-${o.id}`,
              priority: 'alta',
              action: 'Cerrar compra',
              supplierName: safeString(s.companyName, 'Proveedor'),
              supplierId: s.id,
              reason: `Oportunidad abierta: ${safeString(o.material)}`,
            });
          } else if (status === 'Nueva' || status === 'En análisis') {
            actions.push({
              id: `sample-${o.id}`,
              priority: 'alta',
              action: 'Solicitar muestra',
              supplierName: safeString(s.companyName, 'Proveedor'),
              supplierId: s.id,
              reason: `Oportunidad en ${status}: ${safeString(o.material)}`,
            });
          } else {
            actions.push({
              id: `opp-${o.id}`,
              priority: 'alta',
              action: 'Visitar proveedor',
              supplierName: safeString(s.companyName, 'Proveedor'),
              supplierId: s.id,
              reason: `Oportunidad abierta: ${safeString(o.material)}`,
            });
          }
        });

        const st = safeString(s.status);
        if (st === 'Interesado' || st === 'Negociando') {
          const exists = actions.some(
            (a) => a.supplierId === s.id && a.action === 'Visitar proveedor'
          );
          if (!exists) {
            actions.push({
              id: `visit-${s.id}`,
              priority: 'media',
              action: 'Visitar proveedor',
              supplierName: safeString(s.companyName, 'Proveedor'),
              supplierId: s.id,
              reason: `Proveedor en estado ${st}`,
            });
          }
        }
      } catch (err) {
        console.warn('[Inteligencia] acción proveedor ignorada:', s?.id, err);
      }
    });

    const order = { urgente: 0, alta: 1, media: 2, baja: 3 };
    return actions
      .sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))
      .slice(0, 25);
  } catch (err) {
    console.error('[Inteligencia] generateRecommendedActions:', err);
    return [];
  }
};

export const buildIntelligenceSnapshot = (suppliers, activities, opportunities) => {
  const base = emptyIntelligenceSnapshot();

  try {
    const safeSuppliers = safeArray(suppliers);
    const safeActivities = safeArray(activities);
    const safeOpportunities = safeArray(opportunities);

    let followUps = [];
    let kpis = base.kpis;
    let ranking = [];
    let byMaterial = [];
    let byDepartment = [];
    let recommendedActions = [];

    try {
      followUps = buildFollowUpItems(safeSuppliers, safeActivities, safeOpportunities);
    } catch (err) {
      console.error('[Inteligencia] followUps:', err);
    }

    try {
      kpis = computeKpis(safeSuppliers, safeOpportunities);
    } catch (err) {
      console.error('[Inteligencia] KPIs:', err);
    }

    try {
      ranking = buildSupplierRanking(safeSuppliers, safeActivities, safeOpportunities);
    } catch (err) {
      console.error('[Inteligencia] ranking:', err);
    }

    try {
      byMaterial = analyzeByMaterial(safeSuppliers, safeOpportunities);
    } catch (err) {
      console.error('[Inteligencia] materiales:', err);
    }

    try {
      byDepartment = analyzeByDepartment(safeSuppliers, safeOpportunities);
    } catch (err) {
      console.error('[Inteligencia] geografía:', err);
    }

    try {
      recommendedActions = generateRecommendedActions(
        safeSuppliers,
        safeActivities,
        safeOpportunities,
        followUps
      );
    } catch (err) {
      console.error('[Inteligencia] recomendaciones:', err);
    }

    return { kpis, ranking, byMaterial, byDepartment, recommendedActions, followUps };
  } catch (err) {
    console.error('[Inteligencia] buildIntelligenceSnapshot:', err);
    return base;
  }
};
