import SHA256 from "crypto-js/sha256";

export function generateFingerprint() {
  const data = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  return SHA256(data).toString();
}