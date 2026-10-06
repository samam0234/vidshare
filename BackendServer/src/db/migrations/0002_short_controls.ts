/**
 * 쇼츠 업로더 설정 · 시청자 비추천 (107).
 *
 * - `visibility`        'public' | 'private' — 비공개는 작성자 본인만 본다
 * - `comments_enabled`  0/1 — 0 이면 새 댓글을 막는다 (기존 댓글은 남는다)
 * - `short_dislikes`    로그인 유저의 "비추천" — 그 유저의 추천 피드에서만 제외한다
 *
 * 불리언은 기존 규약대로 0/1 INTEGER 로 둔다(096 은 타입을 보존했다).
 */
export const sql = `
ALTER TABLE shorts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE shorts ADD CONSTRAINT shorts_visibility_chk CHECK (visibility IN ('public', 'private'));
ALTER TABLE shorts ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1;

CREATE TABLE short_dislikes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  created_at TEXT COLLATE "C" NOT NULL,
  PRIMARY KEY (user_id, short_id)
);
CREATE INDEX idx_short_dislikes_short ON short_dislikes(short_id);
`;
