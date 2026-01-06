export interface BiliUser {
  uid: number;
  name: string;
  description?: string;
  enabled: boolean;
  avatar?: string;
  lastUpdate?: string;
}

export interface BiliUserConfig {
  users: BiliUser[];
}