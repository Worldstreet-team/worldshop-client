import type { ReactNode } from "react";
import Reveal from "@/shared/components/Reveal";
import SectionHead, { type SectionHeadProps } from "@/shared/components/SectionHead";

type SectionProps = SectionHeadProps & { children: ReactNode };

export default function Section({ id, children, ...head }: SectionProps) {
  return (
    <Reveal as="section" aria-labelledby={id}>
      <SectionHead id={id} {...head} />
      {children}
    </Reveal>
  );
}
