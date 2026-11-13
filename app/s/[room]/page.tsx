import { redirect } from "next/navigation";
import { QUESTIONS } from "@/lib/questions";

export default async function RoomIndex({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  redirect(`/s/${room}/${QUESTIONS[0].slug}`);
}
