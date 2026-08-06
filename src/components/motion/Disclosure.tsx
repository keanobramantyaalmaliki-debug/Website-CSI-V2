"use client";

import { useState, useId, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion/tokens";

interface DisclosureProps {
  /** Static ReactNode or render prop receiving current open state. */
  trigger: ReactNode | ((open: boolean) => ReactNode);
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
}

/**
 * Accessible expand/collapse primitive.
 * Click + keyboard navigable; aria-expanded on button; aria-controls on content region.
 * Respects useReducedMotion — animates height 0→auto when motion allowed, instant otherwise.
 */
export default function Disclosure({
  trigger,
  children,
  className,
  triggerClassName,
  contentClassName,
  defaultOpen = false,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const reduced = useReducedMotion();

  const triggerContent =
    typeof trigger === "function" ? trigger(open) : trigger;

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {triggerContent}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: reduced ? "auto" : 0, opacity: reduced ? 1 : 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: reduced ? 0 : 0.2 } }}
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className={contentClassName}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
