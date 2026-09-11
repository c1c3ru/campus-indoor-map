# Campus Indoor Map — IFCE Maracanaú

Componente base Next.js / React Three Fiber, com 47 setores derivados das plantas fornecidas. Geometria demonstrativa: não é levantamento arquitetônico e não deve orientar rotas de emergência.

## Executar

Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000/?local=suporte-ti`. Outros exemplos: `?local=auditorio`, `?local=diretoria` e `?local=controle-academico`.

```sh
npm run model:generate  # reconstrói public/models/campus-test.glb
npm run typecheck
npm run build
npx playwright install chromium
npm test               # inicia o servidor de produção e testa o navegador
```

## Integração

Importe `components/CampusMap.tsx` na página. O wrapper cliente faz importação dinâmica com SSR desativado apenas para a cena WebGL. O Canvas possui altura definida, fallback WebGL, Error Boundary e Suspense para o modelo.

`CampusScene.tsx` carrega o GLB com `useGLTF`, instancia malhas preservando suas transformações mundiais e associa salas por `mesh.userData.roomId`. Materiais de destaque são próprios da instância, sem alterar o cache compartilhado do GLTF. A geometria é compartilhada e o cache não é descartado no unmount. Câmera com `CameraControls.setLookAt`, transição cancelada logicamente em mudanças de destino e suporte a movimento reduzido.

Hover muda a cor da malha e do rótulo. Clique seleciona a sala e atualiza a URL preservando outros parâmetros. Voltar/avançar sincroniza seleção e câmera. IDs inválidos exibem aviso e visão geral. Botões e seletor HTML oferecem acesso por teclado. Os rótulos Html não interceptam os eventos das malhas.

Renderização `frameloop="demand"`, DPR limitado a 1,5, luzes sem sombras e geometrias reutilizadas reduzem o trabalho da GPU em repouso. CameraControls invalida quadros enquanto há movimento.

## Plantas e limites

- Administração / térreo: disposição aproximada baseada no PDF `IFCE-MARACANAU-ADMINISTRAÇÃO_01_DE_02` e recortes 01–03.
- Biblioteca e Auditório / térreo: implantação diagonal baseada no PDF, com ambientes simplificados.
- Administração / recortes 04–05: agrupamento separado; pavimento e conexão com o térreo precisam ser confirmados. Não foi inventada uma ligação vertical.
- `data/rooms.json` é o catálogo de IDs, nomes, áreas e coordenadas locais aproximadas. Escala gráfica arbitrária; não são metros nem coordenadas geográficas. Paredes e portas são genéricas, e envelopes retangulares não reproduzem todos os recortes da planta.
- O QR Code deve conter uma URL absoluta do site com `?local=<roomId>`. O parâmetro informa o setor; não realiza posicionamento em tempo real nem cálculo de rotas.

## GeoJSON e troca do modelo

Não havia GeoJSON no repositório. `components/geojson.ts` prepara extrusão de Polygon (incluindo furos), exigindo uma função de projeção explícita de longitude/latitude para X/Z locais. Normalize `Feature.id` ou `properties.roomId` para os mesmos IDs do catálogo. O chamador deve memorizar a geometria e chamar `dispose()` quando ela deixar de ser usada.

Para um GLB definitivo, exporte o piso selecionável de cada sala com extras `{ "roomId": "suporte-ti", "area": "administracao" }`; áreas aceitas: `administracao`, `biblioteca`, `complementar`. Paredes têm `area` e não têm `roomId`. Cadastre os nomes/IDs no JSON. A câmera calcula o centro e o tamanho das malhas reais; não usa coordenadas de câmera codificadas por sala.

## Referência técnica

- [Next.js: lazy loading e ssr:false em Client Components](https://nextjs.org/docs/app/guides/lazy-loading)
- [React Three Fiber: performance e renderização sob demanda](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
