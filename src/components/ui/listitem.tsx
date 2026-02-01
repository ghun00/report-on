import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ListItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  date?: string;
  time?: string;
}

export default function ListItem({
  icon,
  title,
  date,
  time,
  className,
  ...props
}: ListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F05705]/10 flex items-center justify-center text-[#F05705]">
          {icon}
        </div>
      )}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 truncate" style={{ width: "160px" }}>
          {title}
        </h3>
        {date && (
          <p className="text-sm text-gray-500 mt-0.5 flex-shrink-0">{date}</p>
        )}
      </div>
      {time && (
        <div className="flex-shrink-0">
          <span className="text-sm font-medium text-[#F05705]">{time}</span>
        </div>
      )}
    </div>
  );
}

