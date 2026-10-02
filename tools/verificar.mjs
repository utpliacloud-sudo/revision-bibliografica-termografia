import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const base = process.env.TEST_URL || 'http://localhost:3000';
const data = JSON.parse(await readFile(new URL('../data/project.json',import.meta.url),'utf8'));
const reference = JSON.parse(await readFile(new URL('../data/reference.json',import.meta.url),'utf8'));
const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(base);await page.getByRole('link',{name:'Comenzar análisis →'}).waitFor();
  await mkdir(new URL('../verification/',import.meta.url),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../verification/inicio.png',import.meta.url)),fullPage:true});
  for(const link of await page.locator('a[download]').evaluateAll(nodes=>nodes.map(n=>n.href))) {
    const response=await page.request.get(link);assert.equal(response.status(),200,link);assert.ok((await response.body()).length>0);
  }
  await page.getByRole('link',{name:'Comenzar análisis →'}).click();
  assert.match(await page.locator('.pagination').innerText(),/de 601 artículos/);
  await page.locator('[data-sort="puntaje_general"]').click();
  let scores=await page.locator('.scores tbody tr td:nth-child(3)').allTextContents();
  assert.ok(parseFloat(scores[0].replace(',','.')) <= parseFloat(scores.at(-1).replace(',','.')));
  await page.locator('[data-sort="puntaje_general"]').click();
  scores=await page.locator('.scores tbody tr td:nth-child(3)').allTextContents();
  assert.ok(parseFloat(scores[0].replace(',','.')) >= parseFloat(scores.at(-1).replace(',','.')));
  await page.locator('[data-page="1"]').click();assert.match(await page.locator('.pagination').innerText(),/51–100/);
  await page.locator('[data-article]').first().click();await page.locator('dialog[open]').waitFor();assert.ok((await page.locator('.abstract').innerText()).length>0);await page.locator('[data-close]').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-export]').click();const download=await downloadPromise;
  const csv=await readFile(await download.path(),'utf8');assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"titulo_analisis"'));assert.ok(csv.includes(data.articles[0].row.Title.replaceAll('"','""')));
  await page.locator('#search').fill('zzzzzz_nonexistent');await page.waitForTimeout(250);assert.match(await page.locator('.scores tbody').innerText(),/No hay artículos/);assert.ok(await page.locator('[data-export]').isDisabled());
  await page.locator('#search').fill('ResNet');await page.waitForTimeout(250);assert.match(await page.locator('.pagination').innerText(),/de \d+ artículos/);await page.locator('#search').fill('');await page.waitForTimeout(250);
  await page.locator('[data-tab="analysis"]').click();
  const groups=[['datasets','access'],['preparation'],['models','classification','tools'],['metrics','limitations']];
  for(let i=0;i<4;i++) {
    await page.locator(`[data-objective="${i}"]`).click();
    for(const group of groups[i]) {
      const actual=await page.locator(`[data-group="${group}"] .summary-table tbody tr`).evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.cells[0].textContent,Number(row.cells[1].textContent)])));
      assert.deepEqual(actual,Object.fromEntries(Object.entries(reference[group]).filter(([,n])=>n)),group);
      const chart=page.locator(`[data-chart="${group}"]`);
      for(const type of ['Tarjetas','Barras','Puntos','Anillo']) {await chart.selectOption(type);assert.ok((await page.locator(`[data-group="${group}"] .chart-output`).innerHTML()).length>20);}
    }
  }
  const names=['Alta','Media','Baja','Sin resumen'];
  for(let mask=0;mask<16;mask++) {
    for(let i=0;i<4;i++)await page.locator(`[data-level][value="${names[i]}"]`).setChecked(Boolean(mask&(1<<i)));
    const selected=data.articles.filter(a=>names.some((name,i)=>Boolean(mask&(1<<i))&&a.row.nivel_recomendacion===name));
    if(!selected.length){assert.equal(await page.locator('.evidence').count(),0);continue;}
    await page.locator('[data-objective="0"]').click();
    for(const group of groups[0]) {
      const actual=await page.locator(`[data-group="${group}"] .summary-table tbody tr`).evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.cells[0].textContent,Number(row.cells[1].textContent)])));
      const expected=Object.fromEntries(data.categories[group].map(name=>[name,selected.filter(a=>a.mentions[group].includes(name)).length]).filter(([,n])=>n));assert.deepEqual(actual,expected,`${mask}: ${group}`);
    }
  }
  for(const name of names)await page.locator(`[data-level][value="${name}"]`).check();
  const filter=page.locator('[data-group="datasets"] .category-filter');await filter.locator('summary').click();
  const checkboxes=filter.locator('input');for(let i=0;i<await checkboxes.count();i++)await checkboxes.nth(i).uncheck();assert.match(await page.locator('[data-group="datasets"] .chart-output').innerText(),/Selecciona al menos/);
  await checkboxes.first().check();await filter.locator('summary').click();
  const trace=page.locator('[data-group="datasets"] .trace');await trace.locator('summary').click();const options=await trace.locator('option').allTextContents();await trace.locator('select').selectOption(options.at(-1));assert.ok(await trace.locator('tbody tr').count()>0);
  await page.locator('details.panel').nth(1).locator('summary').click();await page.locator('[data-reason]').first().click();await page.locator('dialog[open]').waitFor();
  const reasonExport=page.waitForEvent('download');await page.locator('[data-export-reason]').click();assert.equal((await reasonExport).suggestedFilename(),'articulos_del_motivo.csv');await page.locator('[data-close]').click();
  await page.locator('[data-objective="3"]').click();assert.equal(await page.locator('.metric-table tbody tr').count(),601);
  await page.locator('[data-objective="4"]').click();assert.match(await page.locator('#objective-content').innerText(),/Próximamente/);
  await page.locator('[data-objective="0"]').click();await page.screenshot({path:fileURLToPath(new URL('../verification/analisis.png',import.meta.url)),fullPage:true});
  await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('#theme').click();
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/#inicio');await page.locator('.dataset').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:fileURLToPath(new URL('../verification/movil.png',import.meta.url)),fullPage:true});
  await page.getByRole('link',{name:'Comenzar análisis →'}).click();await page.locator('.level-filters').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.route('**/preview/**',async route=>{
    const response=await route.fetch({url:route.request().url().replace('/preview/','/')});
    await route.fulfill({response});
  });
  await page.goto(base+'/preview/#resultados');await page.locator('.pagination').waitFor();assert.match(await page.locator('.pagination').innerText(),/de 601 artículos/);
  assert.deepEqual(errors,[]);console.log('OK: 601 artículos, descargas, ordenación, detalles, CSV, búsqueda, ocho secciones, 16 combinaciones de niveles, gráficos, trazabilidad, motivos, métricas, tema y móvil.');
} finally { await browser.close(); }
