import { create } from 'zustand';
import { blocos, findBloco, type Andar } from '../data/blocks';

interface MapState {
  blocoAtivo: string;
  andarAtivo: Andar;
  setBloco: (bloco: string) => void;
  setAndar: (andar: Andar) => void;
}

const defaultAndar = (blocoId: string): Andar => findBloco(blocoId)?.andares[0] ?? 'terreo';

export const useMapStore = create<MapState>((set, get) => ({
  blocoAtivo: blocos[0].id,
  andarAtivo: 'terreo',
  setBloco: bloco => {
    if (bloco === get().blocoAtivo) return;
    const info = findBloco(bloco);
    const andar = info?.andares.includes(get().andarAtivo) ? get().andarAtivo : defaultAndar(bloco);
    set({ blocoAtivo: bloco, andarAtivo: andar });
  },
  setAndar: andar => {
    if (findBloco(get().blocoAtivo)?.andares.includes(andar)) set({ andarAtivo: andar });
  },
}));
