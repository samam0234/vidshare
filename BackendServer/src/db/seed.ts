import bcrypt from "bcrypt";
import { getDb, withTx } from "./client";
import {
  seedAuthors,
  seedChatUsers,
  seedComments,
  seedFaqs,
  seedLoginPasswords,
  seedMessages,
  seedShorts,
} from "../data/seedData";

export async function seedIfEmpty() {
  const row = await getDb().get<{ c: number }>("SELECT COUNT(*) AS c FROM users");
  if (row && row.c > 0) return;

  const now = new Date().toISOString();

  await withTx(async (tx) => {
    for (const a of seedAuthors) {
      const password = seedLoginPasswords[a.id];
      await tx.run(
        `INSERT INTO users (id, handle, name, bio, avatar, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        a.id,
        a.handle,
        a.name,
        a.bio ?? "",
        a.avatar ?? null,
        password ? bcrypt.hashSync(password, 10) : null,
        now
      );
    }

    for (const s of seedShorts) {
      await tx.run(
        `INSERT INTO shorts
          (id, title, description, author_id, likes, comment_count, views, video_url, gradient, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.title,
        s.description ?? "",
        s.author.id,
        s.likes,
        s.comments,
        s.views,
        s.videoUrl ?? null,
        s.gradient,
        s.createdAt
      );
    }

    for (const c of seedComments) {
      await tx.run(
        `INSERT INTO comments (id, short_id, author, text, time) VALUES (?, ?, ?, ?, ?)`,
        c.id,
        c.shortId,
        c.author,
        c.text,
        c.time
      );
    }

    for (const u of seedChatUsers) {
      await tx.run(
        `INSERT INTO chat_users (id, name, handle, avatar, last_message, online)
         VALUES (?, ?, ?, ?, ?, ?)`,
        u.id,
        u.name,
        u.handle,
        u.avatar ?? null,
        u.lastMessage,
        u.online ? 1 : 0
      );
    }

    for (const [peerId, list] of Object.entries(seedMessages)) {
      for (const m of list) {
        await tx.run(
          `INSERT INTO messages (id, peer_id, type, content, is_image, time)
           VALUES (?, ?, ?, ?, ?, ?)`,
          m.id,
          peerId,
          m.type,
          m.content,
          m.isImage ? 1 : 0,
          m.time
        );
      }
    }

    for (const f of seedFaqs) {
      await tx.run(
        `INSERT INTO faqs (id, question, answers) VALUES (?, ?, ?)`,
        f.id,
        f.question,
        JSON.stringify(f.answers)
      );
    }
  });

  if (process.env.NODE_ENV !== "test") {
    console.log("  Postgres: 데모 데이터를 시드했습니다.");
  }
}
