export type Team = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  createdBy: string;
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

export type TeamMember = {
  id: string;
  displayName: string;
};

export type ProductFilters = {
  status?: ProductStatus;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  search?: string;
};

export type PresenceMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  onlineAt: string;
};
