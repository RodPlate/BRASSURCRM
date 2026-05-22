import { useEffect, useMemo, useState } from 'react';
import { subscribeOpportunities, deleteOpportunity } from '../../services/opportunitiesService';
import { subscribeSuppliers } from '../../services/suppliersService';
import { NEGOTIATION_STATUSES } from '../../constants/enums';
import { formatDate, formatNumber, formatCurrency } from '../../utils/format';
import { sortByExpectedPurchaseDate, getOpportunityPotentialValue } from '../../utils/opportunities';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import NegotiationBadge from '../../components/common/NegotiationBadge';
import OpportunityFormModal from '../../components/opportunities/OpportunityFormModal';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpportunity, setModalOpportunity] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeOpportunities((data) => {
        setOpportunities(data);
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

  const materialOptions = useMemo(() => {
    const set = new Set(opportunities.map((o) => o.material).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = opportunities.filter((o) => {
      const matchSupplier = !supplierFilter || o.supplierId === supplierFilter;
      const matchMaterial = !materialFilter || o.material === materialFilter;
      const matchStatus = !statusFilter || o.negotiationStatus === statusFilter;
      const matchSearch =
        !q ||
        (o.material || '').toLowerCase().includes(q) ||
        (o.notes || '').toLowerCase().includes(q) ||
        (supplierMap[o.supplierId] || '').toLowerCase().includes(q);
      return matchSupplier && matchMaterial && matchStatus && matchSearch;
    });
    return sortByExpectedPurchaseDate(list, 'asc');
  }, [opportunities, search, supplierFilter, materialFilter, statusFilter, supplierMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOpportunity(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Oportunidades de compra</h2>
          <p>{filtered.length} de {opportunities.length} · ordenadas por fecha de compra estimada</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setModalOpportunity('new')}>
          + Nueva oportunidad
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por material, notas o proveedor..."
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
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
        >
          <option value="">Todos los materiales</option>
          {materialOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {NEGOTIATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando oportunidades…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron oportunidades.</p>
          <button type="button" className="btn btn--primary" onClick={() => setModalOpportunity('new')} style={{ marginTop: '1rem' }}>
            Crear oportunidad
          </button>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha compra</th>
                <th>Material</th>
                <th>Proveedor</th>
                <th>Volumen (kg)</th>
                <th>Precio obj.</th>
                <th>Oferta</th>
                <th>Estado</th>
                <th>Valor pot.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>{formatDate(o.expectedPurchaseDate)}</td>
                  <td><strong>{o.material}</strong></td>
                  <td>{supplierMap[o.supplierId] || '—'}</td>
                  <td>{formatNumber(o.estimatedVolumeKg, ' kg')}</td>
                  <td>{formatCurrency(o.targetPrice, o.currency)}</td>
                  <td>{formatCurrency(o.currentOfferPrice, o.currency)}</td>
                  <td><NegotiationBadge value={o.negotiationStatus} /></td>
                  <td>{formatCurrency(getOpportunityPotentialValue(o), o.currency)}</td>
                  <td>
                    <div className="data-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalOpportunity(o)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget(o)}>
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

      <OpportunityFormModal
        open={modalOpportunity !== null}
        onClose={() => setModalOpportunity(null)}
        opportunity={modalOpportunity === 'new' ? null : modalOpportunity}
        defaultSupplierId={supplierFilter}
        suppliers={suppliers}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar oportunidad"
          message={`¿Eliminar la oportunidad de "${deleteTarget.material}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
