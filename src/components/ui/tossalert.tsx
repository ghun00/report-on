"use client";

type TossAlertType = "default" | "positive" | "warning";

interface TossStyleAlertProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  // 단일 버튼 모드
  buttonText?: string;
  type?: TossAlertType;
  // 2개 버튼 모드 (onConfirm이 있으면 2개 버튼 모드)
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmType?: "default" | "danger";
}

/**
 * 토스 팝업 스타일 알럿
 * - 둥근 모달, 단일 확인 버튼 또는 2개 버튼 (취소/확인)
 * - dimmed overlay, 흰 배경, 볼드 타이틀
 * - type: default(주황), positive(파랑), warning(레드)
 * - onConfirm이 있으면 2개 버튼 모드, 없으면 1개 버튼 모드
 */
export default function TossStyleAlert({
  open,
  onClose,
  title,
  description,
  buttonText = "확인",
  type = "default",
  onConfirm,
  confirmText = "확인",
  cancelText = "취소",
  confirmType = "default",
}: TossStyleAlertProps) {
  if (!open) return null;

  const isTwoButtonMode = !!onConfirm;

  const buttonColorClass = {
    default: "bg-[#F05705] hover:bg-[#D04A04]",
    positive: "bg-[#3182F6] hover:bg-[#2563EB]",
    warning: "bg-[#EF4444] hover:bg-[#DC2626]",
  }[type];

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
        aria-labelledby="toss-alert-title"
        aria-describedby={description ? "toss-alert-desc" : undefined}
      >
        <p
          id="toss-alert-title"
          className="text-left text-[20px] font-bold leading-[1.4] text-[#191F28]"
        >
          {title}
        </p>
        {description && (
          <p
            id="toss-alert-desc"
            className="mt-2 text-left text-[15px] leading-[1.5] text-[#6B7684]"
          >
            {description}
          </p>
        )}
        {isTwoButtonMode ? (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#F3F4FA] hover:bg-[#E5E7EB] py-3.5 text-[15px] font-semibold text-[#191F28] transition-colors active:opacity-95"
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
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={`mt-6 w-full rounded-xl ${buttonColorClass} py-3.5 text-[15px] font-semibold text-white transition-colors active:opacity-95`}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
