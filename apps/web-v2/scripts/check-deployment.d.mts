export function checkDeployment(
  origin: string,
  dependencies?: { fetcher?: typeof fetch; log?: (message: string) => void },
): Promise<void>;
