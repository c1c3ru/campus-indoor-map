"use client";
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('./CampusScene'), { ssr: false, loading: () => <p role="status">Preparando mapa 3D…</p> });
/** Use this wrapper in Server Components; WebGL is loaded only in the browser. */
export default function CampusMap() { return <Map />; }
