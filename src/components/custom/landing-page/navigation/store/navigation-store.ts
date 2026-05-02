import { create } from "zustand";

interface NavigationStoreState {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  scrolled: boolean;
  setScrolled: (scrolled: boolean) => void;
  pendingHash: string | undefined;
  setPendingHash: (hash: string | undefined) => void;
}

export const useNavigationStore = create<NavigationStoreState>((set) => ({
  menuOpen: false,
  pendingHash: undefined,
  scrolled: false,
  searchOpen: false,
  setMenuOpen: (menuOpen) => {
    set({ menuOpen });
  },
  setPendingHash: (pendingHash) => {
    set({ pendingHash });
  },
  setScrolled: (scrolled) => {
    set({ scrolled });
  },
  setSearchOpen: (searchOpen) => {
    set({ searchOpen });
  }
}));
