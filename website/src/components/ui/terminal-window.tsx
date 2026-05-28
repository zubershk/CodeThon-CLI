"use client";

import { forwardRef, useEffect, useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TerminalWindowProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  typing?: boolean;
}

const TerminalWindow = forwardRef<HTMLDivElement, TerminalWindowProps>(
  ({ className, title = "terminal", children, typing = false, ...props }, ref) => {
    const [displayedContent, setDisplayedContent] = useState("");
    const [isTypingDone, setIsTypingDone] = useState(!typing);

    const content = typeof children === "string" ? children : "";

    useEffect(() => {
      if (!typing || !content) {
        setIsTypingDone(true);
        return;
      }

      setIsTypingDone(false);
      setDisplayedContent("");

      let index = 0;
      const interval = setInterval(() => {
        if (index < content.length) {
          setDisplayedContent(content.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTypingDone(true);
        }
      }, 20);

      return () => clearInterval(interval);
    }, [content, typing]);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d0d14] shadow-2xl",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d14] border-b border-white/[0.06] select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-muted absolute left-1/2 -translate-x-1/2">
            {title}
          </span>
          <div className="w-14" />
        </div>
        <div className="p-4 font-mono text-sm leading-relaxed text-gray-300">
          {typing && content ? (
            <span>
              {displayedContent}
              {!isTypingDone && (
                <span className="terminal-cursor ml-0.5" />
              )}
            </span>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }
);
TerminalWindow.displayName = "TerminalWindow";

export { TerminalWindow };
