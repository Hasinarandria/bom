import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
} as const;

function Progress({
  value,
  max = 100,
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: number; max?: number; variant?: keyof typeof variantClasses }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', variantClasses[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
