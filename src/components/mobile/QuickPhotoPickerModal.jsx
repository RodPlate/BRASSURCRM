import { useEffect, useState } from 'react';
import { getLastSupplierId, setLastSupplierId } from '../../utils/mobilePrefs';
import Modal from '../common/Modal';
import QuickPhotoModal from '../photos/QuickPhotoModal';

export default function QuickPhotoPickerModal({ open, onClose, suppliers = [], defaultSupplierId = '' }) {
  const [supplierId, setSupplierId] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCaptureOpen(false);
      return;
    }
    const last = getLastSupplierId();
    const preferred = defaultSupplierId || last;
    const valid = suppliers.some((s) => s.id === preferred);
    setSupplierId(valid ? preferred : suppliers[0]?.id || '');
    setCaptureOpen(false);
  }, [open, suppliers, defaultSupplierId]);

  const supplier = suppliers.find((s) => s.id === supplierId);

  const startCapture = () => {
    if (!supplierId) return;
    setLastSupplierId(supplierId);
    setCaptureOpen(true);
  };

  if (!open) return null;

  if (captureOpen && supplier) {
    return (
      <QuickPhotoModal
        open
        supplier={supplier}
        onClose={(done) => {
          setCaptureOpen(false);
          if (done) onClose(true);
        }}
      />
    );
  }

  return (
    <Modal
      title="📷 Tomar foto"
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={startCapture} disabled={!supplierId}>
            Continuar
          </button>
        </>
      }
    >
      <div className="form-field">
        <label htmlFor="qp-supplier">Proveedor</label>
        <select
          id="qp-supplier"
          className="filter-select"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">Seleccionar…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
