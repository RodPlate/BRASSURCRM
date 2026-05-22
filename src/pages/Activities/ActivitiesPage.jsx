import { useEffect, useMemo, useState } from 'react';
import { subscribeActivities, deleteActivity } from '../../services/activitiesService';
import { subscribeSuppliers } from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { ACTIVITY_TYPES } from '../../constants/enums';
import { formatDate } from '../../utils/format';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ActivityFormModal from '../../components/activities/ActivityFormModal';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalActivity, setModalActivity] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeActivities((data) => {
        setActivities(data);
        setLoading(false);
      }),
      subscribeSuppliers(setSuppliers),
      subscribeContacts(setContacts),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.companyName])),
    [suppliers]
  );

  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c.name])),
    [contacts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      const matchSupplier = !supplierFilter || a.supplierId === supplierFilter;
      const matchType = !typeFilter || a.type === typeFilter;
      const matchSearch =
        !q ||
        (a.summary || '').toLowerCase().includes(q) ||
        (a.nextAction || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q) ||
        (supplierMap[a.supplierId] || '').toLowerCase().includes(q) ||
        (contactMap[a.contactId] || '').toLowerCase().includes(q);
      return matchSupplier && matchType && matchSearch;
    });
  }, [activities, search, supplierFilter, typeFilter, supplierMap, contactMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteActivity(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Actividades</h2>
          <p>{filtered.length} de {activities.length} registros · más recientes primero</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setModalActivity('new')}>
          + Nueva actividad
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por resumen, acción, tipo o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando actividades…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron actividades.</p>
          <button type="button" className="btn btn--primary" onClick={() => setModalActivity('new')} style={{ marginTop: '1rem' }}>
            Registrar actividad
          </button>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Resumen</th>
                <th>Próxima acción</th>
                <th>Seguimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.date)}</td>
                  <td><strong>{a.type}</strong></td>
                  <td>{supplierMap[a.supplierId] || '—'}</td>
                  <td>{contactMap[a.contactId] || '—'}</td>
                  <td>{a.summary?.slice(0, 50)}{a.summary?.length > 50 ? '…' : ''}</td>
                  <td>{a.nextAction || '—'}</td>
                  <td>{formatDate(a.nextFollowUpDate)}</td>
                  <td>
                    <div className="data-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalActivity(a)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget(a)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActivityFormModal
        open={modalActivity !== null}
        onClose={() => setModalActivity(null)}
        activity={modalActivity === 'new' ? null : modalActivity}
        defaultSupplierId={supplierFilter}
        suppliers={suppliers}
        contacts={contacts}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar actividad"
          message="¿Eliminar este registro de actividad?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
