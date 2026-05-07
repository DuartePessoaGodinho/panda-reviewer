import { net } from 'electron';

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  author: { name: string; username: string; avatar_url: string };
  reviewers: { id: number; name: string; username: string }[];
  source_branch: string;
  target_branch: string;
  project_id: number;
  references: { full: string };
  head_pipeline?: { status: string };
  approved_by: { user: { id: number } }[];
  user_notes_count: number;
}

interface MergeRequestApprovals {
  approved_by: { user: { id: number } }[];
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
}

export interface MrChanges {
  changes: {
    old_path: string;
    new_path: string;
    diff: string;
    new_file: boolean;
    deleted_file: boolean;
    renamed_file: boolean;
  }[];
}

export class GitLabService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = `${baseUrl}/api/v4`;
    this.token = token;
  }

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString();
      url += `?${qs}`;
    }
    const res = await net.fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.token },
    });
    if (!res.ok) throw new Error(`GitLab API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  getCurrentUser(): Promise<GitLabUser> {
    return this.get('/user');
  }

  private async withApprovalInfo(mrs: MergeRequest[]): Promise<MergeRequest[]> {
    return Promise.all(mrs.map(async (mr) => {
      try {
        const approvals = await this.get<MergeRequestApprovals>(
          `/projects/${mr.project_id}/merge_requests/${mr.iid}/approvals`
        );
        return { ...mr, approved_by: approvals.approved_by ?? [] };
      } catch (err) {
        console.warn(`Failed to fetch approvals for MR ${mr.project_id}!${mr.iid}:`, err);
        return { ...mr, approved_by: mr.approved_by ?? [] };
      }
    }));
  }

  async getMrsToReview(userId: number): Promise<MergeRequest[]> {
    const mrs = await this.get<MergeRequest[]>('/merge_requests', {
      reviewer_id: userId,
      state: 'opened',
      scope: 'all',
      per_page: 50,
    });
    return this.withApprovalInfo(mrs);
  }

  async getMyOpenMrs(userId: number): Promise<MergeRequest[]> {
    const [authored, assigned] = await Promise.all([
      this.get<MergeRequest[]>('/merge_requests', { author_id: userId, state: 'opened', scope: 'all', per_page: 50 }),
      this.get<MergeRequest[]>('/merge_requests', { assignee_id: userId, state: 'opened', scope: 'all', per_page: 50 }),
    ]);
    const seen = new Set<number>();
    const mrs = [...authored, ...assigned].filter(mr => {
      if (seen.has(mr.id)) return false;
      seen.add(mr.id);
      return true;
    });
    return this.withApprovalInfo(mrs);
  }

  getProject(projectId: number): Promise<GitLabProject> {
    return this.get(`/projects/${projectId}`);
  }

  getMrChanges(projectId: number, mrIid: number): Promise<MrChanges> {
    return this.get(`/projects/${projectId}/merge_requests/${mrIid}/changes`);
  }

  async approveMr(projectId: number, mrIid: number): Promise<void> {
    const url = `${this.baseUrl}/projects/${projectId}/merge_requests/${mrIid}/approve`;
    const res = await net.fetch(url, {
      method: 'POST',
      headers: { 'PRIVATE-TOKEN': this.token },
    });
    if (!res.ok) throw new Error(`GitLab API ${res.status}: approve MR`);
  }
}
