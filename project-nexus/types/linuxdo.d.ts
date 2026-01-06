export interface LinuxDoPost {
  id: string;
  title: string;
  url: string;
  replies_count?: number;
  participants_count?: number;
  analysis: {
    core_issue: string;
    key_info: string[];
    post_type: string;
    value_assessment: string;
    detailed_analysis?: string;
  };
}

export interface LinuxDoReport {
  meta: {
    report_date: string;
    title: string;
    source: string;
    post_count: number;
  };
  summary: {
    overview: string;
    highlights: {
      tech_savvy: string[];
      resources_deals: string[];
      hot_topics: string[];
    };
    conclusion: string;
  };
  posts: LinuxDoPost[];
}