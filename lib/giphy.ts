type GiphySearchResult = {
  id: string;
  title: string;
  previewUrl: string;
  width?: number;
  height?: number;
};

type GiphyImageVariant = {
  url?: string;
  width?: string;
  height?: string;
  size?: string;
};

type GiphyImageMap = {
  original?: GiphyImageVariant;
  downsized_large?: GiphyImageVariant;
  downsized?: GiphyImageVariant;
  fixed_height?: GiphyImageVariant;
  fixed_width?: GiphyImageVariant;
  fixed_width_small?: GiphyImageVariant;
};

type GiphyItem = {
  id: string;
  title: string;
  images?: GiphyImageMap;
};

type GiphySearchResponse = {
  data?: GiphyItem[];
};

type GiphyByIdResponse = {
  data?: GiphyItem;
};

type SearchCacheEntry = {
  expiresAt: number;
  results: GiphySearchResult[];
};

const DEFAULT_GIPHY_SEARCH_LIMIT = 12;
const DEFAULT_GIPHY_CACHE_TTL_MS = 3 * 60 * 1000;
const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";
const searchCache = new Map<string, SearchCacheEntry>();

function getGiphyApiKey(): string {
  const apiKey = process.env.GIPHY_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GIPHY_API_KEY is not configured.");
  }

  return apiKey;
}

function getGiphySearchLimit(): number {
  const raw = Number(process.env.GIPHY_SEARCH_LIMIT);

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_GIPHY_SEARCH_LIMIT;
  }

  return Math.min(25, Math.floor(raw));
}

function getGiphyCacheTtlMs(): number {
  const raw = Number(process.env.GIPHY_SEARCH_CACHE_TTL_MS);

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_GIPHY_CACHE_TTL_MS;
  }

  return Math.min(30 * 60 * 1000, Math.floor(raw));
}

function parseIntOrUndefined(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

async function fetchJsonWithTimeout<T>(url: URL, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`GIPHY API request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function buildSearchResult(item: GiphyItem): GiphySearchResult | null {
  const preview = item.images?.fixed_width_small ?? item.images?.fixed_height ?? item.images?.fixed_width ?? item.images?.downsized;

  if (!preview?.url) {
    return null;
  }

  return {
    id: item.id,
    title: item.title?.trim() || "GIF",
    previewUrl: preview.url,
    width: parseIntOrUndefined(preview.width),
    height: parseIntOrUndefined(preview.height)
  };
}

export async function searchGiphy(query: string): Promise<GiphySearchResult[]> {
  const normalized = normalizeSearchQuery(query);
  const now = Date.now();

  const existing = searchCache.get(normalized);
  if (existing && existing.expiresAt > now) {
    return existing.results;
  }

  const url = new URL(`${GIPHY_API_BASE}/search`);
  url.searchParams.set("api_key", getGiphyApiKey());
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", String(getGiphySearchLimit()));
  url.searchParams.set("offset", "0");
  url.searchParams.set("rating", "pg");
  url.searchParams.set("lang", "en");

  const payload = await fetchJsonWithTimeout<GiphySearchResponse>(url, 7_000);
  const results = (payload.data ?? []).map(buildSearchResult).filter((item): item is GiphySearchResult => item !== null);

  searchCache.set(normalized, {
    results,
    expiresAt: now + getGiphyCacheTtlMs()
  });

  if (searchCache.size > 400) {
    for (const [key, entry] of searchCache.entries()) {
      if (entry.expiresAt <= now) {
        searchCache.delete(key);
      }
    }
  }

  return results;
}

function parseSize(value?: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function isAllowedGiphyAssetHost(url: URL): boolean {
  return url.protocol === "https:" && (url.hostname === "giphy.com" || url.hostname.endsWith(".giphy.com"));
}

export async function downloadGiphyById(giphyId: string, maxBytes: number): Promise<{ bytes: Buffer; suggestedName: string }> {
  const detailUrl = new URL(`${GIPHY_API_BASE}/${encodeURIComponent(giphyId)}`);
  detailUrl.searchParams.set("api_key", getGiphyApiKey());

  const payload = await fetchJsonWithTimeout<GiphyByIdResponse>(detailUrl, 7_000);
  const images = payload.data?.images;

  if (!images) {
    throw new Error("GIF not found on GIPHY.");
  }

  const candidates = [images.fixed_height, images.fixed_width, images.downsized, images.downsized_large, images.original]
    .filter((candidate): candidate is GiphyImageVariant => Boolean(candidate?.url))
    .map((candidate) => ({
      url: candidate.url as string,
      size: parseSize(candidate.size)
    }));

  if (candidates.length === 0) {
    throw new Error("GIF asset is unavailable.");
  }

  const preferred = candidates.find((candidate) => candidate.size !== undefined && candidate.size <= maxBytes) ?? candidates[0];
  const downloadUrl = new URL(preferred.url);

  if (!isAllowedGiphyAssetHost(downloadUrl)) {
    throw new Error("Unexpected GIPHY asset host.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(downloadUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "image/gif,image/webp,image/*"
      }
    });

    if (!response.ok) {
      throw new Error("Unable to download GIF from GIPHY.");
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`GIF is too large. Maximum allowed size is ${maxBytes} bytes.`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) {
      throw new Error(`GIF is too large. Maximum allowed size is ${maxBytes} bytes.`);
    }

    return {
      bytes,
      suggestedName: `giphy-${giphyId}.gif`
    };
  } finally {
    clearTimeout(timeout);
  }
}
