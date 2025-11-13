"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type {
  UserTier,
  WorkspaceArtefact,
  WorkspaceMessage,
} from "@/types/workspace";

interface ExperienceState {
  userTier: UserTier;
  freeProjectLimit: number;
  createdProjects: string[];
  chatByProject: Record<string, WorkspaceMessage[]>;
  uploadsByProject: Record<string, number>;
  artefactsByProject: Record<string, WorkspaceArtefact[]>;
  toolUsageByProject: Record<string, Record<string, number>>;
  sourceContextByProject: Record<string, string[]>;
}

interface ExperienceContextValue {
  state: ExperienceState & {
    remainingProjects: number;
    documentLimit: number;
  };
  setUserTier: (tier: UserTier) => void;
  canStartProject: (projectId: string) => {
    allowed: boolean;
    remaining: number;
    alreadyTracked: boolean;
  };
  trackProjectCreation: (projectId: string, messages?: WorkspaceMessage[]) => void;
  saveChatHistory: (projectId: string, messages: WorkspaceMessage[]) => void;
  getChatHistory: (projectId: string) => WorkspaceMessage[];
  getUploadUsage: (projectId: string) => { used: number; limit: number };
  recordUpload: (projectId: string, amount: number) => void;
  addArtefact: (projectId: string, artefact: WorkspaceArtefact) => void;
  getArtefacts: (projectId: string) => WorkspaceArtefact[];
  recordToolUsage: (
    projectId: string,
    toolId: string
  ) => { allowed: boolean; usage: number; limit: number };
  appendSourceContext: (projectId: string, value: string) => void;
  getSourceContext: (projectId: string) => string[];
}

const storageKey = "plannera-experience";

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

const defaultState: ExperienceState = {
  userTier: "anonymous",
  freeProjectLimit: 1,
  createdProjects: [],
  chatByProject: {},
  uploadsByProject: {},
  artefactsByProject: {},
  toolUsageByProject: {},
  sourceContextByProject: {},
};

const documentLimitMap: Record<UserTier, number> = {
  anonymous: 0,
  free: 5,
  pro: 50,
};

const toolUsageLimit: Record<UserTier, number> = {
  anonymous: 0,
  free: 3,
  pro: 50,
};

export function ExperienceProvider({ children, initialTier }: { children: ReactNode; initialTier: UserTier }) {
  const [state, setState] = useState<ExperienceState>({ ...defaultState, userTier: initialTier });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ExperienceState;
        setState((previous) => ({ ...previous, ...parsed, userTier: initialTier }));
      } else {
        setState((previous) => ({ ...previous, userTier: initialTier }));
      }
    } catch (error) {
      console.error("Failed to hydrate experience state", error);
      setState((previous) => ({ ...previous, userTier: initialTier }));
    } finally {
      setIsHydrated(true);
    }
  }, [initialTier]);

  const setUserTier = useCallback((tier: UserTier) => {
    setState((previous) => ({ ...previous, userTier: tier }));
  }, []);

  const canStartProject = useCallback(
    (projectId: string) => {
      const alreadyTracked = state.createdProjects.includes(projectId);
      const remaining = Math.max(state.freeProjectLimit - state.createdProjects.length, 0);
      if (alreadyTracked) {
        return { allowed: true, remaining, alreadyTracked: true };
      }
      if (state.userTier === "anonymous" && remaining <= 0) {
        return { allowed: false, remaining: 0, alreadyTracked: false };
      }
      return { allowed: true, remaining, alreadyTracked: false };
    },
    [state.createdProjects, state.freeProjectLimit, state.userTier]
  );

  const trackProjectCreation = useCallback((projectId: string, messages?: WorkspaceMessage[]) => {
    setState((previous) => {
      const alreadyTracked = previous.createdProjects.includes(projectId);
      const nextCreatedProjects = alreadyTracked
        ? previous.createdProjects
        : [...previous.createdProjects, projectId];
      const chatByProject = messages
        ? { ...previous.chatByProject, [projectId]: messages }
        : previous.chatByProject;
      return {
        ...previous,
        createdProjects: nextCreatedProjects,
        chatByProject,
      };
    });
  }, []);

  const saveChatHistory = useCallback((projectId: string, messages: WorkspaceMessage[]) => {
    setState((previous) => ({
      ...previous,
      chatByProject: {
        ...previous.chatByProject,
        [projectId]: messages,
      },
    }));
  }, []);

  const getChatHistory = useCallback(
    (projectId: string) => state.chatByProject[projectId] ?? [],
    [state.chatByProject]
  );

  const getUploadUsage = useCallback(
    (projectId: string) => ({ used: state.uploadsByProject[projectId] ?? 0, limit: documentLimitMap[state.userTier] }),
    [state.uploadsByProject, state.userTier]
  );

  const recordUpload = useCallback((projectId: string, amount: number) => {
    setState((previous) => ({
      ...previous,
      uploadsByProject: {
        ...previous.uploadsByProject,
        [projectId]: (previous.uploadsByProject[projectId] ?? 0) + amount,
      },
    }));
  }, []);

  const addArtefact = useCallback((projectId: string, artefact: WorkspaceArtefact) => {
    setState((previous) => ({
      ...previous,
      artefactsByProject: {
        ...previous.artefactsByProject,
        [projectId]: [...(previous.artefactsByProject[projectId] ?? []), artefact],
      },
    }));
  }, []);

  const getArtefacts = useCallback(
    (projectId: string) => state.artefactsByProject[projectId] ?? [],
    [state.artefactsByProject]
  );

  const recordToolUsage = useCallback(
    (projectId: string, toolId: string) => {
      const limit = toolUsageLimit[state.userTier];
      const usage = state.toolUsageByProject[projectId]?.[toolId] ?? 0;
      if (limit > 0 && usage >= limit && state.userTier !== "pro") {
        return { allowed: false, usage, limit };
      }
      if (state.userTier === "anonymous" && limit === 0) {
        return { allowed: false, usage, limit };
      }
      setState((previous) => ({
        ...previous,
        toolUsageByProject: {
          ...previous.toolUsageByProject,
          [projectId]: {
            ...(previous.toolUsageByProject[projectId] ?? {}),
            [toolId]: (previous.toolUsageByProject[projectId]?.[toolId] ?? 0) + 1,
          },
        },
      }));
      return { allowed: true, usage: usage + 1, limit };
    },
    [state.toolUsageByProject, state.userTier]
  );

  const appendSourceContext = useCallback((projectId: string, value: string) => {
    setState((previous) => ({
      ...previous,
      sourceContextByProject: {
        ...previous.sourceContextByProject,
        [projectId]: [...(previous.sourceContextByProject[projectId] ?? []), value],
      },
    }));
  }, []);

  const getSourceContext = useCallback(
    (projectId: string) => state.sourceContextByProject[projectId] ?? [],
    [state.sourceContextByProject]
  );

  const contextValue = useMemo<ExperienceContextValue>(() => {
    const remainingProjects = Math.max(state.freeProjectLimit - state.createdProjects.length, 0);
    return {
      state: {
        ...state,
        remainingProjects,
        documentLimit: documentLimitMap[state.userTier],
      },
      setUserTier,
      canStartProject,
      trackProjectCreation,
      saveChatHistory,
      getChatHistory,
      getUploadUsage,
      recordUpload,
      addArtefact,
      getArtefacts,
      recordToolUsage,
      appendSourceContext,
      getSourceContext,
    };
  }, [
    addArtefact,
    appendSourceContext,
    canStartProject,
    getArtefacts,
    getChatHistory,
    getSourceContext,
    getUploadUsage,
    recordToolUsage,
    recordUpload,
    saveChatHistory,
    setUserTier,
    state,
    trackProjectCreation,
  ]);

  return <ExperienceContext.Provider value={contextValue}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience must be used within ExperienceProvider");
  }
  return context;
}
