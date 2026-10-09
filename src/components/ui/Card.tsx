import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  delay?: number;
}

export default function Card({
  children,
  hover = false,
  delay = 0,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`card-surface rounded-2xl transition-all duration-300 animate-fadeInUp ${
        hover ? 'hover:translate-y-[-2px] hover:shadow-xl hover:shadow-black/20' : ''
      } ${className}`}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  );
}
