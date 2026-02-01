import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label: string;
}

export default function StatCard({
  value,
  label,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-[#FFF5F0] rounded-[16px] aspect-square flex flex-col items-center justify-center p-[10px]",
        className
      )}
      {...props}
    >
      <p className="text-[32px] font-bold text-[#F05705] text-center leading-[1.5] mb-3">
        {value}
      </p>
      <p className="text-[16px] font-medium text-[#353644] text-center leading-[1.5]">
        {label}
      </p>
    </div>
  );
}

