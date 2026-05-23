import { TIMELINE_TYPES } from '../constants/timelineTypes';

export const activityTypeToTimelineType = (activityType) => {
  const t = String(activityType || '').toLowerCase();
  if (t.includes('llamada')) return TIMELINE_TYPES.ACTIVITY_CALL;
  if (t.includes('whatsapp')) return TIMELINE_TYPES.ACTIVITY_WHATSAPP;
  if (t.includes('reunión') || t.includes('reunion')) return TIMELINE_TYPES.ACTIVITY_MEETING;
  if (t.includes('visita')) return TIMELINE_TYPES.ACTIVITY_VISIT;
  if (t.includes('email')) return TIMELINE_TYPES.ACTIVITY_EMAIL;
  return TIMELINE_TYPES.ACTIVITY_OTHER;
};

export const typeMatchesFilterGroup = (eventType, group) => {
  if (!group) return true;
  if (group === 'supplier') return eventType.startsWith('supplier_');
  if (group === 'contact') return eventType.startsWith('contact_');
  if (group === 'activity') return eventType.startsWith('activity_');
  if (group === 'opportunity') return eventType.startsWith('opportunity_');
  if (group === 'note') return eventType === TIMELINE_TYPES.NOTE_QUICK;
  if (group === 'photo') {
    return (
      eventType === TIMELINE_TYPES.VISIT_PHOTO_UPLOADED ||
      eventType === TIMELINE_TYPES.VISIT_PHOTO_ASSIGNED ||
      eventType === TIMELINE_TYPES.VISIT_PHOTO_DELETED
    );
  }
  return true;
};

export const parseTimelineDate = (value) => {
  if (!value) return null;
  const d = value?.toDate?.() ?? new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const filterTimelineEvents = (events, { period = '', typeGroup = '', user = '' }) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  return events.filter((ev) => {
    if (typeGroup && !typeMatchesFilterGroup(ev.type, typeGroup)) return false;
    if (user && ev.user !== user) return false;

    if (!period) return true;
    const d = parseTimelineDate(ev.date);
    if (!d) return false;

    if (period === 'today') return d >= todayStart;
    if (period === 'week') return d >= weekStart;
    if (period === 'month') return d >= monthStart;
    return true;
  });
};

export const formatTimelineDay = (value) => {
  const d = parseTimelineDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const collectTimelineUsers = (events) => {
  const users = new Set();
  events.forEach((e) => {
    if (e.user) users.add(e.user);
  });
  return [...users].sort();
};
