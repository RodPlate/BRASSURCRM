import * as XLSX from 'xlsx';
import { SUPPLIER_STATUSES, PRIORITIES } from '../constants/enums';

export const SHEET_NAME = 'PROVEEDORES POT.';

const MATERIAL_COLUMNS = [
  { key: 'COBRE', label: 'Cobre' },
  { key: 'ALUMINIO', label: 'Aluminio' },
  { key: 'HIERRO', label: 'Hierro' },
  { key: 'INOX', label: 'Inox' },
];

const COLUMN_ALIASES = {
  companyName: ['EMPRESA', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'NOMBRE'],
  industry: ['RUBRO', 'INDUSTRIA'],
  city: ['CIUDAD'],
  department: ['DEPARTAMENTO', 'DEPTO', 'DPTO'],
  estimatedMonthlyVolumeKg: ['VOLUMEN MENSUAL', 'VOLUMEN', 'VOL MENSUAL', 'KG MENSUAL'],
  contactName: ['CONTACTO', 'NOMBRE CONTACTO'],
  contactRole: ['RESPONSABLE', 'CARGO', 'ROL'],
  phone: ['TELEFONO', 'TELÉFONO', 'CELULAR', 'MOVIL', 'MÓVIL'],
  status: ['ESTADO', 'STATUS'],
  priority: ['PRIORIDAD', 'PRIORITY'],
  lastVisitDate: ['ULTIMA VISITA', 'ÚLTIMA VISITA', 'FECHA VISITA', 'ULT VISITA'],
  notes: ['OBS', 'OBSERVACIONES', 'NOTAS', 'COMENTARIOS'],
};

const TEXT_FIELDS = [
  'companyName',
  'industry',
  'city',
  'department',
  'status',
  'supplierType',
  'priority',
  'source',
  'notes',
  'ruc',
  'contactName',
  'contactRole',
  'phone',
];

export const normalizeHeader = (h) =>
  String(h ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const normalizeCompanyKey = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const cellToString = (value) => {
  if (value == null) return '';
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  return String(value).trim();
};

const materialCellActive = (value) => {
  const s = cellToString(value).toLowerCase();
  if (!s) return false;
  if (['no', 'n', '0', '-', 'na', 'n/a', 'sin'].includes(s)) return false;
  return true;
};

export const parseExcelDate = (value) => {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, '0');
    const d = String(parsed.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = cellToString(value);
  if (!text) return null;
  const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const iso = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const attempt = new Date(text);
  if (!Number.isNaN(attempt.getTime())) {
    return attempt.toISOString().split('T')[0];
  }
  return null;
};

export const mapStatus = (raw) => {
  const s = cellToString(raw).toLowerCase();
  if (!s) return 'Nuevo';
  const direct = SUPPLIER_STATUSES.find(
    (st) => st.toLowerCase() === s || normalizeHeader(st) === normalizeHeader(raw)
  );
  if (direct) return direct;

  const rules = [
    { keys: ['activo', 'active', 'ok'], status: 'Activo' },
    { keys: ['contactado', 'contact'], status: 'Contactado' },
    { keys: ['interesado', 'interes'], status: 'Interesado' },
    { keys: ['negociando', 'negocia'], status: 'Negociando' },
    { keys: ['inactivo', 'inactive', 'baja'], status: 'Inactivo' },
    { keys: ['descartado', 'descarte', 'no'], status: 'Descartado' },
    { keys: ['nuevo', 'new', 'pendiente'], status: 'Nuevo' },
  ];
  for (const rule of rules) {
    if (rule.keys.some((k) => s.includes(k))) return rule.status;
  }
  return 'Nuevo';
};

export const mapPriority = (raw) => {
  const s = cellToString(raw);
  if (!s) return 'Media';
  const direct = PRIORITIES.find(
    (p) => p.toLowerCase() === s.toLowerCase() || normalizeHeader(p) === normalizeHeader(raw)
  );
  if (direct) return direct;
  const lower = s.toLowerCase();
  if (lower.includes('alta') || lower.includes('high')) return 'Alta';
  if (lower.includes('baja') || lower.includes('low')) return 'Baja';
  return 'Media';
};

const buildHeaderMap = (headerRow) => {
  const map = {};
  const normalizedHeaders = headerRow.map((h) => normalizeHeader(h));

  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const idx = normalizedHeaders.findIndex((h) =>
      aliases.some((a) => h === normalizeHeader(a) || h.includes(normalizeHeader(a)))
    );
    if (idx >= 0) map[field] = idx;
  });

  MATERIAL_COLUMNS.forEach(({ key }) => {
    const idx = normalizedHeaders.findIndex((h) => h === key || h.includes(key));
    if (idx >= 0) map[`mat_${key}`] = idx;
  });

  return map;
};

export const buildGeneratedMaterialsArray = (row, headerMap) => {
  const materials = [];
  MATERIAL_COLUMNS.forEach(({ key, label }) => {
    const idx = headerMap[`mat_${key}`];
    if (idx == null) return;
    if (materialCellActive(row[idx])) {
      materials.push(label);
    }
  });
  return materials;
};

const parseVolume = (value) => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.round(value);
  }
  const s = cellToString(value).replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(s);
  return Number.isNaN(num) ? 0 : Math.round(num);
};

export const rowToSupplierPayload = (row, headerMap) => {
  const get = (field) => {
    const idx = headerMap[field];
    return idx == null ? '' : row[idx];
  };

  const companyName = cellToString(get('companyName'));
  const lastVisitDate = parseExcelDate(get('lastVisitDate'));
  const obs = cellToString(get('notes'));
  const visitNote = lastVisitDate ? `Última visita (importación): ${lastVisitDate}` : '';
  const notes = [obs, visitNote].filter(Boolean).join('\n');

  return {
    companyName,
    industry: cellToString(get('industry')),
    city: cellToString(get('city')),
    department: cellToString(get('department')),
    generatedMaterials: buildGeneratedMaterialsArray(row, headerMap),
    estimatedMonthlyVolumeKg: parseVolume(get('estimatedMonthlyVolumeKg')),
    status: mapStatus(get('status')),
    supplierType: 'Empresa',
    priority: mapPriority(get('priority')),
    source: 'Base Inicial 2026',
    nextFollowUpDate: null,
    notes,
    ruc: '',
    contactName: cellToString(get('contactName')),
    contactRole: cellToString(get('contactRole')),
    phone: cellToString(get('phone')),
    lastVisitDate,
  };
};

/** Convierte undefined/null en textos vacíos, normaliza números y arrays para Firestore. */
export const sanitizeImportRow = (row) => {
  const cleaned = { ...row };

  TEXT_FIELDS.forEach((field) => {
    const v = cleaned[field];
    if (v === undefined || v === null) {
      cleaned[field] = '';
    } else if (typeof v === 'string') {
      cleaned[field] = v.trim();
    }
  });

  cleaned.estimatedMonthlyVolumeKg = parseVolume(cleaned.estimatedMonthlyVolumeKg);
  cleaned.status = cellToString(cleaned.status) ? mapStatus(cleaned.status) : 'Nuevo';
  cleaned.priority = cellToString(cleaned.priority) ? mapPriority(cleaned.priority) : 'Media';
  cleaned.lastVisitDate = parseExcelDate(cleaned.lastVisitDate);

  if (!Array.isArray(cleaned.generatedMaterials)) {
    cleaned.generatedMaterials = [];
  } else {
    cleaned.generatedMaterials = cleaned.generatedMaterials.filter(Boolean);
  }

  if (!cleaned.supplierType) cleaned.supplierType = 'Empresa';
  if (!cleaned.source) cleaned.source = 'Base Inicial 2026';

  return cleaned;
};

export const toSupplierFirestoreDoc = (row) => {
  const {
    contactName,
    contactRole,
    phone,
    lastVisitDate,
    rowNumber,
    isDuplicate,
    duplicateOf,
    ...supplier
  } = sanitizeImportRow(row);

  const doc = {};
  Object.entries(supplier).forEach(([key, value]) => {
    if (value === undefined) {
      doc[key] = '';
    } else if (value === null && key !== 'nextFollowUpDate') {
      doc[key] = '';
    } else {
      doc[key] = value;
    }
  });

  return {
    doc,
    contactName: contactName || '',
    contactRole: contactRole || '',
    phone: phone || '',
    lastVisitDate: lastVisitDate || null,
    rowNumber,
  };
};

export const parseSuppliersExcel = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheet =
    workbook.Sheets[SHEET_NAME] ||
    workbook.Sheets[workbook.SheetNames.find((n) => normalizeHeader(n).includes('PROVEEDORES'))];

  if (!sheet) {
    throw new Error(
      `No se encontró la hoja "${SHEET_NAME}". Hojas disponibles: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) {
    throw new Error('La hoja no contiene filas de datos.');
  }

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const line = (rows[i] || []).map(normalizeHeader).join(' ');
    if (line.includes('EMPRESA')) {
      headerRowIndex = i;
      break;
    }
  }

  const headerMap = buildHeaderMap(rows[headerRowIndex]);
  if (headerMap.companyName == null) {
    throw new Error('No se encontró la columna EMPRESA en el archivo.');
  }

  const parsed = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => cellToString(c) === '')) continue;

    const payload = rowToSupplierPayload(row, headerMap);
    if (!payload.companyName) continue;

    parsed.push({
      rowNumber: i + 1,
      ...sanitizeImportRow(payload),
    });
  }

  return { rows: parsed, headerMap, sheetName: SHEET_NAME };
};

export const buildExistingCompanyKeySet = (existingSuppliers) => {
  const keys = new Set();
  const nameByKey = new Map();
  existingSuppliers.forEach((s) => {
    const key = normalizeCompanyKey(s.companyName);
    if (!key) return;
    keys.add(key);
    if (!nameByKey.has(key)) {
      nameByKey.set(key, s.companyName);
    }
  });
  return { keys, nameByKey };
};

export const markDuplicates = (importRows, existingSuppliers) => {
  const { keys: existingKeys, nameByKey } = buildExistingCompanyKeySet(existingSuppliers);

  return importRows.map((row) => {
    const key = normalizeCompanyKey(row.companyName);
    const isDuplicate = existingKeys.has(key);
    return {
      ...row,
      isDuplicate,
      duplicateOf: isDuplicate ? nameByKey.get(key) ?? null : null,
    };
  });
};

export const summarizeImportRows = (rows, onlyNew) => {
  const duplicates = rows.filter((r) => r.isDuplicate).length;
  const toImport = onlyNew ? rows.filter((r) => !r.isDuplicate) : rows;
  return {
    total: rows.length,
    duplicates,
    toImport: toImport.length,
    skipped: onlyNew ? duplicates : 0,
  };
};

export const materialsLabel = (materials) => {
  if (!materials) return '';
  if (Array.isArray(materials)) return materials.filter(Boolean).join(', ');
  return String(materials);
};
