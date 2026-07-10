'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/products/StatusBadge';
import { useUpdateProduct } from '@/hooks/useProducts';
import type { ProductListItem } from '@/types/types';
import { toast } from 'sonner';

type ProductTableProps = {
  products: ProductListItem[];
  isLoading: boolean;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
};

export function ProductTable({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const updateProduct = useUpdateProduct();

  const activate = async (product: ProductListItem) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, status: 'active' });
      toast.success('Product activated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Image</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={7}>
                <Skeleton className="h-8 w-full" />
              </TableCell>
            </TableRow>
          ))}

        {!isLoading && products.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center text-muted-foreground py-8"
            >
              No products found.
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    width={40}
                    height={40}
                    className="size-10 rounded-sm object-cover border"
                  />
                ) : (
                  <div className="size-10 rounded-sm border bg-muted" />
                )}
              </TableCell>
              <TableCell className="font-medium">{product.title}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">
                {product.description}
              </TableCell>
              <TableCell>
                <StatusBadge status={product.status} />
              </TableCell>
              <TableCell>{product.createdBy.displayName}</TableCell>
              <TableCell>
                {format(new Date(product.createdAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" />}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {product.status === 'draft' && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => activate(product)}>
                          Mark Active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(product)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {product.status === 'active' && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(product)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {product.status === 'deleted' && (
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        View
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
