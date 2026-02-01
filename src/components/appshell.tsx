import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: ReactNode;
  showBottomNav?: boolean;
  header?: ReactNode;
  className?: string;
}

export default function AppShell({
  children,
  showBottomNav = true,
  header,
  className,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      {/* PC에서 중앙 정렬을 위한 컨테이너 */}
      <div className="max-w-[480px] w-full mx-auto bg-[#F6F7F9] flex flex-col min-h-screen relative">
        {/* Header Slot */}
        {header && (
          <div className="sticky top-0 z-40 bg-transparent">
            {header}
          </div>
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

