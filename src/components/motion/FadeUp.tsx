"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { EASE } from "@/lib/motion/tokens";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const makeItemVariants = (reduced: boolean) => ({
  hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
});

/** T2 — stagger fade-up list container. Pair with FadeUpItem. */
export function FadeUpList({
  children,
  className,
  tag = "div",
}: {
  children: ReactNode;
  className?: string;
  tag?: "div" | "ul" | "ol";
}) {
  const Tag = tag === "ul" ? motion.ul : tag === "ol" ? motion.ol : motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      variants={containerVariants}
    >
      {children}
    </Tag>
  );
}

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
