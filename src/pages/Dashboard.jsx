import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers } from '../services/suppliersService';
import { subscribeContacts } from '../services/contactsService';
import { subscribeActivities } from '../services/activitiesService';
import { subscribeOpportunities } from '../services/opportunitiesService';
import { formatDate, formatNumber, formatCurrency } from '../utils/format';
import { computeOpportunityStats } from '../utils/opportunities';
import { buildFollowUpItems, computeFollowUpStats } from '../utils/followUps';
import { subscribePendingVisitPhotos } from '../services/visitPhotosService';
import { ROUTES } from '../constants/routes';

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ready = 0;
    const onReady = () => {
      ready += 1;
      if (ready >= 4) setLoading(false);
    };
    const unsubs = [
      subscribeSuppliers((data) => { setSuppliers(data); onReady(); }),
      subscribeContacts((data) => { setContacts(data); onReady(); }),
      subscribeActivities((data) => { setActivities(data); onReady(); }),
      subscribeOpportunities((data) => { setOpportunities(data); onReady(); }),
      subscribePendingVisitPhotos((data) => setPendingPhotosCount(data.length)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = useMemo(() => {
    const activos = suppliers.filter((s) => s.status === 'Activo').length;
    const mainContacts = contacts.filter((c) => c.isMainContact).length;
    const oppStats = computeOpportunityStats(opportunities);
    const followUpItems = buildFollowUpItems(suppliers, activities, opportunities);
    const followUpStats = computeFollowUpStats(followUpItems);
    const urgentFollowUps = followUpItems
      .filter((i) => i.bucket === 'vencidos' || i.bucket === 'hoy')
      .slice(0, 5);
    return {
      suppliers: suppliers.length,
      activos,
      contacts: contacts.length,
      mainContacts,
      activities: activities.length,
      recentActivities: activities.slice(0, 5),
      followUpStats,
      urgentFollowUps,
      ...oppStats,
    };
  }, [suppliers, contacts, activities, opportunities]);

  if (loading) {
    return <div className="loading">Cargando dashboard…</div>;
  }

  return (
    <div>
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-card__label">Proveedores</div>
          <div className="stat-card__value">{stats.suppliers}</div>
          <div className="stat-card__hint">{stats.activos} activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Contactos</div>
          <div className="stat-card__value">{stats.contacts}</div>
          <div className="stat-card__hint">{stats.mainContacts} principales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Actividades</div>
          <div className="stat-card__value">{stats.activities}</div>
          <div className="stat-card__hint">Seguimiento registrado</div>
        </div>
      </div>

      <h3 className="dashboard-section-title">Oportunidades de compra</h3>
      <div className="card-grid">
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">Abiertas</div>
          <div className="stat-card__value">{stats.openCount}</div>
          <div className="stat-card__hint">En pipeline activo</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Ganadas</div>
          <div className="stat-card__value">{stats.wonCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Perdidas</div>
          <div className="stat-card__value">{stats.lostCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Volumen est. abierto</div>
          <div className="stat-card__value stat-card__value--sm">
            {formatNumber(stats.totalVolumeKg, ' kg')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Valor potencial est.</div>
          <div className="stat-card__value stat-card__value--sm">
            {formatCurrency(stats.totalPotentialValue)}
          </div>
          <div className="stat-card__hint">Oportunidades abiertas (PEN)</div>
        </div>
      </div>

      <h3 className="dashboard-section-title">Fotos de visita</h3>
      <div className="card-grid">
        <Link to={ROUTES.photoInbox} className="stat-card stat-card--accent stat-card--link">
          <div className="stat-card__label">Fotos pendientes de asignar</div>
          <div className="stat-card__value">{pendingPhotosCount}</div>
          <div className="stat-card__hint">Bandeja · tomar o subir desde el inicio</div>
        </Link>
      </div>

      <h3 className="dashboard-section-title">Seguimientos</h3>
      <div className="card-grid">
        <Link to="/seguimientos" className="stat-card stat-card--danger stat-card--link">
          <div className="stat-card__label">Vencidos</div>
          <div className="stat-card__value">{stats.followUpStats.vencidos}</div>
          <div className="stat-card__hint">Requieren atención</div>
        </Link>
        <Link to="/seguimientos" className="stat-card stat-card--link">
          <div className="stat-card__label">Hoy</div>
          <div className="stat-card__value">{stats.followUpStats.hoy}</div>
        </Link>
        <Link to="/seguimientos" className="stat-card stat-card--accent stat-card--link">
          <div className="stat-card__label">Próximos 7 días</div>
          <div className="stat-card__value">{stats.followUpStats.proximos7}</div>
        </Link>
      </div>

      {stats.urgentFollowUps.length > 0 && (
        <section className="dashboard-panel" style={{ marginBottom: '1.5rem' }}>
          <div className="dashboard-panel__header">
            <h3>Seguimientos urgentes</h3>
            <Link to="/seguimientos" className="btn btn--secondary btn--sm">Ver todos</Link>
          </div>
          <ul className="recent-list">
            {stats.urgentFollowUps.map((item) => {
              const supplier = suppliers.find((s) => s.id === item.supplierId);
              return (
                <li key={item.id}>
                  <span>
                    <strong>{item.sourceType}</strong> — {supplier?.companyName || 'Proveedor'}
                    <br />
                    <small>{item.detail}</small>
                  </span>
                  <span className="recent-list__meta">
                    <small>{formatDate(item.date)}</small>
                    <small className={item.bucket === 'vencidos' ? 'text-danger' : ''}>
                      {item.bucket === 'vencidos' ? 'Vencido' : 'Hoy'}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h3>Últimas actividades</h3>
            <Link to="/actividades" className="btn btn--secondary btn--sm">Ver todas</Link>
          </div>
          {stats.recentActivities.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>No hay actividades registradas.</p>
            </div>
          ) : (
            <ul className="recent-list">
              {stats.recentActivities.map((a) => {
                const supplier = suppliers.find((s) => s.id === a.supplierId);
                return (
                  <li key={a.id}>
                    <span>
                      <strong>{a.type}</strong> — {supplier?.companyName || 'Proveedor'}
                      <br />
                      <small>{a.summary?.slice(0, 60)}{a.summary?.length > 60 ? '…' : ''}</small>
                    </span>
                    <span className="recent-list__meta">
                      <small>{formatDate(a.date)}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h3>Próximas compras estimadas</h3>
            <Link to="/oportunidades" className="btn btn--secondary btn--sm">Ver oportunidades</Link>
          </div>
          {opportunities.filter((o) => o.expectedPurchaseDate).length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>Sin fechas de compra programadas.</p>
            </div>
          ) : (
            <ul className="recent-list">
              {[...opportunities]
                .filter((o) => o.expectedPurchaseDate)
                .sort((a, b) => {
                  const da = a.expectedPurchaseDate?.toDate?.() ?? new Date(a.expectedPurchaseDate);
                  const db = b.expectedPurchaseDate?.toDate?.() ?? new Date(b.expectedPurchaseDate);
                  return da - db;
                })
                .slice(0, 5)
                .map((o) => {
                  const supplier = suppliers.find((s) => s.id === o.supplierId);
                  return (
                    <li key={o.id}>
                      <span>
                        <strong>{o.material}</strong>
                        <br />
                        <small>{supplier?.companyName || 'Proveedor'}</small>
                      </span>
                      <span className="recent-list__meta">
                        <small>{formatDate(o.expectedPurchaseDate)}</small>
                        <small>{o.negotiationStatus}</small>
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      </div>

      <div className="dashboard-quick-links">
        <Link to={ROUTES.photoInbox} className="btn btn--primary">📷 Fotos</Link>
        <Link to="/proveedores" className="btn btn--secondary">Proveedores</Link>
        <Link to="/contactos" className="btn btn--secondary">Contactos</Link>
        <Link to="/actividades" className="btn btn--secondary">Actividades</Link>
        <Link to="/oportunidades" className="btn btn--secondary">Oportunidades</Link>
        <Link to="/seguimientos" className="btn btn--secondary">Seguimientos</Link>
        <Link to="/inteligencia" className="btn btn--secondary">Inteligencia</Link>
      </div>
    </div>
  );
}
