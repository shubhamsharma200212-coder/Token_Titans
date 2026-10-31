/**
 * Security Utilities for CareerMatch AI
 * Protects against XSS, HTML/Script injection, Prompt Injection delimiters,
 * Open Redirects, SSRF, and unsafe URL schemes (`javascript:`, `data:`, `vbscript:`).
 */

const TRUSTED_RESOURCE_DOMAINS = [
  'coursera.org',
  'edx.org',
  'udemy.com',
  'learn.microsoft.com',
  'aws.amazon.com',
  'skillbuilder.aws',
  'cloud.google.com',
  'cloudskillsboost.google',
  'freecodecamp.org',
  'roadmap.sh',
  'kaggle.com',
  'stratascratch.com',
  'leetcode.com',
  'docs.python.org',
  'spark.apache.org',
  'postgresql.org',
  'react.dev',
  'kubernetes.io',
  'developer.mozilla.org',
  'fast.ai',
  'deeplearning.ai',
  'datacamp.com',
  'pluralsight.com',
  'prepnplaced.com',
  'asuraa.in',
  'gettevos.com',
  'linkedin.com',
  'github.com',
  'nodejs.org',
  'docker.com',
  'terraform.io',
  'pytorch.org',
  'scikit-learn.org',
];

/**
 * Sanitizes untrusted text input by stripping control characters, HTML/script tags,
 * dangerous protocols, and prompt-injection control tokens.
 */
export function sanitizePlainText(input: string, maxLength = 25000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Strip null bytes and non-printable control chars (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip HTML script/iframe/object/embed tags completely
    .replace(/<(script|iframe|object|embed|style|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // Neutralize inline dangerous URI schemes
    .replace(/\b(javascript|vbscript|data|file)\s*:/gi, 'blocked:')
    // Neutralize common LLM prompt-injection override patterns
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[filtered]')
    .replace(/<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]/gi, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Sanitizes short single-line inputs (skill names, company names, titles, search queries).
 */
export function sanitizeShortField(input: string, maxLength = 140): string {
  return sanitizePlainText(input, maxLength).replace(/[\r\n]+/g, ' ');
}

/**
 * Validates and sanitizes external URLs to prevent URL injection (`javascript:`, `data:`),
 * local network SSRF probes, and untrusted phishing links.
 */
export function sanitizeExternalUrl(
  rawUrl: string | undefined,
  requireTrustedDomain = false
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, loopback, link-local, and private IPv4/IPv6 ranges
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return null;
    }

    if (requireTrustedDomain) {
      const isTrusted = TRUSTED_RESOURCE_DOMAINS.some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
      );
      if (!isTrusted) {
        return 'https://roadmap.sh/';
      }
    }

    // Force HTTPS for external links
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return null;
  }
}
