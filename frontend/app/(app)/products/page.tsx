'use client';

import { useState } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductFormSheet } from '@/components/products/ProductFormSheet';
import { DeleteProductDialog } from '@/components/products/DeleteProductDialog';
import { useProducts } from '@/hooks/useProducts';
import { useTeam } from '@/hooks/useTeam';
import type {
  ProductFilters as ProductFiltersType,
  ProductListItem,
} from '@/types/types';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { data: team } = useTeam();
  const [filters, setFilters] = useState<ProductFiltersType>({});
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(
    null,
  );

  const { data, isLoading } = useProducts(filters, page, PAGE_SIZE);
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  const handleFiltersChange = (next: ProductFiltersType) => {
    setFilters(next);
    setPage(1);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setSheetOpen(true);
  };

  const openEdit = (product: ProductListItem) => {
    setEditingProduct(product);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button onClick={openCreate}>New product</Button>
      </div>

      <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} />

      <ProductTable
        products={data?.data ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {team && (
        <ProductFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          product={editingProduct}
          teamId={team.id}
        />
      )}

      <DeleteProductDialog
        product={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
