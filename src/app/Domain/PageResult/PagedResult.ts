export type PagedResult<T> = {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  data: T[];
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
