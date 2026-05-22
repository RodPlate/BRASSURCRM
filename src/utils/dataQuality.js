import { normalizeCompanyKey } from './importSuppliers';
import { safeArray, safeString } from './safeData';
import { parseCRMDate } from './parseDate';

export const DEFAULT_SUPPLIER_QUALITY = {
  companyName: 'Sin nombre',
  city: '',
  department: '',
  industry: '',
  generatedMaterials: [],
  status: 'Nuevo',
};

/** Normaliza proveedor para análisis sin romper por campos faltantes. */
export const normalizeSupplierForQuality = (raw) => {
  if (!raw?.id) return null;
  try {
    return {
      ...raw,
      id: raw.id,
      companyName: safeString(raw.companyName, DEFAULT_SUPPLIER_QUALITY.companyName),
      city: safeString(raw.city, ''),
      department: safeString(raw.department, ''),
      industry: safeString(raw.industry, ''),
      generatedMaterials: materialsToArray(raw.generatedMaterials),
      status: safeString(raw.status, DEFAULT_SUPPLIER_QUALITY.status),
      estimatedMonthlyVolumeKg: Number(raw.estimatedMonthlyVolumeKg) || 0,
      notes: safeString(raw.notes, ''),
    };
  } catch (err) {
    console.warn('[Calidad] proveedor inválido ignorado:', raw?.id, err);
    return null;
  }
};

export const normalizeSuppliersForQuality = (suppliers) =>
  safeArray(suppliers).map(normalizeSupplierForQuality).filter(Boolean);

const MATERIAL_RULES = [
  { pattern: /metalurg/i, material: 'Hierro' },
  { pattern: /fundici[oó]n/i, material: 'Aluminio' },
  { pattern: /frigor[ií]fic/i, material: 'Inox' },
  { pattern: /el[eé]ctric/i, material: 'Cobre' },
];

export const TIER_LABELS = {
  A: 'Estratégico',
  B: 'Alto Potencial',
  C: 'Desarrollo',
  D: 'Bajo Potencial',
};

const COMPLETENESS_FIELDS = ['city', 'department', 'industry', 'generatedMaterials', 'estimatedMonthlyVolumeKg'];

const parseDate = (value) => parseCRMDate(value);

export const normalizePhone = (phone) =>
  String(phone ?? '')
    .replace(/\D/g, '')
    .slice(-9);

export const materialsToArray = (materials) => {
  if (!materials) return [];
  if (Array.isArray(materials)) return materials.filter(Boolean);
  return String(materials)
    .split(/[,;]+/)
    .map((m) => m.trim())
    .filter(Boolean);
};

export const materialsToLabel = (materials) => materialsToArray(materials).join(', ');

/** Similitud de nombres 0–1 (Levenshtein normalizado). */
export const nameSimilarity = (a, b) => {
  const na = normalizeCompanyKey(a);
  const nb = normalizeCompanyKey(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
};

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Detecta materiales desde notas y rubro. */
export const detectMaterialsFromText = (notes = '', industry = '') => {
  const text = `${notes} ${industry}`.toLowerCase();
  const found = new Set();
  MATERIAL_RULES.forEach(({ pattern, material }) => {
    if (pattern.test(text)) found.add(material);
  });
  return [...found];
};

export const mergeMaterials = (current, detected) => {
  const set = new Set([...materialsToArray(current), ...detected]);
  return [...set];
};

/** Contacto principal por proveedor. */
export const buildMainContactBySupplier = (contacts) => {
  const map = {};
  contacts.forEach((c) => {
    if (!c.supplierId) return;
    const existing = map[c.supplierId];
    if (!existing || c.isMainContact) {
      map[c.supplierId] = c;
    }
  });
  return map;
};

/** Grupos de duplicados por nombre, teléfono o contacto. */
export const findDuplicateGroups = (suppliers, contacts) => {
  try {
    const safeSuppliers = normalizeSuppliersForQuality(suppliers);
    const mainBySupplier = buildMainContactBySupplier(safeArray(contacts));
    const groups = [];
    const assigned = new Set();

    const addGroup = (reason, ids, detail) => {
      const key = [...ids].sort().join('|');
      if (assigned.has(key)) return;
      assigned.add(key);
      groups.push({
        id: key,
        reason,
        supplierIds: ids,
        detail,
        suppliers: ids.map((id) => safeSuppliers.find((s) => s.id === id)).filter(Boolean),
      });
    };

    for (let i = 0; i < safeSuppliers.length; i++) {
      for (let j = i + 1; j < safeSuppliers.length; j++) {
        try {
          const a = safeSuppliers[i];
          const b = safeSuppliers[j];
          const sim = nameSimilarity(a.companyName, b.companyName);
          if (sim >= 0.85) {
            addGroup('nombre_similar', [a.id, b.id], `Similitud ${Math.round(sim * 100)}%`);
          }
        } catch (err) {
          console.warn('[Calidad] par duplicado ignorado:', err);
        }
      }
    }

    const phoneMap = {};
    safeSuppliers.forEach((s) => {
    const c = mainBySupplier[s.id];
    const phone = normalizePhone(c?.phone);
    if (phone.length < 7) return;
    if (!phoneMap[phone]) phoneMap[phone] = [];
    phoneMap[phone].push(s.id);
  });
  Object.entries(phoneMap).forEach(([phone, ids]) => {
    if (ids.length > 1) addGroup('mismo_telefono', ids, `Teléfono ${phone}`);
  });

    const contactMap = {};
    safeSuppliers.forEach((s) => {
      const c = mainBySupplier[s.id];
      if (!c?.name) return;
      const key = `${normalizeCompanyKey(c.name)}|${normalizePhone(c.phone)}`;
      if (!contactMap[key]) contactMap[key] = [];
      contactMap[key].push(s.id);
    });
    Object.entries(contactMap).forEach(([key, ids]) => {
      if (ids.length > 1) {
        const [name] = key.split('|');
        addGroup('mismo_contacto', ids, `Contacto ${name}`);
      }
    });

    return groups;
  } catch (err) {
    console.error('[Calidad] findDuplicateGroups:', err);
    return [];
  }
};

export const getLastActivityDate = (supplierId, activities) => {
  const dates = activities
    .filter((a) => a.supplierId === supplierId)
    .map((a) => parseDate(a.date))
    .filter(Boolean);
  if (!dates.length) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
};

export const hasRecentActivity = (supplierId, activities, days = 30) => {
  const last = getLastActivityDate(supplierId, activities);
  if (!last) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return last >= cutoff;
};

/** % de campos clave completos (0–100). */
export const computeCompleteness = (supplier, mainContact) => {
  let filled = 0;
  const total = COMPLETENESS_FIELDS.length + 1;

  COMPLETENESS_FIELDS.forEach((field) => {
    if (field === 'generatedMaterials') {
      if (materialsToArray(supplier.generatedMaterials).length > 0) filled += 1;
      return;
    }
    if (field === 'estimatedMonthlyVolumeKg') {
      if (Number(supplier.estimatedMonthlyVolumeKg) > 0) filled += 1;
      return;
    }
    if (String(supplier[field] ?? '').trim()) filled += 1;
  });

  if (mainContact?.name && normalizePhone(mainContact.phone).length >= 7) filled += 1;

  return Math.round((filled / total) * 100);
};

export const isDataIncomplete = (completeness) => completeness < 70;

/**
 * Supplier Score (Calidad de Datos):
 * +30 activo, +20 volumen, +10 contacto, +10 actividad reciente, −20 datos incompletos
 */
export const computeDataQualityScore = (supplier, mainContact, activities) => {
  let score = 0;

  if (supplier.status === 'Activo') score += 30;

  if (Number(supplier.estimatedMonthlyVolumeKg) > 0) score += 20;

  if (mainContact?.name && normalizePhone(mainContact.phone).length >= 7) score += 10;

  if (hasRecentActivity(supplier.id, activities)) score += 10;

  const completeness = computeCompleteness(supplier, mainContact);
  if (isDataIncomplete(completeness)) score -= 20;

  return Math.max(0, Math.min(100, score));
};

export const getTierFromScore = (score) => {
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
};

export const estimatePotential = (score, volumeKg) => {
  const vol = Number(volumeKg) || 0;
  if (score >= 70 && vol >= 5000) return 'Muy alto';
  if (score >= 50 && vol >= 1000) return 'Alto';
  if (score >= 30 || vol > 0) return 'Medio';
  return 'Bajo';
};

/** Sugerencias de mejora para un proveedor. */
export const buildSuggestedImprovements = (supplier, mainContact, activities, suppliers, duplicateGroups) => {
  const changes = {};
  const notes = [];

  const textBlob = `${supplier.notes || ''} ${supplier.industry || ''}`;
  const detectedMaterials = detectMaterialsFromText(supplier.notes, supplier.industry);
  const currentMaterials = materialsToArray(supplier.generatedMaterials);
  const merged = mergeMaterials(currentMaterials, detectedMaterials);

  if (merged.length > currentMaterials.length) {
    changes.generatedMaterials = merged;
    notes.push(`Materiales detectados: ${detectedMaterials.join(', ')}`);
  }

  const fields = ['city', 'department', 'industry'];
  const inDuplicateGroup = duplicateGroups.find((g) => g.supplierIds.includes(supplier.id));

  fields.forEach((field) => {
    if (String(supplier[field] ?? '').trim()) return;

    if (inDuplicateGroup) {
      const donor = inDuplicateGroup.suppliers.find(
        (s) => s.id !== supplier.id && String(s[field] ?? '').trim()
      );
      if (donor) {
        changes[field] = donor[field];
        notes.push(`${field} sugerido desde registro similar`);
        return;
      }
    }

    if (field === 'industry' && !changes.industry) {
      const fromText = inferIndustryFromText(textBlob);
      if (fromText) {
        changes.industry = fromText;
        notes.push('Rubro inferido desde notas');
      }
    }
  });

  const score = computeDataQualityScore(supplier, mainContact, activities);
  const tier = getTierFromScore(score);
  const completeness = computeCompleteness(supplier, mainContact);

  changes.dataQualityScore = score;
  changes.dataQualityTier = tier;
  changes.dataQualityCompleteness = completeness;
  changes.dataQualityPotential = estimatePotential(score, supplier.estimatedMonthlyVolumeKg);

  return {
    supplierId: supplier.id,
    companyName: supplier.companyName,
    changes,
    notes,
    hasFieldChanges: Object.keys(changes).some(
      (k) => !k.startsWith('dataQuality')
    ),
  };
};

function inferIndustryFromText(text) {
  const t = text.toLowerCase();
  if (/metalurg/i.test(t)) return 'Metalurgia';
  if (/fundici[oó]n/i.test(t)) return 'Fundición';
  if (/frigor[ií]fic/i.test(t)) return 'Frigorífico';
  if (/el[eé]ctric/i.test(t)) return 'Eléctrica';
  return '';
}

/** Reporte por proveedor para la tabla principal. */
export const buildSupplierQualityReports = (suppliers, contacts, activities) => {
  try {
    const safeSuppliers = normalizeSuppliersForQuality(suppliers);
    const safeContacts = safeArray(contacts);
    const safeActivities = safeArray(activities);
    const mainBySupplier = buildMainContactBySupplier(safeContacts);
    const duplicateGroups = findDuplicateGroups(safeSuppliers, safeContacts);
    const duplicateIds = new Set(duplicateGroups.flatMap((g) => g.supplierIds));

    return safeSuppliers
      .map((supplier) => {
        try {
          const mainContact = mainBySupplier[supplier.id];
          const completeness = computeCompleteness(supplier, mainContact);
          const score = computeDataQualityScore(supplier, mainContact, safeActivities);
          const tier = getTierFromScore(score);
          const lastActivity = getLastActivityDate(supplier.id, safeActivities);
          const potential = estimatePotential(score, supplier.estimatedMonthlyVolumeKg);
          const suggestion = buildSuggestedImprovements(
            supplier,
            mainContact,
            safeActivities,
            safeSuppliers,
            duplicateGroups
          );

          return {
            supplier,
            mainContact,
            completeness,
            score,
            tier,
            tierLabel: TIER_LABELS[tier],
            lastActivity,
            potential,
            isDuplicate: duplicateIds.has(supplier.id),
            duplicateGroups: duplicateGroups.filter((g) =>
              g.supplierIds.includes(supplier.id)
            ),
            suggestion,
          };
        } catch (err) {
          console.warn('[Calidad] reporte ignorado:', supplier?.id, err);
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.error('[Calidad] buildSupplierQualityReports:', err);
    return [];
  }
};

export const getTierClass = (tier) => `dq-tier dq-tier--${tier.toLowerCase()}`;
