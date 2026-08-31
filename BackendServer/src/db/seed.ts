import bcrypt from "bcrypt";
import type Database from "better-sqlite3";
import {
  seedAuthors,
  seedChatUsers,
  seedComments,
  seedFaqs,
  seedLoginPasswords,
  seedMessages,
  seedShorts,
} from "../data/seedData";

export function seedIfEmpty(db: Database.Database) {
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c > 0) return;

  const now = new Date().toISOString();
  const insertUser = db.prepare(
    `INSERT INTO users (id, handle, name, bio, avatar, password_hash, created_at)
     VALUES (@id, @handle, @name, @bio, @avatar, @password_hash, @created_at)`
  );
  const insertShort = db.prepare(
    `INSERT INTO shorts
      (id, title, description, author_id, likes, comment_count, views, video_url, gradient, created_at)
     VALUES
      (@id, @title, @description, @author_id, @likes, @comment_count, @views, @video_url, @gradient, @created_at)`
  );
  const insertComment = db.prepare(
    `INSERT INTO comments (id, short_id, author, text, time)
     VALUES (@id, @short_id, @author, @text, @time)`
  );
  const insertChatUser = db.prepare(
    `INSERT INTO chat_users (id, name, handle, avatar, last_message, online)
     VALUES (@id, @name, @handle, @avatar, @last_message, @online)`
  );
  const insertMessage = db.prepare(
    `INSERT INTO messages (id, peer_id, type, content, is_image, time)
     VALUES (@id, @peer_id, @type, @content, @is_image, @time)`
  );
  const insertFaq = db.prepare(
    `INSERT INTO faqs (id, question, answers) VALUES (@id, @question, @answers)`
  );

  const tx = db.transaction(() => {
    for (const a of seedAuthors) {
      const password = seedLoginPasswords[a.id];
      insertUser.run({
        id: a.id,
        handle: a.handle,
        name: a.name,
        bio: a.bio ?? "",
        avatar: a.avatar ?? null,
        password_hash: password ? bcrypt.hashSync(password, 10) : null,
        created_at: now,
      });
    }

    for (const s of seedShorts) {
      insertShort.run({
        id: s.id,
        title: s.title,
        description: s.description ?? "",
        author_id: s.author.id,
        likes: s.likes,
        comment_count: s.comments,
        views: s.views,
        video_url: s.videoUrl ?? null,
        gradient: s.gradient,
        created_at: s.createdAt,
      });
    }

    for (const c of seedComments) {
      insertComment.run({
        id: c.id,
        short_id: c.shortId,
        author: c.author,
        text: c.text,
        time: c.time,
      });
    }

    for (const u of seedChatUsers) {
      insertChatUser.run({
        id: u.id,
        name: u.name,
        handle: u.handle,
        avatar: u.avatar ?? null,
        last_message: u.lastMessage,
        online: u.online ? 1 : 0,
      });
    }

    for (const [peerId, list] of Object.entries(seedMessages)) {
      for (const m of list) {
        insertMessage.run({
          id: m.id,
          peer_id: peerId,
          type: m.type,
          content: m.content,
          is_image: m.isImage ? 1 : 0,
          time: m.time,
        });
      }
    }

    for (const f of seedFaqs) {
      insertFaq.run({
        id: f.id,
        question: f.question,
        answers: JSON.stringify(f.answers),
      });
    }
  });

  tx();
  console.log("  SQLite: 데모 데이터를 시드했습니다.");
}
