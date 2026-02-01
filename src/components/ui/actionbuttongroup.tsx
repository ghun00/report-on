import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Settings, Edit, Share2 } from "lucide-react";

export interface ActionButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: "secondary" | "secondary-orange" | "primary";
  icon?: ReactNode;
  label: string;
}

export function ActionButton({
  variant = "secondary",
  icon,
  label,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-[10px] px-4 py-3 rounded-[8px] font-medium text-base leading-[1.5] transition-colors",
        {
          "bg-[#F3F4FA] text-[#353644] hover:bg-[#E8E9F0]": variant === "secondary",
          "bg-[#FFF5F0] text-[#F05705] hover:bg-[#FFE5D6]": variant === "secondary-orange",
          "bg-[#F05705] text-[#F8F8FC] hover:bg-[#D04A04]": variant === "primary",
        },
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export interface ActionButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  onTemplateChange?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
}

export default function ActionButtonGroup({
  onTemplateChange,
  onEdit,
  onShare,
  className,
  ...props
}: ActionButtonGroupProps) {
  return (
    <div
      className={cn("flex flex-col gap-[12px] w-[240px]", className)}
      {...props}
    >
      <ActionButton
        variant="secondary"
        icon={<Settings className="w-4 h-4" />}
        label="템플릿 변경"
        onClick={onTemplateChange}
      />
      <ActionButton
        variant="secondary-orange"
        icon={<Edit className="w-4 h-4" />}
        label="보고서 수정"
        onClick={onEdit}
      />
      <ActionButton
        variant="primary"
        icon={<Share2 className="w-4 h-4" />}
        label="보고서 공유"
        onClick={onShare}
      />
    </div>
  );
}

