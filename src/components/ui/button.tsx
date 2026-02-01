import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Primary variant
            "bg-[#F05705] text-white hover:bg-[#D04A04] focus:ring-[#F05705]":
              variant === "primary",
            // Secondary variant
            "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300":
              variant === "secondary",
            // Ghost variant
            "bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-300":
              variant === "ghost",
            // Sizes
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;

