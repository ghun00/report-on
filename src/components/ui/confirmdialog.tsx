"use client";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: "default" | "danger";
}

/**
 * 토스 스타일 Confirm Dialog
 * - 두 개의 버튼 (취소/확인)
 * - confirmType: default(주황), danger(레드)
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  confirmType = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmButtonClass =
    confirmType === "danger"
      ? "bg-[#EF4444] hover:bg-[#DC2626]"
      : "bg-[#F05705] hover:bg-[#D04A04]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed overlay */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
      />
      {/* Modal */}
      <div
        className="relative w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
      >
        <p
          id="confirm-title"
          className="text-left text-[20px] font-bold leading-[1.4] text-[#191F28]"
        >
          {title}
        </p>
        {description && (
          <p
            id="confirm-desc"
            className="mt-2 text-left text-[15px] leading-[1.5] text-[#6B7684]"
          >
            {description}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#E5E5E5] bg-white py-3.5 text-[15px] font-semibold text-[#191F28] transition-colors hover:bg-gray-50 active:opacity-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 rounded-xl ${confirmButtonClass} py-3.5 text-[15px] font-semibold text-white transition-colors active:opacity-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
