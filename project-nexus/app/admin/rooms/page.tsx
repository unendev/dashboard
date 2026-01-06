"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Clock, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomMetadata {
  id: string;
  createdAt: number;
  playerCount: number;
  lastActivity: number;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    // MVP: 从 localStorage 读取房间列表
    // 在实际应用中，这应该从后端 API 获取
    const storedRooms = localStorage.getItem('goc_rooms_metadata');
    if (storedRooms) {
      try {
        const parsed = JSON.parse(storedRooms) as RoomMetadata[];
        // 按创建时间倒序排列（最新的在前）
        setRooms(parsed.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error('Failed to parse rooms metadata:', error);
      }
    }
    setLoading(false);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`Are you sure you want to delete room "${roomId}"?`)) {
      return;
    }

    setDeleting(roomId);
    try {
      const response = await fetch("/api/admin/rooms/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete room: ${error.error}`);
        return;
      }

      // 从本地列表中移除房间
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }

      // 从 localStorage 中移除房间元数据
      const storedRooms = localStorage.getItem('goc_rooms_metadata');
      if (storedRooms) {
        try {
          const parsed = JSON.parse(storedRooms) as RoomMetadata[];
          const updated = parsed.filter((r) => r.id !== roomId);
          localStorage.setItem('goc_rooms_metadata', JSON.stringify(updated));
        } catch (error) {
          console.error('Failed to update localStorage:', error);
        }
      }

      alert(`Room "${roomId}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('An error occurred while deleting the room');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur p-4">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-widest">ADMIN PANEL</h1>
        <p className="text-xs text-zinc-500 mt-1">Game Operations Center - Room Management</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Room List */}
        <div className="w-1/3 border-r border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur">
            <h2 className="text-lg font-bold text-cyan-400">ROOMS</h2>
            <p className="text-xs text-zinc-500 mt-1">{rooms.length} total</p>
          </div>

          {loading ? (
            <div className="p-4 text-zinc-500 text-sm">Loading...</div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-zinc-500 text-sm">No rooms found</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-zinc-900/50 group",
                    selectedRoomId === room.id && 'bg-zinc-800 border-l-2 border-cyan-500'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-cyan-400 truncate">{room.id}</div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(room.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <Users className="w-3 h-3" />
                        <span>{room.playerCount} player{room.playerCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Last activity: {formatDuration(room.lastActivity)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                        disabled={deleting === room.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-900/30 rounded text-red-400 hover:text-red-300 disabled:opacity-50"
                        title="Delete room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Room Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedRoomId ? (
            <RoomDetail roomId={selectedRoomId} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg">Select a room to view details</p>
                <p className="text-xs text-zinc-600 mt-2">Click on a room from the list</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomDetail({ roomId }: { roomId: string }) {
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // MVP: 从 localStorage 读取房间数据
    // 在实际应用中，这应该从后端 API 获取
    const storedRoomData = localStorage.getItem(`goc_room_${roomId}`);
    if (storedRoomData) {
      try {
        const parsed = JSON.parse(storedRoomData);
        setRoomData(parsed);
      } catch (error) {
        console.error('Failed to parse room data:', error);
      }
    }
    setLoading(false);
  }, [roomId]);

  if (loading) {
    return (
      <div className="p-6 text-zinc-500">
        <p>Loading room details...</p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="p-6 text-zinc-500">
        <p>No data available for this room</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Room: {roomId}</h2>
      </div>

      {/* Notes Section */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Field Notes</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4 text-sm text-zinc-300 max-h-48 overflow-y-auto">
          {roomData.notes ? (
            <pre className="whitespace-pre-wrap font-mono text-xs">{roomData.notes}</pre>
          ) : (
            <p className="text-zinc-600">(No notes)</p>
          )}
        </div>
      </div>

      {/* Todos Section */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Tasks</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4 text-sm text-zinc-300 max-h-48 overflow-y-auto">
          {roomData.todos && roomData.todos.length > 0 ? (
            <ul className="space-y-2">
              {roomData.todos.map((todo: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    disabled
                    className="mt-1 w-4 h-4"
                  />
                  <span className={todo.completed ? 'line-through text-zinc-600' : ''}>
                    {todo.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-600">(No tasks)</p>
          )}
        </div>
      </div>

      {/* Players Section */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Players</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4 text-sm text-zinc-300 max-h-48 overflow-y-auto">
          {roomData.players && roomData.players.length > 0 ? (
            <ul className="space-y-2">
              {roomData.players.map((player: any, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold">
                    {player.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span>{player.name || 'Unknown'}</span>
                  <span className="text-xs text-zinc-600">({player.id})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-600">(No players)</p>
          )}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Created</p>
          <p className="text-sm text-zinc-300">
            {roomData.createdAt ? new Date(roomData.createdAt).toLocaleString() : 'N/A'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Last Activity</p>
          <p className="text-sm text-zinc-300">
            {roomData.lastActivity ? new Date(roomData.lastActivity).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
