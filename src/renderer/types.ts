export interface ReviewEntry {
  id: string;
  createdAt: string;
  context: string;
  output: string;
  notes: string;
}

export type AiReviewProvider = 'claude' | 'copilot' | 'codex';

export interface MR {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  work_in_progress: boolean;
  user_notes_count: number;
  author: { id: number; name: string; username: string; avatar_url: string };
  approved_by: { user: { id: number } }[];
  head_pipeline: { status: string } | null;
  references: { full: string } | null;
  sha?: string;
  review_activity_at?: string;
  review_activity_key?: string;
  review_activity_kind?: 'commit' | 'author_comment' | 'created';
}

export interface AppSettings {
  gitlabToken: string;
  gitlabUrl: string;
  repoPaths: string[];
  ide: 'vscode' | 'intellij';
  intellijPath: string;
  pollingIntervalMs: number;
  aiReviewEnabled: boolean;
  aiReviewProvider: AiReviewProvider;
}
