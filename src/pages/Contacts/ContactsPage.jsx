import { useEffect, useMemo, useState } from 'react';
import { subscribeContacts, deleteContact, setMainContact } from '../../services/contactsService';
import { subscribeSuppliers } from '../../services/suppliersService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ContactFormModal from '../../components/contacts/ContactFormModal';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [modalContact, setModalContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeContacts((data) => {
        setContacts(data);
        setLoading(false);
      }),
      subscribeSuppliers(setSuppliers),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.companyName])),
    [suppliers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchSupplier = !supplierFilter || c.supplierId === supplierFilter;
      const matchSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.role || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.whatsapp || '').toLowerCase().includes(q) ||
        (supplierMap[c.supplierId] || '').toLowerCase().includes(q);
      return matchSupplier && matchSearch;
    });
  }, [contacts, search, supplierFilter, supplierMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContact(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Contactos</h2>
          <p>{filtered.length} de {contacts.length} registros</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setModalContact('new')}>
          + Nuevo contacto
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por nombre, rol, email, teléfono o proveedor..."
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
      </div>

      {loading ? (
        <div className="loading">Cargando contactos…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron contactos.</p>
          <button type="button" className="btn btn--primary" onClick={() => setModalContact('new')} style={{ marginTop: '1rem' }}>
            Crear contacto
          </button>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Proveedor</th>
                <th>Rol</th>
                <th>Teléfono</th>
                <th>WhatsApp</th>
                <th>Email</th>
                <th>Principal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{supplierMap[c.supplierId] || '—'}</td>
                  <td>{c.role || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.whatsapp || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>
                    {c.isMainContact ? (
                      <span className="badge badge--activo">Principal</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setMainContact(c)}
                      >
                        Marcar
                      </button>
                    )}
                  </td>
                  <td>
                    <div className="data-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalContact(c)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget(c)}>
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

      <ContactFormModal
        open={modalContact !== null}
        onClose={() => setModalContact(null)}
        contact={modalContact === 'new' ? null : modalContact}
        defaultSupplierId={supplierFilter}
        suppliers={suppliers}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar contacto"
          message={`¿Eliminar el contacto "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
