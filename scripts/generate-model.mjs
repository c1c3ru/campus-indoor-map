import { BoxGeometry } from 'three';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const rooms = JSON.parse(readFileSync(new URL('../data/rooms.json', import.meta.url)));
const geometry = new BoxGeometry(1,1,1);
const chunks = [geometry.attributes.position.array, geometry.attributes.normal.array, geometry.index.array].map(a => Buffer.from(a.buffer, a.byteOffset, a.byteLength));
let offset=0;
const views=chunks.map((chunk,i)=>{const view={buffer:0,byteOffset:offset,byteLength:chunk.length,target:i===2?34963:34962};offset+=chunk.length;return view;});
const nodes=[];
// Vertical gap between floor slabs; keeps a stacked upper floor clear of ground-floor walls.
const FLOOR_HEIGHT=3.4;
let bloco='administracao',andar='terreo';
function box(name,position,scale,roomId) { nodes.push({ name,mesh:0,translation:position,scale,extras:{bloco,andar,...(roomId?{roomId}:{})} }); }

// Floors are interactive; short walls leave the indoor spaces visible.
for(const room of rooms){bloco=room.bloco;andar=room.andar??'terreo'; const start=nodes.length; const [x,z]=room.center,[w,d]=room.size;
const y=andar==='andar1'?FLOOR_HEIGHT:0;
box(room.id,[x,y,z],[w,.22,d],room.id);
box(room.id+'-north',[x,y+.6,z-d/2],[w,1.2,.12]);
box(room.id+'-west',[x-w/2,y+.6,z],[.12,1.2,d]);
box(room.id+'-east',[x+w/2,y+.6,z],[.12,1.2,d]);
// South wall has a central doorway.
for(const sign of [-1,1])box(room.id+'-door-'+sign,[x+sign*(w/4+.4),y+.6,z+d/2],[w/2-.8,1.2,.12]);
for(const node of nodes.slice(start)) { const a=room.rotation; const dx=node.translation[0]-x,dz=node.translation[2]-z;
node.translation[0]=x+dx*Math.cos(a)+dz*Math.sin(a);node.translation[2]=z-dx*Math.sin(a)+dz*Math.cos(a);
node.rotation=[0,Math.sin(a/2),0,Math.cos(a/2)]; }
}
const gltf={asset:{version:'2.0',generator:'campus-indoor-map'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,
 meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2}]}],
 buffers:[{byteLength:offset}],bufferViews:views,accessors:[
 {bufferView:0,componentType:5126,count:24,type:'VEC3',min:[-.5,-.5,-.5],max:[.5,.5,.5]},
 {bufferView:1,componentType:5126,count:24,type:'VEC3'},
 {bufferView:2,componentType:5123,count:36,type:'SCALAR'}]};
let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const bin=Buffer.concat(chunks);const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);
function chunkHeader(length,type){const b=Buffer.alloc(8);b.writeUInt32LE(length);b.writeUInt32LE(type,4);return b;}
mkdirSync(new URL('../public/models/',import.meta.url),{recursive:true});
writeFileSync(new URL('../public/models/campus-test.glb',import.meta.url),Buffer.concat([header,chunkHeader(json.length,0x4e4f534a),json,chunkHeader(bin.length,0x004e4942),bin]));
geometry.dispose();
