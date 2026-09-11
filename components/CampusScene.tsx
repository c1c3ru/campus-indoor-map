"use client";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, Html, useGLTF } from '@react-three/drei';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import rooms from '../data/rooms.json';

const MODEL = '/models/campus-test.glb';
const areas = { administracao: 'Administração · térreo', biblioteca: 'Biblioteca e Auditório · térreo', complementar: 'Administração · recortes 04/05' };
type Area = keyof typeof areas;
const known = new Set(rooms.map(room => room.id));
type Selection = { id: string | null; revision: number };
class MapError extends Component<{ children: ReactNode }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 render() { return this.state.failed ? <p role="alert">Não foi possível abrir o mapa 3D. Verifique o suporte WebGL e recarregue a página.</p> : this.props.children; }
}

function Building({ selection, area, onSelect, onHover, onReady, onFocused }: {
 selection: Selection; area: Area; onSelect: (id: string) => void; onHover: (id: string | null) => void;
 onReady: () => void; onFocused: (id: string) => void;
}) {
 const { scene } = useGLTF(MODEL);
 const controls = useRef<CameraControls>(null);
 const invalidate = useThree(state => state.invalidate);
 const viewport = useThree(state => state.size);
 const [hovered, setHovered] = useState<string | null>(null);
 const parts = useMemo(() => {
  scene.updateMatrixWorld(true);
  const result: { mesh: Mesh; matrix: Matrix4; id?: string; center: Vector3; bounds: Box3 }[] = [];
  scene.traverse(object => {
   if (!(object instanceof Mesh) || object.userData.area !== area) return;
   const bounds = new Box3().setFromObject(object);
   result.push({ mesh: object, matrix: object.matrixWorld.clone(), id: object.userData.roomId,
    center: bounds.getCenter(new Vector3()), bounds });
  });
  return result;
 }, [scene, area]);
 useEffect(() => { onReady(); }, [onReady]);
 useEffect(() => {
  const camera = controls.current;
  if (!camera) return;
  let cancelled = false;
  const room = parts.find(part => part.id === selection.id);
  const bounds = room?.bounds ?? parts.reduce((box, part) => box.union(part.bounds), new Box3());
  const target = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const distance = Math.max(size.x / Math.min(viewport.width / viewport.height, 1.5), size.z) * (room ? 2 : 1.8);
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  onFocused('');
  void camera.setLookAt(target.x + distance * .55, target.y + distance, target.z + distance,
   target.x, target.y, target.z, animate).then(() => { if (!cancelled) onFocused(selection.id ?? 'overview'); });
  invalidate();
  return () => { cancelled = true; };
 }, [selection, parts, scene, invalidate, onFocused, viewport.width, viewport.height]);
 return <>
  <CameraControls ref={controls} makeDefault minDistance={4} maxDistance={300} maxPolarAngle={Math.PI / 2.1} />
  {parts.map(({ mesh, matrix, id, center }) => {
   const room = rooms.find(room => room.id === id);
   const active = Boolean(id && (hovered === id || selection.id === id));
   return <group key={mesh.uuid}>
    <mesh geometry={mesh.geometry} matrix={matrix} matrixAutoUpdate={false}
     onPointerOver={room ? event => { event.stopPropagation(); setHovered(id!); onHover(id!); } : undefined}
     onPointerOut={room ? () => { setHovered(null); onHover(null); } : undefined}
     onClick={room ? event => { event.stopPropagation(); onSelect(id!); } : undefined}>
     <meshStandardMaterial color={room ? active ? '#ffd166' : room.color : mesh.name === 'ground' ? '#dde7ed' : '#f5f8fa'} roughness={.9} />
    </mesh>
    {room && <Html position={[center.x, 1.8, center.z]} center distanceFactor={35} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
     <span className={`room-label ${active ? 'active' : ''}`}>{room.name}</span>
    </Html>}
   </group>;
  })}
 </>;
}

export default function CampusScene() {
 const [area, setArea] = useState<Area>('administracao');
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
   if (local && known.has(local)) setArea(rooms.find(room => room.id === local)!.area as Area);
   setInvalid(Boolean(local && !known.has(local)));
   setSelection(previous => ({ id: local && known.has(local) ? local : null, revision: previous.revision + 1 }));
  };
  sync(); window.addEventListener('popstate', sync);
  return () => window.removeEventListener('popstate', sync);
 }, []);
 const select = (id: string | null) => {
  if (id) setArea(rooms.find(room => room.id === id)!.area as Area);
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('local', id); else url.searchParams.delete('local');
  window.history.pushState(null, '', url);
  setInvalid(false); setSelection(previous => ({ id, revision: previous.revision + 1 }));
 };
 return <section className="map-layout">
  <aside><label htmlFor="area">Área da planta</label><select id="area" value={area} onChange={event => { setArea(event.target.value as Area); select(null); }} >{Object.entries(areas).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><h2>Setores</h2><p>Escolha uma sala para aproximar.</p>
   <nav aria-label="Setores do campus">{rooms.filter(room => room.area === area).map(room => <button key={room.id} aria-pressed={selection.id === room.id} onClick={() => select(room.id)}>{room.name}</button>)}</nav>
   <button className="overview" onClick={() => select(null)}>Visão geral</button>
   <p className="note">{area === 'complementar' ? 'Recortes 04/05: pavimento e ligação com o térreo a confirmar. ' : ''}Planta demonstrativa, com dimensões aproximadas. O link indica o setor selecionado, sem rastrear sua posição.</p>
  </aside>
  <div className="map-panel" data-ready={ready} data-focused={focused} data-hovered={hovered ?? ''} style={{ cursor: hovered ? 'pointer' : 'grab' }}>
   <MapError><Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [25, 35, 35], fov: 45, near: .1, far: 600 }}
    gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<p role="alert">WebGL indisponível neste dispositivo.</p>}>
    <color attach="background" args={['#edf2f6']} />
    <ambientLight intensity={1.5} /><directionalLight position={[10, 20, 10]} intensity={2} />
    <Suspense fallback={<Html center><span role="status">Carregando planta…</span></Html>}>
     <Building selection={selection} area={area} onSelect={select} onHover={setHovered} onReady={markReady} onFocused={setFocused} />
    </Suspense>
   </Canvas></MapError>
   <div className="map-help">Arraste para girar · Role para aproximar</div>
  </div>
  <p className="selection-status" role="status">{invalid ? 'Setor não encontrado. Exibindo a visão geral.' : selection.id ? `Setor selecionado: ${rooms.find(room => room.id === selection.id)?.name}` : 'Visão geral da área selecionada'}</p>
 </section>;
}
