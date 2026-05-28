import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-backdrop disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] text-white hover:bg-white/[0.06] hover:border-white/[0.1] hover:scale-[1.02] active:scale-[0.98]",
        ghost:
          "text-white/70 hover:text-white hover:bg-white/[0.04] hover:scale-[1.02] active:scale-[0.98]",
        icon: "h-10 w-10 rounded-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
