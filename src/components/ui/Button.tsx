import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-sky-500 text-white hover:bg-sky-400 active:bg-sky-600 shadow-lg shadow-sky-500/20',
  secondary:
    'glass text-slate-200 hover:bg-white/5 border border-white/10',
  ghost: 'text-slate-300 hover:bg-white/5',
  danger:
    'bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600 shadow-lg shadow-red-500/20',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 shadow-lg shadow-emerald-500/20',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3 gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
