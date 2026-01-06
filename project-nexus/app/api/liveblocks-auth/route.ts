import { Liveblocks } from "@liveblocks/node";
import { env } from "@/lib/env";
import { generateUserHashId, generateAvatarDataUrl } from "@/lib/user-utils";

const liveblocks = new Liveblocks({
  secret: env.LIVEBLOCKS_SECRET_KEY || "sk_dev_placeholder",
});

export async function POST(request: Request) {
  const { room, name } = await request.json();
  
  // 使用固定的 Hash ID 替代随机 ID
  const userId = generateUserHashId(name);
  
  // 生成基于用户名的 SVG 头像
  const avatarDataUrl = generateAvatarDataUrl(name);
  
  const userInfo = {
    name: name || "Player",
    avatar: avatarDataUrl,
  };

  const session = liveblocks.prepareSession(
    userId,
    { userInfo }
  );

  // Give the user full access to the room
  session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
