"use client";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, Html, useGLTF } from '@react-three/drei';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import rooms from '../data/rooms.json';
import { blocos, findBloco, type Andar } from '../data/blocks';
import { useMapStore } from '../store/useMapStore';
import MapHud from './MapHud';

const MODEL = '/models/campus-test.glb';
const known = new Set(rooms.map(room => room.id));
type Selection = { id: string | null; revision: number };
class MapError extends Component<{ children: ReactNode }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 render() { return this.state.failed ? <p role="alert">Não foi possível abrir o mapa 3D. Verifique o suporte WebGL e recarregue a página.</p> : this.props.children; }
}

type Part = { mesh: Mesh; matrix: Matrix4; id?: string; andar: Andar; center: Vector3; bounds: Box3 };

function Building({ selection, bloco, andarAtivo, onSelect, onHover, onReady, onFocused }: {
 selection: Selection; bloco: string; andarAtivo: Andar; onSelect: (id: string) => void; onHover: (id: string | null) => void;
 onReady: () => void; onFocused: (id: string) => void;
}) {
 const { scene } = useGLTF(MODEL);
 const controls = useRef<CameraControls>(null);
 const invalidate = useThree(state => state.invalidate);
 const viewport = useThree(state => state.size);
 const [hovered, setHovered] = useState<string | null>(null);
 const hasAndar1 = findBloco(bloco)?.andares.includes('andar1') ?? false;
 // Only meshes belonging to the active block are traversed, keeping inactive blocks out of the render/camera cost entirely.
 const parts = useMemo(() => {
  scene.updateMatrixWorld(true);
  const result: Part[] = [];
  scene.traverse(object => {
   if (!(object instanceof Mesh) || object.userData.bloco !== bloco) return;
   const bounds = new Box3().setFromObject(object);
   result.push({ mesh: object, matrix: object.matrixWorld.clone(), id: object.userData.roomId,
    andar: (object.userData.andar as Andar) ?? 'terreo', center: bounds.getCenter(new Vector3()), bounds });
  });
  return result;
 }, [scene, bloco]);
 const terreoParts = useMemo(() => parts.filter(part => part.andar === 'terreo'), [parts]);
 const andar1Parts = useMemo(() => parts.filter(part => part.andar === 'andar1'), [parts]);
 const visibleParts = andarAtivo === 'andar1' && hasAndar1 ? andar1Parts : terreoParts;
 useEffect(() => { onReady(); }, [onReady]);
 useEffect(() => {
  const camera = controls.current;
  if (!camera) return;
  let cancelled = false;
  const room = visibleParts.find(part => part.id === selection.id);
  const bounds = room?.bounds ?? visibleParts.reduce((box, part) => box.union(part.bounds), new Box3());
  const target = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const distance = Math.max(size.x / Math.min(viewport.width / viewport.height, 1.5), size.z) * (room ? 2 : 1.8);
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  onFocused('');
  void camera.setLookAt(target.x + distance * .55, target.y + distance, target.z + distance,
   target.x, target.y, target.z, animate).then(() => { if (!cancelled) onFocused(selection.id ?? 'overview'); });
  invalidate();
  return () => { cancelled = true; };
 }, [selection, visibleParts, scene, invalidate, onFocused, viewport.width, viewport.height]);
 const renderParts = (list: Part[], interactive: boolean, ghost: boolean) => list.map(({ mesh, matrix, id, center }) => {
  const room = rooms.find(room => room.id === id);
  const active = Boolean(interactive && id && (hovered === id || selection.id === id));
  return <group key={mesh.uuid}>
   <mesh geometry={mesh.geometry} matrix={matrix} matrixAutoUpdate={false}
    onPointerOver={interactive && room ? event => { event.stopPropagation(); setHovered(id!); onHover(id!); } : undefined}
    onPointerOut={interactive && room ? () => { setHovered(null); onHover(null); } : undefined}
    onClick={interactive && room ? event => { event.stopPropagation(); onSelect(id!); } : undefined}>
    <meshStandardMaterial color={room ? active ? '#ffd166' : room.color : '#f5f8fa'} roughness={.9}
     wireframe={ghost} transparent={ghost} opacity={ghost ? .22 : 1} />
   </mesh>
   {room && interactive && <Html position={[center.x, center.y + 1.8, center.z]} center distanceFactor={35} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
    <span className={`room-label ${active ? 'active' : ''}`}>{room.name}</span>
   </Html>}
  </group>;
 });
 return <>
  <CameraControls ref={controls} makeDefault minDistance={4} maxDistance={300} maxPolarAngle={Math.PI / 2.1} />
  {/* Ground floor: interactive when active, or a dimmed wireframe reference when the 1st floor is in focus. */}
  <group visible={andarAtivo === 'terreo' || hasAndar1}>
   {renderParts(terreoParts, andarAtivo === 'terreo', andarAtivo === 'andar1' && hasAndar1)}
  </group>
  {hasAndar1 && <group visible={andarAtivo === 'andar1'}>{renderParts(andar1Parts, andarAtivo === 'andar1', false)}</group>}
 </>;
}

export default function CampusScene() {
 const blocoAtivo = useMapStore(state => state.blocoAtivo);
 const andarAtivo = useMapStore(state => state.andarAtivo);
 const setBloco = useMapStore(state => state.setBloco);
 const setAndar = useMapStore(state => state.setAndar);
 const [selection, setSelection] = useState<Selection>({ id: null, revision: 0 });
 const [invalid, setInvalid] = useState(false);
 const [hovered, setHovered] = useState<string | null>(null);
 const [ready, setReady] = useState(false);
 const [focused, setFocused] = useState('');
 // Stable callbacks avoid restarting camera transitions on loading/hover updates.
 const markReady = useMemo(() => () => setReady(true), []);
 useEffect(() => {
  const sync = () => {
   const local = new URLSearchParams(window.location.search).get('local');
   const room = local && known.has(local) ? rooms.find(room => room.id === local)! : null;
   if (room) { setBloco(room.bloco); setAndar(room.andar as Andar); }
   setInvalid(Boolean(local && !room));
   setSelection(previous => ({ id: room ? room.id : null, revision: previous.revision + 1 }));
  };
  sync(); window.addEventListener('popstate', sync);
  return () => window.removeEventListener('popstate', sync);
 }, [setBloco, setAndar]);
 const select = (id: string | null) => {
  if (id) { const room = rooms.find(room => room.id === id)!; setBloco(room.bloco); setAndar(room.andar as Andar); }
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('local', id); else url.searchParams.delete('local');
  window.history.pushState(null, '', url);
  setInvalid(false); setSelection(previous => ({ id, revision: previous.revision + 1 }));
 };
 // Switching block/floor from the HUD can leave a stale room selected elsewhere; drop it and clean the URL.
 useEffect(() => {
  const room = selection.id ? rooms.find(room => room.id === selection.id) : null;
  if (!selection.id || (room && room.bloco === blocoAtivo && room.andar === andarAtivo)) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('local');
  window.history.pushState(null, '', url);
  setInvalid(false); setSelection(previous => ({ id: null, revision: previous.revision + 1 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [blocoAtivo, andarAtivo]);
 return <section className="map-layout">
  <aside><label htmlFor="area">Bloco do campus</label><select id="area" value={blocoAtivo} onChange={event => setBloco(event.target.value)}>{blocos.map(bloco => <option key={bloco.id} value={bloco.id}>{bloco.nome}</option>)}</select><h2>Setores</h2><p>Escolha uma sala para aproximar.</p>
   <nav aria-label="Setores do campus">{rooms.filter(room => room.bloco === blocoAtivo && room.andar === andarAtivo).map(room => <button key={room.id} aria-pressed={selection.id === room.id} onClick={() => select(room.id)}>{room.name}</button>)}</nav>
   <button className="overview" onClick={() => select(null)}>Visão geral</button>
   <p className="note">{findBloco(blocoAtivo)?.nota ? findBloco(blocoAtivo)!.nota + ' ' : ''}Planta demonstrativa, com dimensões aproximadas. O link indica o setor selecionado, sem rastrear sua posição.</p>
  </aside>
  <div className="map-panel" data-ready={ready} data-focused={focused} data-hovered={hovered ?? ''} style={{ cursor: hovered ? 'pointer' : 'grab' }}>
   <MapError><Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [25, 35, 35], fov: 45, near: .1, far: 600 }}
    gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<p role="alert">WebGL indisponível neste dispositivo.</p>}>
    <color attach="background" args={['#edf2f6']} />
    <ambientLight intensity={1.5} /><directionalLight position={[10, 20, 10]} intensity={2} />
    <Suspense fallback={<Html center><span role="status">Carregando planta…</span></Html>}>
     <Building selection={selection} bloco={blocoAtivo} andarAtivo={andarAtivo} onSelect={select} onHover={setHovered} onReady={markReady} onFocused={setFocused} />
    </Suspense>
   </Canvas></MapError>
   <MapHud />
   <div className="map-help">Arraste para girar · Role para aproximar</div>
  </div>
  <p className="selection-status" role="status">{invalid ? 'Setor não encontrado. Exibindo a visão geral.' : selection.id ? `Setor selecionado: ${rooms.find(room => room.id === selection.id)?.name}` : 'Visão geral da área selecionada'}</p>
 </section>;
}
