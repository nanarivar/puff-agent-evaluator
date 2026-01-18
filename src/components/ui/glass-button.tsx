import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-full transition-all duration-300 group",
  {
    variants: {
      size: {
        default: "text-base font-medium",
        sm: "text-sm font-medium",
        lg: "text-lg font-medium",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const glassButtonTextVariants = cva(
  "relative block select-none tracking-tight transition-all duration-300",
  {
    variants: {
      size: {
        default: "px-6 py-3.5",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "flex h-10 w-10 items-center justify-center",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(glassButtonVariants({ size }), className)}
        {...props}
      >
        {/* Glow effect */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Glass background - more transparent */}
        <span className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-xl border border-white/15 group-hover:bg-white/10 group-hover:border-white/25 transition-all duration-300" />
        
        {/* Shine effect */}
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </span>
        
        {/* Content */}
        <span
          className={cn(
            glassButtonTextVariants({ size }),
            "relative z-10 text-white",
            contentClassName
          )}
        >
          {children}
        </span>
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
