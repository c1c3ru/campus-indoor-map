import { test, expect } from '@playwright/test';

test('GLB, HTML labels, hover and mesh click without runtime errors', async ({ page }) => {
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
 const model = page.waitForResponse(response => response.url().endsWith('campus-test.glb'));
 await page.goto('/');
 expect((await model).status()).toBe(200);
 const panel = page.locator('.map-panel');
 await expect(panel).toHaveAttribute('data-focused','overview');
 await expect(panel).toHaveAttribute('data-ready','true');
 await expect(page.locator('.room-label').filter({hasText:'Suporte TI'})).toBeVisible();
 const bounds = (await page.locator('canvas').boundingBox())!;
 // Scan rendered space rather than calling handlers: hit-testing must work.
 let hit='';
 for(let y=bounds.y+100;y<bounds.y+bounds.height-50 && !hit;y+=25){
  for(let x=bounds.x+80;x<bounds.x+bounds.width-40 && !hit;x+=25){
   await page.mouse.move(x,y);
   hit = await panel.getAttribute('data-hovered') ?? '';
  }
 }
 expect(hit).not.toBe('');
 await expect(page.locator('.room-label.active')).toHaveCount(1);
 const hovering = await page.locator('canvas').screenshot();
 await page.mouse.move(0,0);
 await expect(panel).toHaveAttribute('data-hovered','');
 const resting = await page.locator('canvas').screenshot();
 expect(Buffer.compare(hovering,resting)).not.toBe(0);
 // Hit the canvas again, then select the physical mesh.
 for(let y=bounds.y+100;y<bounds.y+bounds.height-50;y+=25){
  let done=false;
  for(let x=bounds.x+80;x<bounds.x+bounds.width-40;x+=25){
   await page.mouse.move(x,y);
   const id=await panel.getAttribute('data-hovered');
   if(id){await page.mouse.click(x,y);await expect(page).toHaveURL(new RegExp('local='+id));done=true;break;}
  }
  if(done)break;
 }
 expect(errors).toEqual([]);
});

test('deep links, cross-area selection, history and invalid IDs', async ({ page }) => {
 await page.goto('/?local=suporte-ti&origem=qr');
 const panel = page.locator('.map-panel');
 await expect(panel).toHaveAttribute('data-focused','suporte-ti');
 await expect(page.getByRole('button',{name:'Suporte TI',exact:true})).toHaveAttribute('aria-pressed','true');
 const before = await page.locator('canvas').screenshot();
 await page.getByRole('button',{name:'Estágios',exact:true}).click();
 await expect(panel).toHaveAttribute('data-focused','estagios');
 expect(Buffer.compare(before,await page.locator('canvas').screenshot())).not.toBe(0);
 await expect(page).toHaveURL(/origem=qr/);
 await page.goBack();
 await expect(panel).toHaveAttribute('data-focused','suporte-ti');
 await page.goto('/?local=auditorio');
 await expect(page.locator('#area')).toHaveValue('biblioteca');
 await expect(panel).toHaveAttribute('data-focused','auditorio');
 await page.goto('/?local=diretoria');
 await expect(page.locator('#area')).toHaveValue('complementar');
 await expect(panel).toHaveAttribute('data-focused','diretoria');
 await page.goto('/?local=inexistente');
 await expect(page.getByRole('status')).toContainText('Setor não encontrado');
 await expect(panel).toHaveAttribute('data-focused','overview');
});

test('mobile viewport and reduced motion',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?local=suporte-ti');
 await expect(page.locator('.map-panel')).toHaveAttribute('data-focused','suporte-ti');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('HUD floor toggle swaps geometry, reframes the camera and hides for single-floor blocks', async ({ page }) => {
 await page.goto('/');
 const panel = page.locator('.map-panel');
 const hud = page.locator('.map-hud');
 await expect(panel).toHaveAttribute('data-focused', 'overview');
 await expect(page.getByRole('button', { name: 'Suporte TI', exact: true })).toBeVisible();
 const terreo = await page.locator('canvas').screenshot();
 // The floor pills must not block canvas pan/zoom outside their own footprint.
 await expect(hud).toHaveCSS('pointer-events', 'none');
 await hud.getByRole('group', { name: 'Selecionar andar' }).getByRole('button', { name: '1º Andar' }).click();
 await expect(panel).toHaveAttribute('data-focused', '');
 await expect(panel).toHaveAttribute('data-focused', 'overview');
 await expect(page.getByRole('button', { name: 'Suporte TI', exact: true })).toHaveCount(0);
 await expect(page.getByRole('button', { name: 'Sala dos Professores', exact: true })).toBeVisible();
 expect(Buffer.compare(terreo, await page.locator('canvas').screenshot())).not.toBe(0);
 await hud.getByRole('group', { name: 'Selecionar bloco' }).getByRole('button', { name: 'Biblioteca e Auditório' }).click();
 await expect(page.locator('#area')).toHaveValue('biblioteca');
 await expect(hud.getByRole('group', { name: 'Selecionar andar' })).toHaveCount(0);
});

test('switching floor clears a selection that belongs to the other floor', async ({ page }) => {
 await page.goto('/?local=suporte-ti');
 const panel = page.locator('.map-panel');
 await expect(panel).toHaveAttribute('data-focused', 'suporte-ti');
 await page.locator('.map-hud').getByRole('group', { name: 'Selecionar andar' }).getByRole('button', { name: '1º Andar' }).click();
 await expect(page).not.toHaveURL(/local=suporte-ti/);
 await expect(page.getByRole('status').first()).toContainText('Visão geral');
});
