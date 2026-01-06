import { env } from "@/lib/env";

const LIVEBLOCKS_SECRET_KEY = env.LIVEBLOCKS_SECRET_KEY || "sk_dev_placeholder";

export async function DELETE(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return new Response(
        JSON.stringify({ error: "roomId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 调用 Liveblocks API 删除房间
    const response = await fetch(
      `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${LIVEBLOCKS_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Failed to delete room: ${response.status} ${response.statusText}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Room ${roomId} deleted successfully` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting room:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
