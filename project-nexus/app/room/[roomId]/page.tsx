import { RoomEntry } from "@/app/components/goc/RoomEntry";
import TacticalBoard from "@/app/components/goc/TacticalBoard";
import CommandCenter from "@/app/components/goc/CommandCenter";
import Viewport from "@/app/components/goc/Viewport";
import GocLayout from "@/app/components/goc/GocLayout";

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    name?: string;
  }>;
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { roomId } = await params;
  const { name } = await searchParams;

  return (
    <RoomEntry roomId={roomId} initialUserName={name}>
      <GocLayout 
        left={<TacticalBoard />}
        middle={<CommandCenter />}
        right={<Viewport />}
      />
    </RoomEntry>
  );
}