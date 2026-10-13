import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "rvrs-branch-v1";

type Ctx = {
  /** The branch the customer picked, or null if they have not picked one yet. */
  selectedId: string | null;
  /** False until the saved choice has been read from storage. */
  loaded: boolean;
  select: (id: string) => void;
};

const BranchSelectionContext = createContext<Ctx | null>(null);

/** Remembers which branch the customer orders from. Kept separate from the branch list so the two never import each other. */
export function BranchSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((id) => setSelectedId(id))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({ selectedId, loaded, select }), [selectedId, loaded, select]);
  return <BranchSelectionContext.Provider value={value}>{children}</BranchSelectionContext.Provider>;
}

export function useBranchSelection() {
  const ctx = useContext(BranchSelectionContext);
  if (!ctx) throw new Error("useBranchSelection must be used inside BranchSelectionProvider");
  return ctx;
}
