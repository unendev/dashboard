/**
 * 小黑盒数据类型定义
 */

export interface HeyboxPost {
  id: string;
  title: string;
  title_cn?: string;
  url: string;
  author?: string;
  avatar_url?: string;
  cover_image?: string;
  content_summary?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  game_tag?: string;
  timestamp?: string;
  analysis: {
    title_cn?: string;
    core_issue: string;
    key_info: string[];
    post_type: string;
    value_assessment: string;
    detailed_analysis?: string;
  };
}

export interface HeyboxComment {
  id: string;
  post_id: string;
  author?: string;
  content: string;
  likes_count: number;
  created_at: string;
  parent_id?: string;
  depth: number;
}

export interface HeyboxReport {
  meta: {
    report_date: string;
    title: string;
    post_count: number;
  };
  posts: HeyboxPost[];
}



