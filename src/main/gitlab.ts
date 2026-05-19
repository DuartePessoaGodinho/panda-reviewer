import { net } from 'electron';

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  web_url?: string;
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
  author: { id: number; name: string; username: string; avatar_url: string };
  reviewers: { id: number; name: string; username: string }[];
  source_branch: string;
  target_branch: string;
  project_id: number;
  references: { full: string };
  head_pipeline?: { status: string };
  approved_by: { user: { id: number; name?: string; username?: string; avatar_url?: string } }[];
  approvals_required?: number;
  approvals_left?: number;
  user_notes_count: number;
  sha?: string;
  review_activity_at?: string;
  review_activity_key?: string;
  review_activity_kind?: 'commit' | 'author_comment' | 'created';
}

interface MergeRequestApprovals {
  approved_by: { user: { id: number; name?: string; username?: string; avatar_url?: string } }[];
  approvals_required?: number;
  approvals_left?: number;
}

interface MergeRequestCommit {
  id: string;
  committed_date: string;
  created_at: string;
}

interface MergeRequestNote {
  id: number;
  created_at: string;
  updated_at: string;
  system: boolean;
  author: { id: number };
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

interface GitLabCompare {
  diffs: MrChanges['changes'];
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

  private async send<T>(
    method: 'POST' | 'PUT',
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await net.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitLab API ${res.status}: ${path}${text ? ` - ${text}` : ''}`);
    }
    return res.json() as Promise<T>;
  }

  private async delete(path: string): Promise<void> {
    const res = await net.fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'PRIVATE-TOKEN': this.token },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitLab API ${res.status}: ${path}${text ? ` - ${text}` : ''}`);
    }
  }

  getCurrentUser(): Promise<GitLabUser> {
    return this.get('/user');
  }

  private latestByDate<T>(items: T[], dateOf: (item: T) => string | undefined): T | null {
    return items.reduce<T | null>((latest, item) => {
      const itemTime = Date.parse(dateOf(item) ?? '');
      if (!Number.isFinite(itemTime)) return latest;
      if (!latest) return item;
      return itemTime > Date.parse(dateOf(latest) ?? '') ? item : latest;
    }, null);
  }

  private async getReviewActivity(mr: MergeRequest): Promise<Pick<MergeRequest, 'review_activity_at' | 'review_activity_key' | 'review_activity_kind'>> {
    const [commitsResult, notesResult] = await Promise.allSettled([
      this.get<MergeRequestCommit[]>(`/projects/${mr.project_id}/merge_requests/${mr.iid}/commits`, { per_page: 100 }),
      this.get<MergeRequestNote[]>(`/projects/${mr.project_id}/merge_requests/${mr.iid}/notes`, {
        per_page: 100,
        sort: 'desc',
        order_by: 'updated_at',
      }),
    ]);

    if (commitsResult.status === 'rejected') {
      console.warn(`Failed to fetch commits for MR ${mr.project_id}!${mr.iid}:`, commitsResult.reason);
    }
    if (notesResult.status === 'rejected') {
      console.warn(`Failed to fetch notes for MR ${mr.project_id}!${mr.iid}:`, notesResult.reason);
    }

    const latestCommit = commitsResult.status === 'fulfilled'
      ? this.latestByDate(commitsResult.value, commit => commit.committed_date ?? commit.created_at)
      : null;
    const latestAuthorNote = notesResult.status === 'fulfilled'
      ? this.latestByDate(
          notesResult.value.filter(note => !note.system && note.author?.id === mr.author.id),
          note => note.updated_at ?? note.created_at
        )
      : null;

    const commitAt = latestCommit?.committed_date ?? latestCommit?.created_at;
    const noteAt = latestAuthorNote?.updated_at ?? latestAuthorNote?.created_at;
    const commitTime = Date.parse(commitAt ?? '');
    const noteTime = Date.parse(noteAt ?? '');

    if (latestCommit && Number.isFinite(commitTime) && (!Number.isFinite(noteTime) || commitTime >= noteTime)) {
      return {
        review_activity_at: commitAt,
        review_activity_key: `commit:${latestCommit.id}`,
        review_activity_kind: 'commit',
      };
    }

    if (latestAuthorNote && Number.isFinite(noteTime)) {
      return {
        review_activity_at: noteAt,
        review_activity_key: `author-comment:${latestAuthorNote.id}:${noteAt}`,
        review_activity_kind: 'author_comment',
      };
    }

    return {
      review_activity_at: mr.created_at,
      review_activity_key: `created:${mr.id}:${mr.created_at}`,
      review_activity_kind: 'created',
    };
  }

  private async withReviewInfo(mrs: MergeRequest[]): Promise<MergeRequest[]> {
    return Promise.all(mrs.map(async (mr) => {
      let approved_by = mr.approved_by ?? [];
      let approvals_required = mr.approvals_required;
      let approvals_left = mr.approvals_left;
      let activity: Pick<MergeRequest, 'review_activity_at' | 'review_activity_key' | 'review_activity_kind'> = {
        review_activity_at: mr.created_at,
        review_activity_key: mr.sha ? `commit:${mr.sha}` : `created:${mr.id}:${mr.created_at}`,
        review_activity_kind: mr.sha ? 'commit' : 'created',
      };

      try {
        const approvals = await this.get<MergeRequestApprovals>(
          `/projects/${mr.project_id}/merge_requests/${mr.iid}/approvals`
        );
        approved_by = approvals.approved_by ?? [];
        approvals_required = approvals.approvals_required;
        approvals_left = approvals.approvals_left;
      } catch (err) {
        console.warn(`Failed to fetch approvals for MR ${mr.project_id}!${mr.iid}:`, err);
      }

      try {
        activity = await this.getReviewActivity(mr);
      } catch (err) {
        console.warn(`Failed to derive review activity for MR ${mr.project_id}!${mr.iid}:`, err);
      }

      return { ...mr, approved_by, approvals_required, approvals_left, ...activity };
    }));
  }

  async getMrsToReview(userId: number): Promise<MergeRequest[]> {
    const mrs = await this.get<MergeRequest[]>('/merge_requests', {
      reviewer_id: userId,
      state: 'opened',
      scope: 'all',
      per_page: 50,
    });
    return this.withReviewInfo(mrs);
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
    return this.withReviewInfo(mrs);
  }

  getProject(projectId: number): Promise<GitLabProject> {
    return this.get(`/projects/${projectId}`);
  }

  getMrChanges(projectId: number, mrIid: number): Promise<MrChanges> {
    return this.get(`/projects/${projectId}/merge_requests/${mrIid}/changes`);
  }

  async getCompareChanges(projectId: number, fromSha: string, toSha: string): Promise<MrChanges> {
    const compare = await this.get<GitLabCompare>(`/projects/${projectId}/repository/compare`, {
      from: fromSha,
      to: toSha,
      straight: 'true',
    });
    return { changes: compare.diffs ?? [] };
  }

  getMrDiscussions(projectId: number, mrIid: number): Promise<GitLabDiscussion[]> {
    return this.get(`/projects/${projectId}/merge_requests/${mrIid}/discussions`, {
      per_page: 100,
    });
  }

  getMrDiscussion(projectId: number, mrIid: number, discussionId: string): Promise<GitLabDiscussion> {
    return this.get(`/projects/${projectId}/merge_requests/${mrIid}/discussions/${encodeURIComponent(discussionId)}`);
  }

  createMrComment(projectId: number, mrIid: number, body: string): Promise<GitLabDiscussion> {
    return this.send('POST', `/projects/${projectId}/merge_requests/${mrIid}/discussions`, { body });
  }

  createDiffComment(
    projectId: number,
    mrIid: number,
    position: DiffPosition,
    body: string
  ): Promise<GitLabDiscussion> {
    return this.send('POST', `/projects/${projectId}/merge_requests/${mrIid}/discussions`, {
      body,
      position,
    });
  }

  replyToDiscussion(
    projectId: number,
    mrIid: number,
    discussionId: string,
    body: string
  ): Promise<GitLabDiscussionNote> {
    return this.send(
      'POST',
      `/projects/${projectId}/merge_requests/${mrIid}/discussions/${discussionId}/notes`,
      { body }
    );
  }

  setDiscussionResolved(
    projectId: number,
    mrIid: number,
    discussionId: string,
    resolved: boolean
  ): Promise<GitLabDiscussion> {
    return this.send(
      'PUT',
      `/projects/${projectId}/merge_requests/${mrIid}/discussions/${discussionId}`,
      { resolved }
    );
  }

  updateDiscussionNote(
    projectId: number,
    mrIid: number,
    discussionId: string,
    noteId: number,
    body: string
  ): Promise<GitLabDiscussionNote> {
    return this.updateMergeRequestComment(projectId, mrIid, discussionId, noteId, body);
  }

  private updateDiscussionNoteById(
    projectId: number,
    mrIid: number,
    discussionId: string,
    noteId: number,
    body: string
  ): Promise<GitLabDiscussionNote> {
    return this.send(
      'PUT',
      `/projects/${projectId}/merge_requests/${mrIid}/discussions/${encodeURIComponent(discussionId)}/notes/${noteId}`,
      { body }
    );
  }

  private updateMergeRequestNote(projectId: number, mrIid: number, noteId: number, body: string): Promise<GitLabDiscussionNote> {
    return this.send('PUT', `/projects/${projectId}/merge_requests/${mrIid}/notes/${noteId}`, { body });
  }

  private async updateMergeRequestComment(
    projectId: number,
    mrIid: number,
    discussionId: string,
    noteId: number,
    body: string
  ): Promise<GitLabDiscussionNote> {
    const discussion = await this.getMrDiscussion(projectId, mrIid, discussionId);
    const note = discussion.notes.find(item => item.id === noteId);
    if (!note) throw new Error(`GitLab discussion ${discussionId} does not contain note ${noteId}`);

    if (note.type === null) {
      return this.updateMergeRequestNote(projectId, mrIid, noteId, body);
    }

    return this.updateDiscussionNoteById(projectId, mrIid, discussionId, noteId, body);
  }

  deleteDiscussionNote(projectId: number, mrIid: number, discussionId: string, noteId: number): Promise<void> {
    return this.deleteMergeRequestComment(projectId, mrIid, discussionId, noteId);
  }

  private deleteDiscussionNoteById(projectId: number, mrIid: number, discussionId: string, noteId: number): Promise<void> {
    return this.delete(`/projects/${projectId}/merge_requests/${mrIid}/discussions/${encodeURIComponent(discussionId)}/notes/${noteId}`);
  }

  private deleteMergeRequestNote(projectId: number, mrIid: number, noteId: number): Promise<void> {
    return this.delete(`/projects/${projectId}/merge_requests/${mrIid}/notes/${noteId}`);
  }

  private async deleteMergeRequestComment(projectId: number, mrIid: number, discussionId: string, noteId: number): Promise<void> {
    const discussion = await this.getMrDiscussion(projectId, mrIid, discussionId);
    const note = discussion.notes.find(item => item.id === noteId);
    if (!note) throw new Error(`GitLab discussion ${discussionId} does not contain note ${noteId}`);

    if (note.type === null) {
      await this.deleteMergeRequestNote(projectId, mrIid, noteId);
      return;
    }

    await this.deleteDiscussionNoteById(projectId, mrIid, discussionId, noteId);
  }

  async getLatestMrVersion(projectId: number, mrIid: number): Promise<MergeRequestVersion | null> {
    const versions = await this.get<MergeRequestVersion[]>(
      `/projects/${projectId}/merge_requests/${mrIid}/versions`,
      { per_page: 20 }
    );
    return versions
      .filter(version => version.base_commit_sha && version.start_commit_sha && version.head_commit_sha)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
  }

  async approveMr(projectId: number, mrIid: number): Promise<void> {
    const url = `${this.baseUrl}/projects/${projectId}/merge_requests/${mrIid}/approve`;
    const res = await net.fetch(url, {
      method: 'POST',
      headers: { 'PRIVATE-TOKEN': this.token },
    });
    if (!res.ok) throw new Error(`GitLab API ${res.status}: approve MR`);
  }

  async unapproveMr(projectId: number, mrIid: number): Promise<void> {
    const url = `${this.baseUrl}/projects/${projectId}/merge_requests/${mrIid}/unapprove`;
    const res = await net.fetch(url, {
      method: 'POST',
      headers: { 'PRIVATE-TOKEN': this.token },
    });
    if (!res.ok) throw new Error(`GitLab API ${res.status}: unapprove MR`);
  }
}
