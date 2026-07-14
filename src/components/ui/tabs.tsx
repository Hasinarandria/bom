import { cn } from '../../lib/utils';

interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}

function Tabs({ items, value, onValueChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-border mb-4 overflow-x-auto scrollbar-thin', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onValueChange(item.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            value === item.value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export { Tabs };
export type { TabItem };
