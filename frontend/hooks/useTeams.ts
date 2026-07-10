import { useMutation, useQueryClient } from '@tanstack/react-query';

import { callFunction } from '@/lib/api';
import type { Team } from '@/types/types';

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      callFunction<{ team: Team }>('teams', { method: 'POST', body: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useJoinTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      callFunction<{ team: Team }>('teams/join', {
        method: 'POST',
        body: { inviteCode },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useLeaveTeam() {
  return useMutation({
    mutationFn: () =>
      callFunction<{ success: boolean }>('teams/leave', { method: 'POST' }),
  });
}

export function useDeleteTeam() {
  return useMutation({
    mutationFn: () =>
      callFunction<{ success: boolean }>('teams/delete', { method: 'POST' }),
  });
}
