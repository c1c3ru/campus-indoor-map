"use client";
import { blocos, findBloco, andarLabel, type Andar } from '../data/blocks';
import { useMapStore } from '../store/useMapStore';

export default function MapHud() {
 const blocoAtivo = useMapStore(state => state.blocoAtivo);
 const andarAtivo = useMapStore(state => state.andarAtivo);
 const setBloco = useMapStore(state => state.setBloco);
 const setAndar = useMapStore(state => state.setAndar);
 const andares = findBloco(blocoAtivo)?.andares ?? ['terreo'];
 return <div className="map-hud">
  {andares.length > 1 && <div className="hud-card floor-toggle" role="group" aria-label="Selecionar andar">
   {andares.map(andar => <button key={andar} type="button" className="pill" aria-pressed={andar === andarAtivo} onClick={() => setAndar(andar as Andar)}>{andarLabel[andar]}</button>)}
  </div>}
  <div className="hud-card" role="group" aria-label="Selecionar bloco">
   {blocos.map(bloco => <button key={bloco.id} type="button" className="pill" aria-pressed={bloco.id === blocoAtivo} onClick={() => setBloco(bloco.id)}>{bloco.nome}</button>)}
  </div>
 </div>;
}
