export function parsePaginationParams(query = {}, defaultSort = 'createdAt', defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(100, Math.max(1, rawLimit)); // clamp 1 to 100

  const skip = (page - 1) * limit;
  const take = limit;

  const sort =
    typeof query.sort === 'string' && query.sort.trim() ? query.sort.trim() : defaultSort;
  const order = query.order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const search =
    typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

  return {
    page,
    limit,
    skip,
    take,
    sort,
    order,
    search,
    orderBy: { [sort]: order },
  };
}

export function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

export default {
  parsePaginationParams,
  buildPaginationMeta,
};
