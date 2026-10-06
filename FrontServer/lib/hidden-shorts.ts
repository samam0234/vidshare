/**
 * 비로그인 시청자의 "비추천". 계정이 없으니 이 브라우저에만 저장하고, 피드를 그릴 때 거른다.
 * (로그인한 유저는 서버의 `short_dislikes` 에 저장되어 기기를 바꿔도 이어진다.)
 */

const STORAGE_KEY = "vidshare:hidden-shorts";

/** 저장 상한 — 오래된 것부터 잊는다. localStorage 가 끝없이 자라지 않게 한다. */
export const HIDDEN_MAX = 300;

/** 저장된 문자열을 id 배열로. 깨진 값·문자열이 아닌 항목은 버린다. */
export function parseHiddenIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    for (const item of value) {
      if (typeof item === "string" && item) seen.add(item);
    }
    return [...seen].slice(-HIDDEN_MAX);
  } catch {
    return [];
  }
}

/** id 를 맨 뒤(가장 최근)로 넣는다. 이미 있으면 위치만 옮기고, 상한을 넘으면 앞에서 자른다. */
export function withHiddenId(list: string[], id: string, max = HIDDEN_MAX): string[] {
  const next = list.filter((x) => x !== id);
  next.push(id);
  return next.length > max ? next.slice(next.length - max) : next;
}

export function withoutHiddenId(list: string[], id: string): string[] {
  return list.filter((x) => x !== id);
}

export function readHiddenIds(): string[] {
  try {
    return parseHiddenIds(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeHiddenIds(list: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* 저장이 막힌 환경(사생활 보호 모드 등)에서는 이번 방문 동안만 유지된다 */
  }
}
