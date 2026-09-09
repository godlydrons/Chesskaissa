import React from 'react';
import { cn } from '../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * CAISSA-CORE: THE CORE MATERIAL
 * A micro-etched, heavy-blur glass panel.
 * Optimized for web but following the "Dark Luxury" React Native spec.
 */
const GlassCard = ({ children, className, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "bg-[rgba(255,255,255,0.03)]",
        "backdrop-blur-[24px]",
        "border border-[rgba(255,255,255,0.1)]",
        "rounded-[8px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { GlassCard };
export default GlassCard;
