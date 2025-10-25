import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-xs font-medium text-sky-300',
        className,
      )}
      {...props}
    />
  );
}
