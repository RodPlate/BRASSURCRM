import { updateSupplier } from './suppliersService';
import { materialsToArray } from '../utils/dataQuality';
import { safeArray } from '../utils/safeData';

const pickSupplierPatch = (changes) => {
  const patch = {};
  const allowed = [
    'city',
    'department',
    'industry',
    'generatedMaterials',
    'dataQualityScore',
    'dataQualityTier',
    'dataQualityCompleteness',
    'dataQualityPotential',
  ];

  allowed.forEach((key) => {
    if (changes[key] === undefined) return;
    if (key === 'generatedMaterials') {
      patch[key] = materialsToArray(changes[key]);
      return;
    }
    patch[key] = changes[key];
  });

  return patch;
};

/**
 * Confirma y persiste mejoras en Firestore (colección suppliers).
 */
export const confirmQualityChanges = async (pendingList) => {
  const result = {
    updated: 0,
    errors: [],
  };

  const items = safeArray(pendingList).filter((item) => item?.supplierId);

  const outcomes = await Promise.allSettled(
    items.map(async (item) => {
      const patch = pickSupplierPatch(item.changes);
      if (Object.keys(patch).length === 0) {
        return { skipped: true };
      }
      await updateSupplier(item.supplierId, patch);
      console.log('[dataQuality] Actualizado:', item.companyName, patch);
      return { companyName: item.companyName };
    })
  );

  outcomes.forEach((outcome, index) => {
    const item = items[index];
    if (outcome.status === 'fulfilled') {
      if (!outcome.value?.skipped) {
        result.updated += 1;
      }
      return;
    }
    console.error('[Calidad]', item?.companyName, outcome.reason);
    result.errors.push({
      supplierId: item?.supplierId,
      companyName: item?.companyName || 'Proveedor',
      message: outcome.reason?.message || 'Error al guardar',
    });
  });

  return result;
};
