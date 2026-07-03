export type Team = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
};

export type ProductStatus = "draft" | "active" | "deleted";

export type ProductListItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  status: ProductStatus;
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  data: ProductListItem[];
  count: number;
  page: number;
  pageSize: number;
};
