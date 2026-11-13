import { marked } from "marked";
import { QUESTIONS } from "./questions";
import type { QuestionView } from "@/components/Room";

export function questionViews(): QuestionView[] {
  return QUESTIONS.map((q) => ({
    slug: q.slug,
    title: q.title,
    difficulty: q.difficulty,
    tags: q.tags,
    html: marked.parse(q.description, { async: false }) as string,
    starter: q.starter,
    tests: q.tests,
  }));
}

export function newRoomId(len = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}
