import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ActionCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export default function ActionCard({
  icon,
  label,
  onClick,
  className,
  ...props
}: ActionCardProps) {
  return (
    <div
      className={cn(
        "bg-[#F8F8FC] rounded-[16px] aspect-square flex flex-col items-center justify-center p-[10px] cursor-pointer hover:shadow-md transition-all active:scale-[0.98]",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="mb-3">{icon}</div>
      <p className="text-[16px] font-medium text-[#353644] text-center leading-[1.5]">
        {label}
      </p>
    </div>
  );
}

