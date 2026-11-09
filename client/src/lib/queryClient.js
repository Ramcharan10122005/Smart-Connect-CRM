import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute fresh
      gcTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Standard Query-Key Hierarchy Convention
 */
export const queryKeys = {
  auth: {
    all: ['auth'],
    me: () => ['auth', 'me'],
  },
  users: {
    all: ['users'],
    list: (params) => ['users', 'list', params],
    detail: (id) => ['users', 'detail', id],
  },
  contacts: {
    all: ['contacts'],
    list: (params) => ['contacts', 'list', params],
    detail: (id) => ['contacts', 'detail', id],
    overview: (id) => ['contacts', 'overview', id],
  },
  companies: {
    all: ['companies'],
    list: (params) => ['companies', 'list', params],
    detail: (id) => ['companies', 'detail', id],
    overview: (id) => ['companies', 'overview', id],
  },
  leads: {
    all: ['leads'],
    list: (params) => ['leads', 'list', params],
    board: (params) => ['leads', 'board', params],
    detail: (id) => ['leads', 'detail', id],
  },
  pipelineStages: {
    all: ['pipelineStages'],
  },
  leadSources: {
    all: ['leadSources'],
  },
  tags: {
    all: ['tags'],
  },
  activities: {
    all: ['activities'],
    list: (params) => ['activities', 'list', params],
    timeline: (params) => ['activities', 'timeline', params],
  },
  followUps: {
    all: ['followUps'],
    list: (params) => ['followUps', 'list', params],
    summary: () => ['followUps', 'summary'],
  },
  notifications: {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
    unreadCount: () => ['notifications', 'unreadCount'],
  },
  dashboard: {
    summary: (params) => ['dashboard', 'summary', params],
    charts: (params) => ['dashboard', 'charts', params],
    leaderboard: () => ['dashboard', 'leaderboard'],
    upcoming: (params) => ['dashboard', 'upcoming', params],
  },
  reports: {
    detail: (type, params) => ['reports', type, params],
  },
  search: {
    query: (q) => ['search', q],
  },
};

export default queryClient;
