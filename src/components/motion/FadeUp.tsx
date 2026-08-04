"use client";

import { motion, useReducedMotion } from "motion/react";
import { forwardRef, type ReactNode, type UIEventHandler } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const makeItemVariants = (reduced: boolean) => ({
  hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
});

/** T2 — stagger fade-up list container. Pair with FadeUpItem. */
export const FadeUpList = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    tag?: "div" | "ul" | "ol";
    onScroll?: UIEventHandler<HTMLDivElement>;
  }
>(function FadeUpList({ children, className, tag = "div", onScroll }, ref) {
  const Tag = tag === "ul" ? motion.ul : tag === "ol" ? motion.ol : motion.div;
  const ElementTag = Tag as typeof motion.div;
  return (
    <ElementTag
      ref={ref}
      className={className}
      onScroll={onScroll}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      variants={containerVariants}
    >
      {children}
    </ElementTag>
  );
});

/** T2 — single item within a FadeUpList. */
export function FadeUpItem({
  children,
  className,
  tag = "div",
}: {
  children: ReactNode;
  className?: string;
  tag?: "div" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const Tag =
    tag === "li" ? motion.li : tag === "article" ? motion.article : motion.div;
  return (
    <Tag className={className} variants={makeItemVariants(!!reduced)}>
      {children}
    </Tag>
  );
}
