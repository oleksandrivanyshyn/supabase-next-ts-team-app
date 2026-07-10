import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { callFunction } from '@/lib/api';
import type {
  ProductFilters,
  ProductListItem,
  ProductListResponse,
} from '@/types/types';

function buildQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export function useProducts(
  filters: ProductFilters,
  page: number,
  pageSize = 20,
) {
  const queryParams = { page, pageSize, ...filters };
  return useQuery({
    queryKey: ['products', queryParams],
    queryFn: () =>
      callFunction<ProductListResponse>(
        `products?${buildQueryString(queryParams)}`,
        {
          method: 'GET',
        },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      description?: string;
      imagePath?: string;
    }) =>
      callFunction<{ product: ProductListItem }>('products', {
        method: 'POST',
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      description?: string;
      imagePath?: string;
      status?: 'active' | 'deleted';
    }) =>
      callFunction<{ product: ProductListItem }>(`products/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      callFunction<{ success: boolean; product: ProductListItem }>(
        `products/${id}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
