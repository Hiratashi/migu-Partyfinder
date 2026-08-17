"use client";

export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy=false,
  danger=true,
  onCancel,
  onConfirm,
}:{
  open:boolean;
  title:string;
  message:string;
  confirmLabel:string;
  busy?:boolean;
  danger?:boolean;
  onCancel:()=>void;
  onConfirm:()=>void;
}) {
  if(!open)return null;

  return <div
    className="admin-confirm-backdrop"
    role="presentation"
    onMouseDown={e=>{
      if(e.target===e.currentTarget&&!busy)onCancel();
    }}
  >
    <div
      className="admin-confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
    >
      <h3 id="admin-confirm-title">{title}</h3>
      <p>{message}</p>

      <div className="admin-confirm-actions">
        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger?"danger":"primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy?"Working…":confirmLabel}
        </button>
      </div>
    </div>
  </div>;
}
