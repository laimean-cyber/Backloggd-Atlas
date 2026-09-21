export function parseCommunityRating(html) {
  const block = html.match(/<div\b[^>]*\bid=["']game-rating["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  const value = Number(block?.match(/<h1\b[^>]*>\s*([\d.]+)\s*<\/h1>/i)?.[1]);
  return Number.isFinite(value) && value > 0 && value <= 5 ? value : null;
}
