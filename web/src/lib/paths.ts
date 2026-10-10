export const skillUrl = (userId: string, slug: string) =>
  `/skills/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}`
