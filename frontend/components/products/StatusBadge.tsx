import { Badge } from '@/components/ui/badge';
import type { ProductStatus } from '@/types/types';

export function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === 'draft') return <Badge variant="outline">Draft</Badge>;
  if (status === 'active') {
    return (
      <Badge className="bg-green-600/15 text-green-700 dark:text-green-400">
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="line-through">
      Deleted
    </Badge>
  );
}
