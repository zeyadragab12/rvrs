import { useQuery } from "@tanstack/react-query";
import { stampsFor } from "./loyalty-rules";
import { useSession } from "./session";
import { supabase } from "./supabase";

type Progress = { completed: number; in_progress: number; reward_pending: boolean; reward_cap: number };

export function useLoyalty() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["loyalty", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<Progress> => {
      const { data, error } = await supabase.rpc("my_loyalty");
      if (error) throw new Error(error.message);
      return data as Progress;
    },
  });
  const progress = stampsFor(q.data?.completed ?? 0);
  const rewardPending = q.data?.reward_pending ?? false;
  return {
    signedIn: !!user,
    loading: !!user && q.isPending,
    stamps: progress.stamps,
    remaining: progress.remaining,
    /** Orders placed but not completed yet. Each shows as a pending stamp, capped to the empty slots left on the card. */
    pending: Math.min(q.data?.in_progress ?? 0, progress.remaining),
    refetch: q.refetch,
    /** Ten stamps collected, whether or not the reward is already on an open order. */
    unlocked: progress.ready,
    rewardPending,
    /** Reward can be used on the next order. */
    ready: progress.ready && !rewardPending,
    cap: q.data?.reward_cap ?? 0,
  };
}
