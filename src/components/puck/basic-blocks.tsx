"use client";

import { DropZone } from "@measured/puck";
import { Button as UIButton } from "@/components/ui/button";
import Link from "next/link";

export const HeadingBlock = ({ text, size, align }: { text: string, size: "sm" | "md" | "lg" | "xl", align: "left" | "center" | "right" }) => {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl md:text-6xl",
    xl: "text-7xl"
  };
  return (
    <h2 className={`${sizeClasses[size]} font-bold tracking-tight text-${align} mb-6`}>
      {text}
    </h2>
  );
};

export const TextBlock = ({ text, align, size }: { text: string, align: "left" | "center" | "right", size: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };
  return (
    <div className={`${sizeClasses[size]} text-${align} text-text-muted mb-6 whitespace-pre-wrap`}>
      {text}
    </div>
  );
};

export const ButtonBlock = ({ text, url, variant }: { text: string, url: string, variant: "primary" | "secondary" | "outline" }) => {
  const buttonClass = variant === "primary" ? "bg-accent hover:bg-accent-hover text-bg" 
    : variant === "secondary" ? "bg-surface-strong hover:bg-surface-muted text-text" 
    : "border border-border hover:bg-surface text-text";
    
  return (
    <div className="mb-6 flex">
      <UIButton asChild className={`px-8 py-6 rounded-xl font-bold transition-all ${buttonClass}`}>
        <Link href={url}>{text}</Link>
      </UIButton>
    </div>
  );
};

export const SectionBlock = ({ padding, bg }: { padding: "10" | "20" | "28", bg: "transparent" | "bg" | "bg-subtle" | "surface" }) => {
  return (
    <section className={`py-${padding} bg-${bg}`}>
      <div className="container">
        <DropZone zone="content" />
      </div>
    </section>
  );
};

export const ColumnsBlock = ({ cols }: { cols: 2 | 3 | 4 }) => {
  const gridClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
  };
  
  return (
    <div className={`grid ${gridClasses[cols]} gap-6`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <DropZone zone={`column-${i}`} />
        </div>
      ))}
    </div>
  );
};
