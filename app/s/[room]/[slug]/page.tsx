import { notFound } from "next/navigation";
import Room from "@/components/Room";
import { getQuestion } from "@/lib/questions";
import { questionViews } from "@/lib/render";

export default async function SessionPage({ params }: { params: Promise<{ room: string; slug: string }> }) {
  const { room, slug } = await params;
  if (!getQuestion(slug) || !/^[a-zA-Z0-9_-]{1,64}$/.test(room)) notFound();
  return <Room room={room} initialSlug={slug} questions={questionViews()} />;
}
