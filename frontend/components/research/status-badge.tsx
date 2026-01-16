import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/utils';
import type { ResearchStatus } from '@/types';

interface StatusBadgeProps {
  status: ResearchStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  
  return (
    <Badge 
      variant="outline" 
      className={`${colors} ${className || ''}`}
    >
      {status}
    </Badge>
  );
}

