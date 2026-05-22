import Modal from './Modal';

export default function ConfirmDialog({
  title = 'Confirmar',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
  loading = false,
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}
