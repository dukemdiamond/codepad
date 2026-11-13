import { notFound, redirect } from "next/navigation";
import { getQuestion } from "@/lib/questions";
import { newRoomId } from "@/lib/render";

// Every visit to /q/<question> starts a fresh private session.
export const dynamic = "force-dynamic";

export default async function NewSessionForQuestion({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getQuestion(slug)) notFound();
  redirect(`/s/${newRoomId()}/${slug}`);
}
