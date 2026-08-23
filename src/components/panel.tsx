import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  glow,
  glass,
  dataChart,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  glass?: boolean;
  dataChart?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      data-chart={dataChart}
      className={cn(
        "rounded-xl p-5 md:p-6 overflow-hidden",
        glass ? "panel-glass" : "panel",
        glow && "panel-glow",
        className,
      )}
    >
      {(title || action) && (
        <div className="panel-header mb-6">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            {title && (
              <div className="panel-nameplate shrink-0">
                <span className="panel-nameplate-text">{title}</span>
              </div>
            )}
            {subtitle && (
              <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground/80 min-w-0 uppercase">
                {subtitle}
              </span>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}
