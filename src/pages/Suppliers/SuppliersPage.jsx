import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import {
  subscribeSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { subscribeActivities } from '../../services/activitiesService';
import { subscribeOpportunities } from '../../services/opportunitiesService';
import { SUPPLIER_STATUSES } from '../../constants/enums';
import { formatDate } from '../../utils/format';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import SupplierForm, { getEmptySupplier, supplierToForm } from './SupplierForm';
import SupplierDetailPanel from './SupplierDetailPanel';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptySupplier());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeSuppliers((data) => {
        setSuppliers(data);
        setLoading(false);
      }),
      subscribeContacts(setContacts),
      subscribeActivities(setActivities),
      subscribeOpportunities(setOpportunities),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const contactCountBySupplier = useMemo(() => {
    const map = {};
    contacts.forEach((c) => {
      map[c.supplierId] = (map[c.supplierId] || 0) + 1;
    });
    return map;
  }, [contacts]);

  const opportunityCountBySupplier = useMemo(() => {
    const map = {};
    opportunities.forEach((o) => {
      map[o.supplierId] = (map[o.supplierId] || 0) + 1;
    });
    return map;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchStatus = !statusFilter || s.status === statusFilter;
      const matchSearch =
        !q ||
        (s.companyName || '').toLowerCase().includes(q) ||
        (s.ruc || '').toLowerCase().includes(q) ||
        (s.industry || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (Array.isArray(s.generatedMaterials)
          ? s.generatedMaterials.join(', ')
          : s.generatedMaterials || ''
        )
          .toLowerCase()
          .includes(q);
      return matchStatus && matchSearch;
    });
  }, [suppliers, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(getEmptySupplier());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (supplier) => {
    setDetailSupplier(null);
    setEditingId(supplier.id);
    setForm(supplierToForm(supplier));
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(getEmptySupplier());
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError('La razón social es obligatoria.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        nextFollowUpDate: form.nextFollowUpDate || null,
      };
      if (editingId) {
        const previous = suppliers.find((s) => s.id === editingId);
        await updateSupplier(editingId, payload, { previous });
      } else {
        await createSupplier(payload);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Error al guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      if (detailSupplier?.id === deleteTarget.id) setDetailSupplier(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Error al eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Proveedores</h2>
          <p>{filtered.length} de {suppliers.length} registros</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={ROUTES.importSuppliers} className="btn btn--secondary">
            Importar Proveedores
          </Link>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Nuevo proveedor
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por nombre, RUC, rubro, ciudad o materiales..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {SUPPLIER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando proveedores…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron proveedores.</p>
          {!search && !statusFilter && (
            <button type="button" className="btn btn--primary" onClick={openCreate} style={{ marginTop: '1rem' }}>
              Crear primer proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>RUC</th>
                <th>Rubro</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Contactos</th>
                <th>Oportunidades</th>
                <th>Seguimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.companyName}</strong></td>
                  <td>{s.ruc || '—'}</td>
                  <td>{s.industry || '—'}</td>
                  <td>{s.city || '—'}</td>
                  <td><StatusBadge value={s.status} /></td>
                  <td>{contactCountBySupplier[s.id] || 0}</td>
                  <td>{opportunityCountBySupplier[s.id] || 0}</td>
                  <td>{formatDate(s.nextFollowUpDate)}</td>
                  <td>
                    <div className="data-table__actions">
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => setDetailSupplier(s)}>
                        Ficha
                      </button>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEdit(s)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => setDeleteTarget(s)}
                      >
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

      {detailSupplier && (
        <SupplierDetailPanel
          supplier={detailSupplier}
          contacts={contacts}
          activities={activities}
          opportunities={opportunities}
          suppliers={suppliers}
          allContacts={contacts}
          onClose={() => setDetailSupplier(null)}
          onEditSupplier={openEdit}
        />
      )}

      {modalOpen && (
        <Modal
          title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
          onClose={closeModal}
          wide
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" form="supplier-form" className="btn btn--primary" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert--error">{error}</div>}
          <form id="supplier-form" onSubmit={handleSubmit}>
            <SupplierForm form={form} onChange={setForm} />
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar proveedor"
          message={`¿Eliminar "${deleteTarget.companyName}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
