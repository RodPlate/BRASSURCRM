import * as XLSX from 'xlsx';
import { formatDate } from './format';
const downloadWorkbook = (workbook, filename) => {
  XLSX.writeFile(workbook, filename);
};

const toDateStr = (value) => {
  if (!value) return '';
  const d = value?.toDate?.() ?? new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
};

export const exportSuppliersExcel = (suppliers) => {
  const rows = suppliers.map((s) => ({
    Empresa: s.companyName,
    RUC: s.ruc || '',
    Rubro: s.industry || '',
    Ciudad: s.city || '',
    Departamento: s.department || '',
    Tipo: s.supplierType || '',
    Materiales: Array.isArray(s.generatedMaterials)
      ? s.generatedMaterials.join(', ')
      : s.generatedMaterials || '',
    'Volumen mensual (kg)': s.estimatedMonthlyVolumeKg ?? '',
    Estado: s.status || '',
    Prioridad: s.priority || '',
    Origen: s.source || '',
    'Próximo seguimiento': toDateStr(s.nextFollowUpDate),
    Notas: s.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Proveedores');
  downloadWorkbook(wb, `crm-brassur-proveedores-${Date.now()}.xlsx`);
};

export const exportOpportunitiesExcel = (opportunities, supplierMap) => {
  const rows = opportunities.map((o) => ({
    Proveedor: supplierMap[o.supplierId] || '',
    Material: o.material || '',
    'Volumen (kg)': o.estimatedVolumeKg ?? '',
    'Precio objetivo': o.targetPrice ?? '',
    'Oferta actual': o.currentOfferPrice ?? '',
    Moneda: o.currency || '',
    Estado: o.negotiationStatus || '',
    'Fecha compra': toDateStr(o.expectedPurchaseDate),
    Probabilidad: o.probability ?? '',
    Notas: o.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Oportunidades');
  downloadWorkbook(wb, `crm-brassur-oportunidades-${Date.now()}.xlsx`);
};

export const exportActivitiesExcel = (activities, supplierMap, contactMap) => {
  const rows = activities.map((a) => ({
    Proveedor: supplierMap[a.supplierId] || '',
    Contacto: contactMap[a.contactId] || '',
    Tipo: a.type || '',
    Fecha: toDateStr(a.date),
    Resumen: a.summary || '',
    'Próxima acción': a.nextAction || '',
    'Próximo seguimiento': toDateStr(a.nextFollowUpDate),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Actividades');
  downloadWorkbook(wb, `crm-brassur-actividades-${Date.now()}.xlsx`);
};

export const exportDashboardExcel = (snapshot) => {
  const { kpis, ranking, byMaterial, byDepartment, recommendedActions } = snapshot;
  const wb = XLSX.utils.book_new();

  const kpiRows = [
    ['Indicador', 'Valor'],
    ['Proveedores totales', kpis.totalSuppliers],
    ['Proveedores activos', kpis.activeSuppliers],
    ['Proveedores nuevos este mes', kpis.newThisMonth],
    ['Oportunidades abiertas', kpis.openOpportunities],
    ['Oportunidades ganadas', kpis.wonOpportunities],
    ['Volumen potencial (kg)', kpis.potentialVolumeKg],
    ['Volumen ganado (kg)', kpis.wonVolumeKg],
    ['Tasa de conversión (%)', kpis.conversionRate],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPIs');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ranking.map((r) => ({
        Proveedor: r.companyName,
        Ciudad: r.city,
        Material: r.mainMaterial,
        'Volumen est.': r.estimatedVolume,
        Actividades: r.activityCount,
        'Último contacto': r.lastContact ? formatDate(r.lastContact) : '',
        Estado: r.status,
        Score: r.score,
        Clasificación: r.classification,
      }))
    ),
    'Ranking'
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byMaterial), 'Por material');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDepartment), 'Geográfico');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      recommendedActions.map((a) => ({
        Prioridad: a.priority,
        Acción: a.action,
        Proveedor: a.supplierName,
        Motivo: a.reason,
      }))
    ),
    'Acciones'
  );

  downloadWorkbook(wb, `crm-brassur-inteligencia-${Date.now()}.xlsx`);
};

export const exportFullReportExcel = (suppliers, opportunities, activities, snapshot, supplierMap, contactMap) => {
  const wb = XLSX.utils.book_new();

  const kpiSheet = [
    ['CRM BRASSUR — Inteligencia Comercial'],
    ['Generado', new Date().toLocaleString('es-PE')],
    [],
    ['Indicador', 'Valor'],
    ['Proveedores totales', snapshot.kpis.totalSuppliers],
    ['Proveedores activos', snapshot.kpis.activeSuppliers],
    ['Nuevos este mes', snapshot.kpis.newThisMonth],
    ['Oportunidades abiertas', snapshot.kpis.openOpportunities],
    ['Oportunidades ganadas', snapshot.kpis.wonOpportunities],
    ['Volumen potencial (kg)', snapshot.kpis.potentialVolumeKg],
    ['Volumen ganado (kg)', snapshot.kpis.wonVolumeKg],
    ['Tasa conversión (%)', snapshot.kpis.conversionRate],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiSheet), 'Dashboard');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      suppliers.map((s) => ({
        Empresa: s.companyName,
        Ciudad: s.city,
        Departamento: s.department,
        Estado: s.status,
        Prioridad: s.priority,
        'Volumen (kg)': s.estimatedMonthlyVolumeKg,
        Score: snapshot.ranking.find((r) => r.id === s.id)?.score ?? '',
        Clasificación: snapshot.ranking.find((r) => r.id === s.id)?.classification ?? '',
      }))
    ),
    'Proveedores'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      opportunities.map((o) => ({
        Proveedor: supplierMap[o.supplierId],
        Material: o.material,
        Volumen: o.estimatedVolumeKg,
        Estado: o.negotiationStatus,
      }))
    ),
    'Oportunidades'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      activities.map((a) => ({
        Proveedor: supplierMap[a.supplierId],
        Tipo: a.type,
        Fecha: toDateStr(a.date),
        Resumen: a.summary,
      }))
    ),
    'Actividades'
  );

  downloadWorkbook(wb, `crm-brassur-reporte-completo-${Date.now()}.xlsx`);
};
