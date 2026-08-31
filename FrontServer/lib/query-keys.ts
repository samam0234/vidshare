/** React Query 키를 한곳에 모아 오타·중복 정의를 막는다. */
export const queryKeys = {
  longform: ["longform"] as const,
  community: ["community"] as const,
  followingFeed: ["following-feed"] as const,
  user: (id: string) => ["user", id] as const,
  userShorts: (id: string) => ["user-shorts", id] as const,
  conversations: ["conversations"] as const,
};
