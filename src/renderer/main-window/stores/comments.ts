import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import type { DiffPosition, GitLabDiscussion, MergeRequestVersion, MR } from '../../types';

interface CommentsState {
  discussions: GitLabDiscussion[];
  loading: boolean;
  posting: boolean;
  error: string;
  version: MergeRequestVersion | null;
}

function keyFor(projectId: number, mrIid: number): string {
  return `${projectId}:${mrIid}`;
}

function emptyState(): CommentsState {
  return {
    discussions: [],
    loading: false,
    posting: false,
    error: '',
    version: null,
  };
}

export const useCommentsStore = defineStore('comments', () => {
  const byMr = reactive<Record<string, CommentsState>>({});

  function stateFor(projectId: number, mrIid: number): CommentsState {
    const key = keyFor(projectId, mrIid);
    if (!byMr[key]) byMr[key] = emptyState();
    return byMr[key];
  }

  function getState(mr: MR | null): CommentsState {
    if (!mr) return emptyState();
    return stateFor(mr.project_id, mr.iid);
  }

  async function load(mr: MR, force = false): Promise<GitLabDiscussion[]> {
    const state = stateFor(mr.project_id, mr.iid);
    if (!force && state.discussions.length > 0) return state.discussions;

    state.loading = true;
    state.error = '';
    try {
      state.discussions = await window.api.getMrDiscussions(mr.project_id, mr.iid);
      return state.discussions;
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.loading = false;
    }
  }

  async function refresh(mr: MR): Promise<void> {
    await load(mr, true);
  }

  async function ensureVersion(mr: MR): Promise<MergeRequestVersion> {
    const state = stateFor(mr.project_id, mr.iid);
    const cached = state.version;
    if (cached && cached.head_commit_sha === mr.sha) return cached;

    const version = await window.api.getLatestMrVersion(mr.project_id, mr.iid);
    if (!version) throw new Error('GitLab did not return an MR diff version for inline comments.');

    state.version = version;
    return state.version;
  }

  async function createMrComment(mr: MR, body: string): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.posting = true;
    state.error = '';
    try {
      await window.api.createMrComment(mr.project_id, mr.iid, body);
      await refresh(mr);
      void window.api.forcePoll();
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.posting = false;
    }
  }

  async function createDiffComment(mr: MR, linePosition: Omit<DiffPosition, 'base_sha' | 'start_sha' | 'head_sha' | 'position_type'>, body: string): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.posting = true;
    state.error = '';
    try {
      const version = await ensureVersion(mr);
      const position: DiffPosition = {
        ...linePosition,
        position_type: 'text',
        base_sha: version.base_commit_sha,
        start_sha: version.start_commit_sha,
        head_sha: version.head_commit_sha,
      };
      await window.api.createDiffComment(mr.project_id, mr.iid, position, body);
      await refresh(mr);
      void window.api.forcePoll();
    } catch (err) {
      state.version = null;
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.posting = false;
    }
  }

  async function replyToDiscussion(mr: MR, discussionId: string, body: string): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.posting = true;
    state.error = '';
    try {
      await window.api.replyToDiscussion(mr.project_id, mr.iid, discussionId, body);
      await refresh(mr);
      void window.api.forcePoll();
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.posting = false;
    }
  }

  async function setResolved(mr: MR, discussionId: string, resolved: boolean): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.error = '';
    try {
      await window.api.setDiscussionResolved(mr.project_id, mr.iid, discussionId, resolved);
      await refresh(mr);
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async function updateComment(mr: MR, discussionId: string, noteId: number, body: string): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.posting = true;
    state.error = '';
    try {
      await window.api.updateComment(mr.project_id, mr.iid, discussionId, noteId, body);
      await refresh(mr);
      void window.api.forcePoll();
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.posting = false;
    }
  }

  async function deleteComment(mr: MR, discussionId: string, noteId: number): Promise<void> {
    const state = stateFor(mr.project_id, mr.iid);
    state.posting = true;
    state.error = '';
    try {
      await window.api.deleteComment(mr.project_id, mr.iid, discussionId, noteId);
      await refresh(mr);
      void window.api.forcePoll();
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      state.posting = false;
    }
  }

  const states = computed(() => byMr);

  return {
    states,
    getState,
    load,
    refresh,
    ensureVersion,
    createMrComment,
    createDiffComment,
    replyToDiscussion,
    setResolved,
    updateComment,
    deleteComment,
  };
});
