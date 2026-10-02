import type { ImageProvider } from "./types";
import { MockImageProvider } from "./mockImageProvider";
import { RemoteImageProvider } from "./remoteImageProvider";

/**
 * Selects the image provider. Mock by default (works with no key). Opt into a
 * real provider with NEXT_PUBLIC_IMAGE_PROVIDER=remote, which routes through the
 * server-side /api/generate-image endpoint.
 */
let provider: ImageProvider | null = null;

export function getImageProvider(): ImageProvider {
  if (provider) return provider;
  const mode =
    process.env.NEXT_PUBLIC_IMAGE_PROVIDER?.toLowerCase() ?? "mock";
  provider = mode === "remote" ? new RemoteImageProvider() : new MockImageProvider();
  return provider;
}

/** Override the image provider (handy for tests). */
export function setImageProvider(p: ImageProvider): void {
  provider = p;
}

export function getImageProviderId(): string {
  return getImageProvider().id;
}
