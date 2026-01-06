/**
 * 清理 Liveblocks 房间脚本
 * 删除所有以 "room" 开头的房间
 */

const LIVEBLOCKS_SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY || "sk_dev_sFsPD0LEXo55RzzXSscJ05D8cZVEXwAc3PmgK663m48tPXEt05pBzahzdcuEqKXx";

async function listRooms() {
  const response = await fetch("https://api.liveblocks.io/v2/rooms", {
    headers: {
      Authorization: `Bearer ${LIVEBLOCKS_SECRET_KEY}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list rooms: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function deleteRoom(roomId) {
  const response = await fetch(`https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${LIVEBLOCKS_SECRET_KEY}`,
    },
  });
  
  if (!response.ok) {
    console.error(`Failed to delete room ${roomId}: ${response.status}`);
    return false;
  }
  
  return true;
}

async function main() {
  console.log("🔍 Fetching all Liveblocks rooms...\n");
  
  const { data: rooms, nextCursor } = await listRooms();
  
  console.log(`Found ${rooms.length} rooms total:\n`);
  
  // 筛选出所有测试房间 (test-room-*, test*, 数字等)
  const roomsToDelete = rooms.filter(room => 
    room.id.startsWith("test") || 
    room.id.startsWith("room") || 
    room.id.includes("/room") ||
    /^\d+$/.test(room.id) // 纯数字的房间
  );
  
  console.log("All rooms:");
  rooms.forEach(room => {
    const willDelete = roomsToDelete.some(r => r.id === room.id);
    console.log(`  ${willDelete ? "🗑️" : "  "} ${room.id}`);
  });
  
  if (roomsToDelete.length === 0) {
    console.log("\n✅ No rooms matching '/room' pattern found.");
    return;
  }
  
  console.log(`\n🗑️  Will delete ${roomsToDelete.length} rooms:\n`);
  roomsToDelete.forEach(room => console.log(`  - ${room.id}`));
  
  // 删除房间
  console.log("\n🚀 Deleting rooms...\n");
  
  let deleted = 0;
  let failed = 0;
  
  for (const room of roomsToDelete) {
    const success = await deleteRoom(room.id);
    if (success) {
      console.log(`  ✅ Deleted: ${room.id}`);
      deleted++;
    } else {
      console.log(`  ❌ Failed: ${room.id}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary: ${deleted} deleted, ${failed} failed`);
}

main().catch(console.error);
