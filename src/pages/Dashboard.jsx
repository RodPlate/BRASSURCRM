import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers } from '../services/suppliersService';
import { subscribeActivities } from '../services/activitiesService';
import { subscribeOpportunities } from '../services/opportunitiesService';
import { subscribePendingVisitPhotos } from '../services/visitPhotosService';
import { computeOpportunityStats } from '../utils/opportunities';
import { startOfDay } from '../utils/followUps';
import { parseCRMDate } from '../utils/parseDate';
import { ROUTES } from '../constants/routes';

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ready = 0;
    const onReady = () => {
      ready += 1;
      if (ready >= 3) setLoading(false);
    };
    const unsubs = [
      subscribeSuppliers((data) => { setSuppliers(data); onReady(); }),
      subscribeActivities((data) => { setActivities(data); onReady(); }),
      subscribeOpportunities((data) => { setOpportunities(data); onReady(); }),
      subscribePendingVisitPhotos((data) => setPendingPhotosCount(data.length)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const activos = suppliers.filter((s) => s.status === 'Activo').length;
    const activitiesToday = activities.filter((a) => {
      const d = parseCRMDate(a.date);
      return d && startOfDay(d).getTime() === today.getTime();
    }).length;
    const { openCount, wonCount } = computeOpportunityStats(opportunities);
    return { activos, activitiesToday, openCount, wonCount };
  }, [suppliers, activities, opportunities]);

  if (loading) {
    return <div className="loading">Cargando dashboard…</div>;
  }

  return (
    <div>
      <div className="card-grid card-grid--dashboard">
        <Link to={ROUTES.suppliers} className="stat-card stat-card--link">
          <div className="stat-card__label">Proveedores activos</div>
          <div className="stat-card__value">{stats.activos}</div>
        </Link>
        <Link to={ROUTES.activities} className="stat-card stat-card--link">
          <div className="stat-card__label">Actividades hoy</div>
          <div className="stat-card__value">{stats.activitiesToday}</div>
        </Link>
        <Link to={ROUTES.opportunities} className="stat-card stat-card--accent stat-card--link">
          <div className="stat-card__label">Oportunidades abiertas</div>
          <div className="stat-card__value">{stats.openCount}</div>
        </Link>
        <Link to={ROUTES.opportunities} className="stat-card stat-card--link">
          <div className="stat-card__label">Negocios ganados</div>
          <div className="stat-card__value">{stats.wonCount}</div>
        </Link>
        <Link to={ROUTES.photoInbox} className="stat-card stat-card--link">
          <div className="stat-card__label">Fotos pendientes</div>
          <div className="stat-card__value">{pendingPhotosCount}</div>
        </Link>
      </div>

      <div className="dashboard-quick-links">
        <Link to={ROUTES.suppliers} className="btn btn--primary">+ Proveedor</Link>
        <Link to={ROUTES.activities} className="btn btn--secondary">+ Actividad</Link>
        <Link to={ROUTES.opportunities} className="btn btn--secondary">+ Oportunidad</Link>
        <Link to={ROUTES.photoInbox} className="btn btn--secondary">📷 Fotos</Link>
        <Link to={ROUTES.today} className="btn btn--secondary">☀ Hoy</Link>
      </div>
    </div>
  );
}
