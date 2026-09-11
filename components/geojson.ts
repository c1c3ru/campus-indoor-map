import { ExtrudeGeometry, Path, Shape } from 'three';
/** GeoJSON uses longitude/latitude; caller MUST supply projection to local X/Z units. */
export type RoomFeature = {
 type: 'Feature'; id?: string | number;
 properties: { roomId?: string; name?: string };
 geometry: { type: 'Polygon'; coordinates: number[][][] };
};
export function roomGeometryFromGeoJSON(feature: RoomFeature, project: (lng: number, lat: number) => [number, number], height = .22) {
 const roomId = feature.properties.roomId ?? String(feature.id ?? '');
 if (!roomId || !Number.isFinite(height) || height <= 0) throw new Error('roomId e altura positiva são obrigatórios.');
 const rings = feature.geometry.coordinates.map(ring => {
  if (ring.length < 4) throw new Error('Anel GeoJSON inválido.');
  return ring.map(([lng, lat]) => {
   const [x,z]=project(lng,lat);
   if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('Coordenadas inválidas.');
   return [x,-z] as const;
  });
 });
 if (!rings.length) throw new Error('Polígono vazio.');
 const shape=new Shape();
 rings.forEach((ring,index)=>{
  const path=index ? new Path() : shape;
  ring.forEach(([x,y],i)=> i ? path.lineTo(x,y) : path.moveTo(x,y));
  path.closePath(); if(index) shape.holes.push(path);
 });
 const geometry=new ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});
 geometry.rotateX(-Math.PI/2);
 return { geometry, userData: {roomId} };
}
