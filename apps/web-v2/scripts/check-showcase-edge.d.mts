export function checkShowcaseEdge(
  options: {
    webOrigin: string;
    apiOrigin: string;
    slug: string;
    revision: string;
    phase?: "active" | "revoked";
    assets?: string[];
  },
  dependencies?: { fetcher?: typeof fetch; log?: (message: string) => void },
): Promise<void>;
