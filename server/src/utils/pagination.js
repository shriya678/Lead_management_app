const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(query = {}) {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT
  );

  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { parsePagination, MAX_LIMIT, DEFAULT_LIMIT };
