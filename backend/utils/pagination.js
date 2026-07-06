/**
 * Pagination utility for consistent API responses.
 * 
 * Usage:
 *   const { skip, limit, page } = parsePagination(req.query);
 *   const [items, total] = await Promise.all([
 *     Model.find(filter).skip(skip).limit(limit).lean(),
 *     Model.countDocuments(filter),
 *   ]);
 *   res.json(paginatedResponse(items, total, page, limit));
 */

/**
 * Parse page/limit from query params with safe defaults.
 */
export function parsePagination(query, defaults = {}) {
  const page  = Math.max(1, parseInt(query.page)  || defaults.page  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a consistent paginated response object.
 */
export function paginatedResponse(items, totalRecords, page, limit, extraFields = {}) {
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    success: true,
    data: items,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    ...extraFields,
  };
}
