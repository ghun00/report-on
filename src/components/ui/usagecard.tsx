import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface UsageCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  current: string | number;
  total?: string | number;
  unit?: string;
  icon?: ReactNode;
  showTotal?: boolean;
}

export default function UsageCard({
  title,
  current,
  total,
  unit = "분",
  icon,
  showTotal = true,
  className,
  ...props
}: UsageCardProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-[#F05705] to-[#D04A04] rounded-2xl p-5 text-white shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 mb-3">
        {icon && <div className="text-white/80">{icon}</div>}
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{current}</span>
        {showTotal && total && (
          <span className="text-base opacity-80">/ {total}</span>
        )}
        <span className="text-sm opacity-70">{unit}</span>
      </div>
    </div>
  );
}

