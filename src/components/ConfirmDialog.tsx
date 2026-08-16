"use client";
import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger=false,
  busy=false,
  onConfirm,
  onCancel,
}:{
  open:boolean;
  title:string;
  message:string;
  confirmLabel:string;
  danger?:boolean;
  busy?:boolean;
  onConfirm:()=>void;
  onCancel:()=>void;
}){
  const dialogRef=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(open&&!dialog.open)dialog.showModal();
    if(!open&&dialog.open)dialog.close();
  },[open]);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    const handleCancel=(e:Event)=>{e.preventDefault();if(!busy)onCancel();};
    dialog.addEventListener("cancel",handleCancel);
    return()=>dialog.removeEventListener("cancel",handleCancel);
  },[busy,onCancel]);

  return <dialog ref={dialogRef} className="confirm-dialog" onClick={e=>{
    if(e.target===dialogRef.current&&!busy)onCancel();
  }}>
    <div className="confirm-dialog-card">
      <h3>{title}</h3>
      <p className="muted">{message}</p>
      <div className="confirm-dialog-actions">
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>Keep party</button>
        <button type="button" className={`btn ${danger?'danger':'primary'}`} disabled={busy} onClick={onConfirm}>{busy?"Working…":confirmLabel}</button>
      </div>
    </div>
  </dialog>;
}
