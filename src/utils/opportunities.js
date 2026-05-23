import { parseCRMDate } from './parseDate';
import { normalizeCurrency } from './currency';

export const OPEN_OPPORTUNITY_STATUSES = [
  'Nueva',
  'En análisis',
  'Cotizando',
  'Negociando',
  'Pausada',
];

export const isOpenOpportunity = (status) =>
  OPEN_OPPORTUNITY_STATUSES.includes(status);

export const isWonOpportunity = (status) => status === 'Ganada';

export const isLostOpportunity = (status) => status === 'Perdida';

export const getOpportunityUnitPrice = (opp) => {
  const offer = Number(opp.currentOfferPrice);
  const target = Number(opp.targetPrice);
  if (!Number.isNaN(offer) && offer > 0) return offer;
  if (!Number.isNaN(target) && target > 0) return target;
  return 0;
};

export const getOpportunityPotentialValue = (opp) => {
  const volume = Number(opp.estimatedVolumeKg) || 0;
  const price = getOpportunityUnitPrice(opp);
  const probability = Number(opp.probability);
  const factor = !Number.isNaN(probability) && probability > 0 ? probability / 100 : 1;
  return volume * price * factor;
};

export const parseExpectedPurchaseDate = (value) => parseCRMDate(value);

export const sortByExpectedPurchaseDate = (list, direction = 'asc') => {
  const sorted = [...list].sort((a, b) => {
    const da = parseExpectedPurchaseDate(a.expectedPurchaseDate);
    const db = parseExpectedPurchaseDate(b.expectedPurchaseDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
};

export const computeOpportunityStats = (opportunities) => {
  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let totalVolumeKg = 0;
  let totalPotentialValue = 0;

  opportunities.forEach((o) => {
    const status = o.negotiationStatus;
    if (isOpenOpportunity(status)) {
      openCount += 1;
      totalVolumeKg += Number(o.estimatedVolumeKg) || 0;
      totalPotentialValue += getOpportunityPotentialValue(o);
    }
    if (isWonOpportunity(status)) wonCount += 1;
    if (isLostOpportunity(status)) lostCount += 1;
  });

  return { openCount, wonCount, lostCount, totalVolumeKg, totalPotentialValue };
};

/** Totales de valor potencial por moneda (sin convertir tipos de cambio). */
export const computePotentialByCurrency = (opportunities) => {
  const totals = { USD: 0, PYG: 0 };

  opportunities.forEach((o) => {
    if (!isOpenOpportunity(o.negotiationStatus)) return;
    const code = normalizeCurrency(o.currency);
    totals[code] += getOpportunityPotentialValue(o);
  });

  return totals;
};
