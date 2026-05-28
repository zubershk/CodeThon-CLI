import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
        "hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-white",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

const CardGlow = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
        "hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500",
        "hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]",
        className
      )}
      {...props}
    />
  )
);
CardGlow.displayName = "CardGlow";

const CardGradientBorder = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-xl bg-white/[0.03] backdrop-blur-xl overflow-hidden",
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 rounded-xl p-[1px] pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,182,212,0.4), rgba(168,85,247,0.4), rgba(6,182,212,0.4))",
          backgroundSize: "200% 200%",
          animation: "gradientShift 8s ease infinite",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-10">{props.children}</div>
    </div>
  )
);
CardGradientBorder.displayName = "CardGradientBorder";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardGlow,
  CardGradientBorder,
};
