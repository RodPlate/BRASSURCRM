import { formatDate } from '../../utils/format';

export default function WorkCenterTaskCard({
  title,
  meta,
  badge,
  score,
  children,
  actions,
}) {
  return (
    <article className="work-center-card">
      <div className="work-center-card__main">
        <h4 className="work-center-card__title">{title}</h4>
        {meta && <p className="work-center-card__meta">{meta}</p>}
        {badge && <span className="work-center-card__badge">{badge}</span>}
        {score != null && (
          <span className="work-center-score">Score {score}</span>
        )}
        {children}
      </div>
      {actions && <div className="work-center-actions">{actions}</div>}
    </article>
  );
}

export function FollowUpMeta({ item, showOverdue, showLastActivity }) {
  const parts = [];
  if (showOverdue && item.overdueDays > 0) {
    parts.push(`${item.overdueDays} día${item.overdueDays === 1 ? '' : 's'} vencido${item.overdueDays === 1 ? '' : 's'}`);
  }
  if (showLastActivity) {
    parts.push(
      `Última actividad: ${item.lastActivity ? formatDate(item.lastActivity) : 'Sin registro'}`
    );
  }
  parts.push(`Seguimiento: ${formatDate(item.date)} · ${item.detail}`);
  return parts.join(' · ');
}
