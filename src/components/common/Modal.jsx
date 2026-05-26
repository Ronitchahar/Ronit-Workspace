import { useState, useEffect } from "react";

function Modal({ isOpen, title, children, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="modal-button modal-button-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`modal-button modal-button-confirm ${isDangerous ? "dangerous" : ""}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
