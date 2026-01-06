import { NextResponse } from 'next/server';

// Eternal Return API 配置
const ER_API_KEY = process.env.ER_API_KEY || '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW';
const ER_API_BASE_URL = 'https://open-api.bser.io';
const ER_NICKNAME = process.env.ER_NICKNAME || 'Geerea';

// 缓存配置
const CACHE_DURATION = {
  CHARACTER_META: 24 * 60 * 60 * 1000, // 24小时 - 角色元数据很少变化
  USER_INFO: 30 * 60 * 1000, // 30分钟 - 用户信息变化较少
  GAME_DATA: 2 * 60 * 1000, // 2分钟 - 游戏数据更新较频繁
};

// 内存缓存
const cache = {
  characterMeta: {
    data: null as Record<number, { name: string; chineseName: string; code: string }> | null,
    timestamp: 0,
  },
  itemMeta: {
    data: null as Record<number, { name: string; iconUrl: string }> | null,
    timestamp: 0,
  },
  traitMeta: {
    data: null as Record<number, { name: string; iconUrl: string }> | null,
    timestamp: 0,
  },
  userInfo: {
    data: null as ERUser | null,
    timestamp: 0,
  },
  gameData: {
    data: null as ERUserGame[] | null,
    timestamp: 0,
    userNum: 0,
  },
};

// 游戏数据类型
interface ERUser {
  userNum: number;
  nickname: string;
}

interface ERUserGame {
  gameId: number;
  userNum: number;
  characterNum: number;
  characterLevel: number;
  gameRank: number;
  playerKill: number;
  playerDeaths: number;
  playerAssistant: number;
  damageToPlayer: number;
  mmrAfter: number;
  mmrGain: number;
  matchingMode: number;
  matchingTeamMode: number;
  playTime: number;
  startDtm: string;
  routeIdOfStart: number;
  equipment: Record<string, number>;
  traitFirstCore: number;
  traitSecondCore: number;
  traitFirstSub: number;
  traitSecondSub: number;
}

interface ERGameDetail {
  userGames: ERUserGame[];
}

// 角色映射 - 使用 API 返回的正确英文名称
const CHARACTER_MAP: Record<number, { name: string; avatar: string }> = {
  1: { name: 'Jackie', avatar: '/characters/jackie.png' },
  2: { name: 'Aya', avatar: '/characters/aya.png' },
  3: { name: 'Fiora', avatar: '/characters/fiora.png' },
  4: { name: 'Magnus', avatar: '/characters/magnus.png' },
  5: { name: 'Zahir', avatar: '/characters/zahir.png' },
  6: { name: 'Nadine', avatar: '/characters/nadine.png' },
  7: { name: 'Hyunwoo', avatar: '/characters/hyunwoo.png' },
  8: { name: 'Hart', avatar: '/characters/hart.png' },
  9: { name: 'Isol', avatar: '/characters/isol.png' },
  10: { name: 'LiDailin', avatar: '/characters/lidailin.png' },
  11: { name: 'Yuki', avatar: '/characters/yuki.png' },
  12: { name: 'Hyejin', avatar: '/characters/hyejin.png' },
  13: { name: 'Xiukai', avatar: '/characters/xiukai.png' },
  14: { name: 'Chiara', avatar: '/characters/chiara.png' },
  15: { name: 'Sissela', avatar: '/characters/sissela.png' },
  16: { name: 'Silvia', avatar: '/characters/silvia.png' },
  17: { name: 'Adriana', avatar: '/characters/adriana.png' },
  18: { name: 'Shoichi', avatar: '/characters/shoichi.png' },
  19: { name: 'Emma', avatar: '/characters/emma.png' },
  20: { name: 'Lenox', avatar: '/characters/lenox.png' },
  21: { name: 'Rozzi', avatar: '/characters/rozzi.png' },
  22: { name: 'Luke', avatar: '/characters/luke.png' },
  23: { name: 'Cathy', avatar: '/characters/cathy.png' },
  24: { name: 'Adela', avatar: '/characters/adela.png' },
  25: { name: 'Bernice', avatar: '/characters/bernice.png' },
  26: { name: 'Barbara', avatar: '/characters/barbara.png' },
  27: { name: 'Alex', avatar: '/characters/alex.png' },
  28: { name: 'Sua', avatar: '/characters/sua.png' },
  29: { name: 'Leon', avatar: '/characters/leon.png' },
  30: { name: 'Eleven', avatar: '/characters/eleven.png' },
  31: { name: 'Rio', avatar: '/characters/rio.png' },
  32: { name: 'William', avatar: '/characters/william.png' },
  33: { name: 'Nicky', avatar: '/characters/nicky.png' },
  34: { name: 'Nathapon', avatar: '/characters/nathapon.png' },
  35: { name: 'Jan', avatar: '/characters/jan.png' },
  36: { name: 'Eva', avatar: '/characters/eva.png' },
  37: { name: 'Daniel', avatar: '/characters/daniel.png' },
  38: { name: 'Jenny', avatar: '/characters/jenny.png' },
  39: { name: 'Camilo', avatar: '/characters/camilo.png' },
  40: { name: 'Chloe', avatar: '/characters/chloe.png' },
  41: { name: 'Johann', avatar: '/characters/johann.png' },
  42: { name: 'Bianca', avatar: '/characters/bianca.png' },
  43: { name: 'Celine', avatar: '/characters/celine.png' },
  44: { name: 'Echion', avatar: '/characters/echion.png' },
  45: { name: 'Mai', avatar: '/characters/mai.png' },
  46: { name: 'Aiden', avatar: '/characters/aiden.png' },
  47: { name: 'Laura', avatar: '/characters/laura.png' },
  48: { name: 'Tia', avatar: '/characters/tia.png' },
  49: { name: 'Felix', avatar: '/characters/felix.png' },
  50: { name: 'Elena', avatar: '/characters/elena.png' },
  51: { name: 'Priya', avatar: '/characters/priya.png' },
  52: { name: 'Adina', avatar: '/characters/adina.png' },
  53: { name: 'Markus', avatar: '/characters/markus.png' },
  54: { name: 'Karla', avatar: '/characters/karla.png' },
  55: { name: 'Estelle', avatar: '/characters/estelle.png' },
  56: { name: 'Piolo', avatar: '/characters/piolo.png' },
  57: { name: 'Martina', avatar: '/characters/martina.png' },
  58: { name: 'Haze', avatar: '/characters/haze.png' },
  59: { name: 'Isaac', avatar: '/characters/isaac.png' },
  60: { name: 'Tazia', avatar: '/characters/tazia.png' },
  61: { name: 'Irem', avatar: '/characters/irem.png' },
  62: { name: 'Theodore', avatar: '/characters/theodore.png' },
  63: { name: 'Lyanh', avatar: '/characters/lyanh.png' },
  64: { name: 'Vanya', avatar: '/characters/vanya.png' },
};

// 游戏模式映射 - 使用 API 返回的正确名称
const GAME_MODE_MAP: Record<number, string> = {
  1: 'Normal',
  2: 'Normal',
  3: 'Ranked',
  4: 'Custom',
};

// 团队模式映射 - 使用 API 返回的正确名称
const TEAM_MODE_MAP: Record<number, string> = {
  1: 'Solo',
  2: 'Duo',
  3: 'Squad',
};

// 获取用户信息（带缓存）
async function getUserByNickname(nickname: string): Promise<ERUser | null> {
  const now = Date.now();
  
  // 检查缓存
  if (cache.userInfo.data && 
      cache.userInfo.timestamp > 0 && 
      (now - cache.userInfo.timestamp) < CACHE_DURATION.USER_INFO) {
    console.log('使用缓存的用户信息');
    return cache.userInfo.data;
  }

  try {
    console.log('从API获取用户信息:', nickname);
    const response = await fetch(`${ER_API_BASE_URL}/v1/user/nickname?query=${encodeURIComponent(nickname)}`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get user by nickname: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const user = data.user || null;
    
    // 更新缓存
    if (user) {
      cache.userInfo.data = user;
      cache.userInfo.timestamp = now;
      console.log('用户信息已缓存');
    }
    
    return user;
  } catch (error) {
    console.error('Error fetching user by nickname:', error);
    return null;
  }
}

// 获取用户最近游戏（带缓存）
async function getUserRecentGames(userNum: number): Promise<ERUserGame[]> {
  const now = Date.now();
  
  // 检查缓存
  if (cache.gameData.data && 
      cache.gameData.timestamp > 0 && 
      cache.gameData.userNum === userNum &&
      (now - cache.gameData.timestamp) < CACHE_DURATION.GAME_DATA) {
    console.log('使用缓存的游戏数据');
    return cache.gameData.data;
  }

  try {
    console.log('从API获取游戏数据:', userNum);
    const response = await fetch(`${ER_API_BASE_URL}/v1/user/games/${userNum}`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get user games: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const games = data.userGames || [];
    
    // 更新缓存
    cache.gameData.data = games;
    cache.gameData.timestamp = now;
    cache.gameData.userNum = userNum;
    console.log('游戏数据已缓存');
    
    return games;
  } catch (error) {
    console.error('Error fetching user games:', error);
    return [];
  }
}

// 获取游戏详情
async function getGameDetail(gameId: number): Promise<ERGameDetail | null> {
  try {
    const response = await fetch(`${ER_API_BASE_URL}/v1/games/${gameId}`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get game detail: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching game detail:', error);
    return null;
  }
}

/**
 * 解析翻译文件内容
 * 格式：Character/Name/1┃杰琪
 */
function parseTranslationFile(content: string): Record<string, string> {
  const translations: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.includes('┃')) {
      const [key, value] = trimmedLine.split('┃');
      if (key && value) {
        translations[key.trim()] = value.trim();
      }
    }
  }
  
  return translations;
}

// 获取中文语言包（带缓存）
async function getChineseL10n(): Promise<Record<string, string> | null> {
  const now = Date.now();
  
  // 检查缓存 - 使用characterMeta缓存来存储语言包
  if (cache.characterMeta.data && 
      cache.characterMeta.timestamp > 0 && 
      (now - cache.characterMeta.timestamp) < CACHE_DURATION.CHARACTER_META) {
    console.log('使用缓存的中文语言包');
    return (cache.characterMeta.data as { l10nData?: Record<string, string> }).l10nData || null;
  }

  try {
    console.log('从API获取中文语言包');
    
    // 第一步：获取语言包链接
    const response = await fetch(`${ER_API_BASE_URL}/v1/l10n/ChineseSimplified`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get Chinese l10n: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const fileUrl = data.data.l10Path;
    
    // 第二步：下载翻译文件
    console.log('下载翻译文件:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      console.error(`Failed to download translation file: ${fileResponse.status}`);
      return null;
    }
    
    const fileContent = await fileResponse.text();
    
    // 第三步：解析文件内容
    const translations = parseTranslationFile(fileContent);
    
    console.log(`中文语言包已获取，共 ${Object.keys(translations).length} 条翻译`);
    return translations;
  } catch (error) {
    console.error('Error fetching Chinese l10n:', error);
    return null;
  }
}

// 获取角色元数据（带缓存）- 现在包含中文名称
async function getCharacterMeta(): Promise<Record<number, { name: string; chineseName: string; code: string }> | null> {
  const now = Date.now();
  
  // 检查缓存
  if (cache.characterMeta.data && 
      cache.characterMeta.timestamp > 0 && 
      (now - cache.characterMeta.timestamp) < CACHE_DURATION.CHARACTER_META) {
    console.log('使用缓存的角色元数据');
    return cache.characterMeta.data;
  }

  try {
    console.log('从API获取角色元数据和中文翻译');
    
    // 同时发起两个请求：角色数据和中文翻译
    const [characterResponse, translations] = await Promise.all([
      fetch(`${ER_API_BASE_URL}/v2/data/Character`, {
        headers: {
          'x-api-key': ER_API_KEY,
          'Content-Type': 'application/json',
        },
      }),
      getChineseL10n()
    ]);

    if (!characterResponse.ok) {
      console.error(`Failed to get character data: ${characterResponse.status}`);
      return null;
    }

    const characterData = await characterResponse.json();
    const characters = characterData.data || [];
    
    const characterMap: Record<number, { name: string; chineseName: string; code: string }> = {};
    
    // 遍历角色列表并组合数据
    for (const character of characters) {
      const characterId = character.code;
      const translationKey = `Character/Name/${characterId}`;
      
      // 在翻译词典中查找对应的中文名
      const chineseName = translations?.[translationKey];
      
      if (characterId && character.name) {
        characterMap[characterId] = {
          name: character.name,
          chineseName: chineseName || character.name, // 如果没有中文翻译，使用英文名
          code: characterId.toString()
        };
      }
    }
    
    // 更新缓存
    cache.characterMeta.data = characterMap;
    cache.characterMeta.timestamp = now;
    console.log(`角色元数据已缓存，共 ${Object.keys(characterMap).length} 个角色`);
    
    return characterMap;
  } catch (error) {
    console.error('Error fetching character meta:', error);
    return null;
  }
}

// 获取物品元数据（带缓存）
async function getItemMeta(): Promise<Record<number, { name: string; iconUrl: string }> | null> {
  const now = Date.now();
  
  // 检查缓存
  if (cache.itemMeta.data && 
      cache.itemMeta.timestamp > 0 && 
      (now - cache.itemMeta.timestamp) < CACHE_DURATION.CHARACTER_META) {
    console.log('使用缓存的物品元数据');
    return cache.itemMeta.data;
  }

  try {
    console.log('从API获取物品元数据');
    const response = await fetch(`${ER_API_BASE_URL}/v2/data/Item`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get item meta: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const itemMap: Record<number, { name: string; iconUrl: string }> = {};
    
    if (data && data.data && Array.isArray(data.data)) {
      data.data.forEach((item: { code: number; name: string; iconUrl?: string }) => {
        if (item.code && item.name) {
          itemMap[item.code] = {
            name: item.name,
            iconUrl: item.iconUrl || ''
          };
        }
      });
    }
    
    // 更新缓存
    cache.itemMeta.data = itemMap;
    cache.itemMeta.timestamp = now;
    console.log('物品元数据已缓存');
    
    return itemMap;
  } catch (error) {
    console.error('Error fetching item meta:', error);
    return null;
  }
}

// 获取特质元数据（带缓存）
async function getTraitMeta(): Promise<Record<number, { name: string; iconUrl: string }> | null> {
  const now = Date.now();
  
  // 检查缓存
  if (cache.traitMeta.data && 
      cache.traitMeta.timestamp > 0 && 
      (now - cache.traitMeta.timestamp) < CACHE_DURATION.CHARACTER_META) {
    console.log('使用缓存的特质元数据');
    return cache.traitMeta.data;
  }

  try {
    console.log('从API获取特质元数据');
    const response = await fetch(`${ER_API_BASE_URL}/v2/data/Trait`, {
      headers: {
        'x-api-key': ER_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get trait meta: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const traitMap: Record<number, { name: string; iconUrl: string }> = {};
    
    if (data && data.data && Array.isArray(data.data)) {
      data.data.forEach((trait: { code: number; name: string; iconUrl?: string }) => {
        if (trait.code && trait.name) {
          traitMap[trait.code] = {
            name: trait.name,
            iconUrl: trait.iconUrl || ''
          };
        }
      });
    }
    
    // 更新缓存
    cache.traitMeta.data = traitMap;
    cache.traitMeta.timestamp = now;
    console.log('特质元数据已缓存');
    
    return traitMap;
  } catch (error) {
    console.error('Error fetching trait meta:', error);
    return null;
  }
}

// 时间格式化函数
function formatPlayTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getRelativeTime(startDtm: string): string {
  const now = new Date();
  const startTime = new Date(startDtm);
  const diffMs = now.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}天前`;
  } else if (diffHours > 0) {
    return `${diffHours}小时前`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分钟前`;
  } else {
    return '刚刚';
  }
}

export const revalidate = 60; // 1分钟缓存，更频繁更新

export async function GET() {
  try {
    // Step 1: 获取用户信息
    const user = await getUserByNickname(ER_NICKNAME);
    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        message: `无法找到昵称为 "${ER_NICKNAME}" 的用户`
      }, { status: 404 });
    }

    // Step 2: 获取最近游戏列表
    const recentGames = await getUserRecentGames(user.userNum);
    if (recentGames.length === 0) {
      return NextResponse.json({
        error: 'No recent games',
        message: '没有找到最近的游戏记录'
      }, { status: 404 });
    }

    // Step 3: 获取最新游戏的详细信息
    const latestGameId = recentGames[0].gameId;
    const gameDetail = await getGameDetail(latestGameId);
    if (!gameDetail) {
      return NextResponse.json({
        error: 'Game detail not found',
        message: '无法获取游戏详细信息'
      }, { status: 404 });
    }

    // Step 4: 找到当前用户在该游戏中的数据
    const userGameData = gameDetail.userGames.find(game => game.userNum === user.userNum);
    if (!userGameData) {
      return NextResponse.json({
        error: 'User game data not found',
        message: '无法找到用户在该游戏中的数据'
      }, { status: 404 });
    }

    console.log('找到用户游戏数据:', {
      userNum: userGameData.userNum,
      characterNum: userGameData.characterNum,
      characterLevel: userGameData.characterLevel,
      gameRank: userGameData.gameRank,
      playerKill: userGameData.playerKill,
      playerDeaths: userGameData.playerDeaths,
      playerAssistant: userGameData.playerAssistant,
      damageToPlayer: userGameData.damageToPlayer,
      mmrAfter: userGameData.mmrAfter,
      mmrGain: userGameData.mmrGain,
      playTime: userGameData.playTime,
      startDtm: userGameData.startDtm,
      routeIdOfStart: userGameData.routeIdOfStart,
      equipment: userGameData.equipment,
      traitFirstCore: userGameData.traitFirstCore,
      traitFirstSub: userGameData.traitFirstSub,
      traitSecondSub: userGameData.traitSecondSub
    });

    // Step 5: 获取所有静态数据
    const [characterMeta, itemMeta, traitMeta] = await Promise.all([
      getCharacterMeta(),
      getItemMeta(),
      getTraitMeta()
    ]);

    // 角色信息 - 优先使用中文名称
    const mappedName = CHARACTER_MAP[userGameData.characterNum]?.name;
    const apiName = characterMeta?.[userGameData.characterNum]?.name;
    const chineseName = characterMeta?.[userGameData.characterNum]?.chineseName;
    
    const characterInfo = {
      name: chineseName || mappedName || apiName || `角色 ${userGameData.characterNum}`,
      englishName: apiName || mappedName || `Character ${userGameData.characterNum}`,
      code: userGameData.characterNum.toString()
    };

    // 装备信息
    const equipment = userGameData.equipment || {};
    const equipmentItems = Object.entries(equipment).map(([slot, itemId]) => ({
      slot,
      itemId,
      name: itemMeta?.[itemId]?.name || `物品 ${itemId}`,
      iconUrl: itemMeta?.[itemId]?.iconUrl || ''
    }));

    // 特质信息
    const traits = [];
    
    // 核心特质
    if (userGameData.traitFirstCore) {
      traits.push({
        id: userGameData.traitFirstCore,
        name: traitMeta?.[userGameData.traitFirstCore]?.name || `特质 ${userGameData.traitFirstCore}`,
        iconUrl: traitMeta?.[userGameData.traitFirstCore]?.iconUrl || '',
        type: '核心特质'
      });
    }
    
    // 副特质1
    if (userGameData.traitFirstSub && Array.isArray(userGameData.traitFirstSub)) {
      userGameData.traitFirstSub.forEach((traitId, index) => {
        if (traitId) {
          traits.push({
            id: traitId,
            name: traitMeta?.[traitId]?.name || `特质 ${traitId}`,
            iconUrl: traitMeta?.[traitId]?.iconUrl || '',
            type: `副特质1-${index + 1}`
          });
        }
      });
    }
    
    // 副特质2
    if (userGameData.traitSecondSub && Array.isArray(userGameData.traitSecondSub)) {
      userGameData.traitSecondSub.forEach((traitId, index) => {
        if (traitId) {
          traits.push({
            id: traitId,
            name: traitMeta?.[traitId]?.name || `特质 ${traitId}`,
            iconUrl: traitMeta?.[traitId]?.iconUrl || '',
            type: `副特质2-${index + 1}`
          });
        }
      });
    }

    const formattedData = {
      characterNum: userGameData.characterNum,
      characterName: characterInfo.name,
      characterEnglishName: characterInfo.englishName,
      characterCode: characterInfo.code,
      characterAvatar: CHARACTER_MAP[userGameData.characterNum]?.avatar || '/characters/default.png',
      characterLevel: userGameData.characterLevel || 1,
      gameRank: userGameData.gameRank,
      playerKill: userGameData.playerKill,
      playerDeaths: userGameData.playerDeaths || 0,
      playerAssistant: userGameData.playerAssistant,
      damageToPlayer: userGameData.damageToPlayer || 0,
      mmrAfter: userGameData.mmrAfter || 0,
      mmrGain: userGameData.mmrGain || 0,
      matchingMode: userGameData.matchingMode,
      matchingModeName: GAME_MODE_MAP[userGameData.matchingMode] || 'Unknown',
      matchingTeamMode: userGameData.matchingTeamMode,
      matchingTeamModeName: TEAM_MODE_MAP[userGameData.matchingTeamMode] || 'Unknown',
      playTime: userGameData.playTime || 0,
      playTimeFormatted: formatPlayTime(userGameData.playTime || 0),
      startDtm: userGameData.startDtm,
      timeAgo: getRelativeTime(userGameData.startDtm),
      routeIdOfStart: userGameData.routeIdOfStart || 0,
      equipment: equipmentItems,
      traits: traits,
      gameId: latestGameId,
      nickname: user.nickname,
      lastPlayed: new Date().toISOString(),
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error in Eternal Return API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: '服务器内部错误'
    }, { status: 500 });
  }
}