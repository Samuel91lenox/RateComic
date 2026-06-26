import { environment } from '../../../environments/environment';

export const DEFAULT_LOGO_CANDIDATES = [
  'assets/images/logo.png',
  'assets/images/logo_ratecomic.png',
] as readonly string[];

export const RATECOMIC_LOGO_CANDIDATES =
  Array.isArray(environment.logoCandidates) && environment.logoCandidates.length > 0
    ? environment.logoCandidates
    : DEFAULT_LOGO_CANDIDATES;

export function getNextFallbackImage(
  currentSrc: string,
  candidates: readonly string[] = RATECOMIC_LOGO_CANDIDATES,
): string | null {
  const currentIndex = candidates.indexOf(currentSrc);
  const nextIndex = currentIndex + 1;
  return nextIndex >= 0 && nextIndex < candidates.length ? candidates[nextIndex] : null;
}
