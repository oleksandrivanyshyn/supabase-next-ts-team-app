'use client';

import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteProduct } from '@/hooks/useProducts';
import type { ProductListItem } from '@/types/types';

type DeleteProductDialogProps = {
  product: ProductListItem | null;
  onOpenChange: (open: boolean) => void;
};

export function DeleteProductDialog({
  product,
  onOpenChange,
}: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  const confirmDelete = async () => {
    if (!product) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success('Product deleted');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  };

  return (
    <AlertDialog open={!!product} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &quot;{product?.title}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This marks the product as deleted. It will be permanently removed
            after 2 weeks.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            disabled={deleteProduct.isPending}
          >
            {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
