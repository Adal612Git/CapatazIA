import type { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}

export function SectionCard({
  eyebrow,
  title,
  aside,
  children,
}: SectionCardProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {aside ? <div className="panel__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
