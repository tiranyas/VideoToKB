'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getWorkspaces, createWorkspace as createWs,
  getActiveWorkspaceId, setActiveWorkspaceId,
} from '@/lib/supabase/queries';
import type { Workspace } from '@/types';

const LS_KEY = 'kbify-active-workspace-id';

interface WorkspaceContextValue {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<string>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: null,
  workspaces: [],
  isLoading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => '',
  refreshWorkspaces: async () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'workspace';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    setUserId(user.id);

    let wsList = await getWorkspaces(supabase, user.id);

    // Auto-create default workspace for new users
    if (wsList.length === 0) {
      const id = await createWs(supabase, user.id, { name: 'Default', slug: 'default' });
      await setActiveWorkspaceId(supabase, user.id, id);
      wsList = await getWorkspaces(supabase, user.id);
    }

    setWorkspaces(wsList);

    // Determine active workspace: localStorage → DB → first workspace
    const lsId = localStorage.getItem(LS_KEY);
    let resolvedId = lsId && wsList.some(w => w.id === lsId) ? lsId : null;

    if (!resolvedId) {
      const dbId = await getActiveWorkspaceId(supabase, user.id);
      resolvedId = dbId && wsList.some(w => w.id === dbId) ? dbId : null;
    }

    if (!resolvedId) {
      resolvedId = wsList[0].id;
    }

    setActiveId(resolvedId);
    localStorage.setItem(LS_KEY, resolvedId);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(LS_KEY, id);
    if (userId) {
      setActiveWorkspaceId(supabase, userId, id).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreateWorkspace = useCallback(async (name: string): Promise<string> => {
    if (!userId) throw new Error('Not authenticated');
    const slug = slugify(name);
    const id = await createWs(supabase, userId, { name, slug });
    await setActiveWorkspaceId(supabase, userId, id);
    const wsList = await getWorkspaces(supabase, userId);
    setWorkspaces(wsList);
    setActiveId(id);
    localStorage.setItem(LS_KEY, id);
    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const activeWorkspace = workspaces.find(w => w.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        isLoading,
        switchWorkspace,
        createWorkspace: handleCreateWorkspace,
        refreshWorkspaces: loadWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
