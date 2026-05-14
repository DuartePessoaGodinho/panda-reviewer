export interface ReviewEntry {
  id: string;
  createdAt: string;
  context: string;
  output: string;
  notes: string;
}

export interface ReviewCheckpoint {
  mrId: number;
  projectId: number;
  mrIid: number;
  sourceBranch: string;
  targetBranch: string;
  sourceSha: string;
  reviewedAt: string;
  kind: 'manual' | 'ai' | 'approve';
}

export type AiReviewProvider = 'claude' | 'copilot' | 'codex';

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  web_url?: string;
}

export interface DiffPosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  position_type: 'text';
  old_path: string;
  new_path: string;
  old_line?: number;
  new_line?: number;
}

export interface MergeRequestVersion {
  id: number;
  head_commit_sha: string;
  base_commit_sha: string;
  start_commit_sha: string;
  created_at: string;
  merge_request_id: number;
  state: string;
}

export interface GitLabDiscussionNote {
  id: number;
  type: string | null;
  body: string;
  attachment?: string | null;
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: string;
  noteable_iid?: number | null;
  project_id: number;
  resolvable?: boolean;
  resolved?: boolean;
  resolved_by?: GitLabUser | null;
  position?: DiffPosition | null;
}

export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabDiscussionNote[];
}

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

export type MrActivityKind = 'new_mr' | 'new_commit' | 'author_comment' | 'updated';

export interface MrActivityEvent {
  mrId: number;
  projectId: number;
  mrIid: number;
  title: string;
  queue: 'To Review' | 'My MRs';
  kind: MrActivityKind;
  previousActivityKey?: string;
  activityKey: string;
  activityAt?: string;
  fromSha?: string;
  toSha?: string;
}

export interface MrsUpdatePayload {
  toReview: MR[];
  myMrs: MR[];
  currentUserId: number | null;
  activityEvents?: MrActivityEvent[];
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
