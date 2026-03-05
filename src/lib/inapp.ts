"use client";

const KAKAO_UA_PATTERNS = [
  "KAKAO",
  "KAKAOTALK",
  "KAKAOINAPP",
  "INAPP",
  "DaumApps",
];

/**
 * 카카오 인앱브라우저 여부
 */
export function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined" || !navigator.userAgent) return false;
  const ua = navigator.userAgent;
  return KAKAO_UA_PATTERNS.some((p) => ua.includes(p));
}

/**
 * iOS 여부
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined" || !navigator.userAgent) return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Android 여부
 */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined" || !navigator.userAgent) return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * 외부 브라우저로 열기 링크 (Android intent 등)
 */
export function getExternalBrowserUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}
