const app = document.querySelector('#app');
const dialog = document.querySelector('#article-dialog');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const levels = ['Alta','Media','Baja','Sin resumen'];
const objectives = [
  ['Datos','Caracterizar las bases de datos utilizadas, su frecuencia y sus condiciones de acceso, especialmente los recursos públicos.'],
  ['Estrategias','Clasificar las técnicas de preparación y aumento de imágenes según su propósito y frecuencia.'],
  ['Modelos','Identificar los modelos de aprendizaje automático y profundo para clasificación, sus enfoques de entrenamiento y su frecuencia.'],
  ['Evaluación','Resumir métricas, procedimientos de validación, resultados y limitaciones metodológicas.'],
  ['Multimodal','Línea futura de investigación.'],['XAI','Línea futura de investigación.'],['Software','Línea futura de investigación.']
];
const sections = {
  datasets:['Bases de datos nombradas','Barras','El conteo representa artículos que mencionan los nombres reconocidos; una mención no confirma su uso.'],
  access:['Disponibilidad de los datos mencionada','Tarjetas','Una mención pública o restringida no prueba las condiciones de cada base. «No indicado» significa que no aparece una afirmación explícita en los campos disponibles.'],
  preparation:['Preparación y aumento de imágenes','Puntos','Las categorías se superponen: un artículo puede mencionar varias estrategias.'],
  models:['Modelos y familias de IA mencionados','Anillo','Una mención puede corresponder al método propio, una comparación o antecedentes; verifica el texto completo antes de atribuir uso.'],
  classification:['Tipos de clasificación mencionados','Puntos',''],
  tools:['Herramientas de implementación mencionadas','Puntos',''],
  metrics:['Métricas de evaluación mencionadas','Tarjetas',''],
  limitations:['Limitaciones metodológicas mencionadas','Puntos','La ausencia de mención en los campos disponibles no implica ausencia del problema.']
};
const state = {levels:new Set(levels), query:'', tab:'table', objective:0, sort:'puntaje_general', ascending:false, page:0, selected:null, charts:{}, categories:{}, hint:true, disclosures:{keywords:false,reasons:false}};
let project;
let queries;
function queryCard(code) {
  const query=queries.queries[code];
  return `<details class="query-card"><summary>${escape(query.database)} · ${escape(query.field)}</summary><p class="caption">${escape(query.note)}</p><div class="query-actions"><button data-copy-query="${code}">Copiar cadena</button><button data-download-query="${code}">↓ Descargar TXT</button><span class="copy-status" role="status"></span></div><pre><code>${escape(query.text)}</code></pre></details>`;
}
function searchStrategy() {
  return `<section class="search-strategy" aria-labelledby="strategy-heading"><h2 id="strategy-heading">Estrategia de búsqueda</h2><p>Una única estrategia conceptual, adaptada al lenguaje de Scopus y Web of Science:</p><p class="strategy-logic"><b>${escape(queries.strategy)}</b><br><span>Publicaciones de ${escape(queries.period)}</span></p><p class="caption">Una cadena de búsqueda por repositorio reúne los artículos del conjunto principal.</p><div class="query-stack">${queryCard('SC')}${queryCard('WS')}</div></section>`;
}

function researchQuestions() { return `<details class="panel research-questions"><summary><span>Cuatro preguntas de investigación</span></summary><p class="caption">La afinidad de cada artículo con estas cuatro preguntas se evalúa a partir de su título, resumen y palabras clave. Los puntajes por objetivo orientan la prioridad de lectura; las respuestas se confirman al revisar el texto completo.</p>${queries.research_questions.map(item=>`<article class="research-question"><div class="eyebrow">${escape(item.name)}</div><p lang="es"><span class="language-label">ESPAÑOL</span>${escape(item.question)}</p><p lang="en"><span class="language-label">ENGLISH</span>${escape(item.question_en)}</p></article>`).join('')}<div class="query-actions"><a class="button" href="data/cadenas_busqueda.json" download>↓ Descargar estrategia y preguntas JSON</a></div></details>`; }

const number = n => new Intl.NumberFormat('es-EC',{maximumFractionDigits:1}).format(Number(n) || 0);
const percent = (n,total) => number(total ? n * 100 / total : 0) + ' %';
const title = article => article.row.titulo_analisis || article.row.Title || '';
const resource = article => `<a class="resource" href="${escape(article.resource)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir recurso de ${escape(title(article))}">Abrir ↗</a>`;
const badge = level => `<span class="badge level-${levels.indexOf(level)}">${escape(level)}</span>`;
const downloadLink = (name,label) => `<a class="button" href="downloads/${encodeURIComponent(name)}" download>${label}</a>`;
function selectedArticles() {
  const query = state.query.trim().toLocaleLowerCase('es');
  return project.articles.filter(a => state.levels.has(a.row.nivel_recomendacion) && (!query || [title(a),a.abstract,a.row.DOI,a.keywords.join(' ')].join(' ').toLocaleLowerCase('es').includes(query)));
}
function sortedArticles(rows) {
  return [...rows].sort((a,b) => {
    const left = a.row[state.sort] || '', right = b.row[state.sort] || '';
    const diff = /^(puntaje|afinidad)/.test(state.sort) ? Number(left)-Number(right) : String(left).localeCompare(String(right),'es');
    return state.ascending ? diff : -diff;
  });
}
function csvDownload(rows, filename) {
  if (!rows.length) return;
  const quote = value => '"'+String(value ?? '').replaceAll('"','""')+'"';
  const content = '\uFEFF' + [project.headers,...rows.map(a=>project.headers.map(h=>a.row[h]))].map(row=>row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function home() {
  const s = project.summary;
  app.innerHTML = `<section class="hero"><div class="eyebrow">REVISIÓN SISTEMÁTICA EN DESARROLLO · UTPL</div><h1>Inteligencia artificial para la clasificación del cáncer de mama en imágenes termográficas</h1><p>Se realiza una revisión bibliográfica usando la metodología <strong>PRISMA 2020</strong> para conocer el estado de la investigación sobre <em class="topic-emphasis">inteligencia artificial aplicada al cáncer de mama en imágenes termográficas</em>, con el objetivo de identificar bajo qué enfoques se ha estudiado, la evidencia disponible y las posibles limitaciones que orientan futuras investigaciones.</p><p>Este informe web presenta la recopilación y el análisis bibliográfico de las <strong class="process-emphasis">fuentes consultadas</strong>, las <strong class="process-emphasis">cadenas de búsqueda utilizadas</strong>, la <strong class="process-emphasis">unificación y depuración de los registros</strong> y el <strong class="process-emphasis">análisis de su afinidad con los cuatro objetivos de investigación</strong>. Los resultados se presentan mediante <strong>tablas, gráficas y archivos descargables</strong> que permiten explorar y documentar cada etapa del proceso, con los registros y resultados correspondientes.</p></section>
    ${researchQuestions()}
    <h2>Fuentes de datos</h2><div class="sources">
    <a class="source scopus" href="downloads/SC1.csv" download><span class="logo"><img src="assets/scopus.png" alt="Scopus"></span><span><b>Scopus</b><small>${s.scopus} registros · SC1.csv</small><strong>Descargar archivo ↓</strong></span></a>
    <a class="source wos" href="downloads/WS1.xls" download><span class="logo"><img src="assets/wos.png" alt="Web of Science"></span><span><b>Web of Science</b><small>${s.wos} registros · WS1.xls</small><strong>Descargar archivo ↓</strong></span></a></div>
    ${searchStrategy()}
    <picture class="flow"><source media="(max-width:700px)" srcset="assets/flujo-movil.svg"><img src="assets/flujo.svg" alt="Flujo: ${s.scopus} registros Scopus y ${s.wos} Web of Science; ${s.pairs_fused} duplicados fusionados, ${s.screened_out} apartados y ${s.final_rows} artículos finales."></picture>
    <p class="caption">Tras deduplicar quedaron ${s.deduplicated_rows} registros. Se apartaron ${s.screened_out} que no cumplen el filtro textual de termografía mamaria; los ${s.final_rows} restantes pasan al análisis de objetivos.</p>
    <section class="dataset"><div class="dataset-icon">▦</div><div><div class="eyebrow">BASE LISTA PARA EXPLORAR</div><h2>Dataset final filtrado</h2><p>${s.final_rows} artículos · ${s.final_columns} columnas bibliográficas.<br>El análisis añade ${s.analysis_columns} columnas de puntajes y recomendaciones: ${s.analyzed_columns} en total.</p></div><div class="dataset-actions">${downloadLink('dataset_final.xlsx',`↓ Descargar dataset final (${s.final_rows})`)}<a class="button primary" href="#resultados">Comenzar análisis →</a></div></section>
    <details class="panel"><summary>Archivos del proceso y trazabilidad</summary><div class="download-grid">${[['dataset_unificado.xlsx','Registros unificados'],['dataset_unificado_duplicados.xlsx','Identificación de duplicados'],['dataset_final_deduplicado.xlsx','Dataset deduplicado'],['descartados_filtro_termografia.csv','Registros apartados y motivos'],['dataset_analizado.csv','Dataset completo con puntajes'],['filtro_termografia_resumen.json','Resumen del filtro temático']].map(([f,l])=>downloadLink(f,'↓ '+l)).join('')}</div></details>`;
}
function scoreTable(rows, paged=false) {
  const columns = [['titulo_analisis','Título'],['puntaje_general','Puntaje general'],['nivel_recomendacion','Recomendación'],...objectives.slice(0,4).map((o,i)=>['afinidad_O'+(i+1),'Objetivo '+(i+1)]),['objetivo_mayor_afinidad','Mayor afinidad']];
  const visible = paged ? rows.slice(state.page*50,(state.page+1)*50) : rows;
  return `<div class="table-scroll"><table class="scores"><thead><tr><th>Recurso</th>${columns.map(([key,label])=>`<th ${paged?`aria-sort="${state.sort===key?(state.ascending?'ascending':'descending'):'none'}"`:''}>${paged?`<button data-sort="${key}" title="${escape(key.startsWith('afinidad')?objectives[Number(key.slice(-1))-1][1]:label==='Recomendación'?'Alta: mayor prioridad temática. Media: requiere comprobar alcance. Baja: afinidad limitada, revisión o retractación. Sin resumen: texto insuficiente.':'Ordenar por '+label)}">${label} ${state.sort===key?(state.ascending?'↑':'↓'):'↕'}</button>`:label}</th>`).join('')}</tr></thead><tbody>${visible.map(a=>`<tr ${state.selected===project.articles.indexOf(a)?'class="selected"':''}><td>${resource(a)}</td><td><button class="article-title" data-article="${project.articles.indexOf(a)}">${escape(title(a))}</button></td><td class="score">${number(a.row.puntaje_general)} %</td><td>${badge(a.row.nivel_recomendacion)}</td>${[1,2,3,4].map(i=>`<td class="score">${number(a.row['afinidad_O'+i])} %</td>`).join('')}<td>${escape(a.row.objetivo_mayor_afinidad)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No hay artículos que coincidan con los filtros.</td></tr>'}</tbody></table></div>`;
}
function resultTable(rows) {
  const sorted = sortedArticles(rows), pages=Math.max(1,Math.ceil(rows.length/50));
  state.page=Math.min(state.page,pages-1);
  return `<div class="toolbar"><p class="caption">${rows.length} artículos. Ordena con los encabezados y pulsa un título para consultar sus detalles.</p><button class="orange" data-export ${rows.length?'':'disabled'}>↓ Exportar resultados CSV</button></div>${scoreTable(sorted,true)}<div class="pagination"><span>${rows.length?state.page*50+1:0}–${Math.min((state.page+1)*50,rows.length)} de ${rows.length} artículos</span><div><button data-page="-1" ${state.page===0?'disabled':''}>← Anterior</button><span>Página ${state.page+1} de ${pages}</span><button data-page="1" ${state.page>=pages-1?'disabled':''}>Siguiente →</button></div></div>`;
}
function counts(rows,group) { return project.categories[group].map(name=>({name,articles:rows.filter(a=>a.mentions[group].includes(name))})).filter(x=>x.articles.length).sort((a,b)=>b.articles.length-a.articles.length); }
const palette = ['#32a890','#ef9b62','#6a9cb3','#a690c4','#d1b44f','#ea7983','#6cb86e','#667bdd','#a06e50','#45a6c2','#bd66a2','#9ca950','#608d84','#dd8366','#a2a9bc'];
function graphic(items,total,kind) {
  if (!items.length) return '<p class="empty">Selecciona al menos una categoría para mostrar la gráfica.</p>';
  if (kind==='Tarjetas') return `<div class="evidence-cards">${items.map(x=>`<div class="evidence-card"><b>${escape(x.name)}</b><div class="card-number">${x.articles.length} <small>artículos · ${percent(x.articles.length,total)}</small></div><div class="meter"><span style="width:${x.articles.length*100/total}%"></span></div></div>`).join('')}</div>`;
  if (kind==='Anillo') {
    const sum=items.reduce((s,x)=>s+x.articles.length,0); let offset=0;
    const rings=items.map((x,i)=>{const fraction=x.articles.length/sum;const node=`<circle cx="120" cy="120" r="82" fill="none" stroke="${palette[i%palette.length]}" stroke-width="30" pathLength="100" stroke-dasharray="${fraction*100} ${100-fraction*100}" stroke-dashoffset="${-offset*100}" transform="rotate(-90 120 120)"><title>${escape(x.name)}: ${x.articles.length} menciones</title></circle>`;offset+=fraction;return node;}).join('');
    return `<div class="donut"><svg viewBox="0 0 240 240" role="img" aria-label="Distribución de menciones por categoría">${rings}<text x="120" y="118" text-anchor="middle" class="donut-number">${sum}</text><text x="120" y="142" text-anchor="middle" class="donut-label">menciones</text></svg><div>${items.map((x,i)=>`<p><i style="background:${palette[i%palette.length]}"></i>${escape(x.name)} <b>${x.articles.length}</b></p>`).join('')}</div></div><p class="caption">El anillo reparte menciones entre categorías; un artículo puede aparecer en varias.</p>`;
  }
  const maximum=Math.max(...items.map(x=>x.articles.length));
  return `<div class="bar-chart ${kind==='Puntos'?'dots':''}">${items.map(x=>`<div class="bar-row"><span>${escape(x.name)}</span><div class="bar-track"><div class="bar" style="width:${x.articles.length/maximum*100}%"><i></i></div></div><b title="${percent(x.articles.length,total)} de seleccionados">${x.articles.length}</b></div>`).join('')}<p class="caption">Número de artículos</p></div>`;
}
function evidence(rows,group) {
  const [heading,defaultKind,note]=sections[group], all=counts(rows,group);
  const kind=state.charts[group]||defaultKind;
  const visible=all.filter(x=>!state.categories[group]||state.categories[group].has(x.name));
  return `<section class="evidence" data-group="${group}"><h3>${heading}</h3>${note?`<p class="caption">${note}</p>`:''}${all.length?`<div class="chart-controls"><label>Visualización <select data-chart="${group}">${['Tarjetas','Barras','Puntos','Anillo'].map(k=>`<option ${kind===k?'selected':''}>${k}</option>`).join('')}</select></label><details class="category-filter"><summary>Filtrar categorías</summary><div>${all.map(x=>`<label><input type="checkbox" data-category="${group}" value="${escape(x.name)}" ${(!state.categories[group]||state.categories[group].has(x.name))?'checked':''}>${escape(x.name)}</label>`).join('')}</div></details></div><div class="chart-output">${graphic(visible,rows.length,kind)}</div><div class="table-scroll summary-table"><table><thead><tr><th>Categoría</th><th>Artículos</th><th>% de seleccionados</th></tr></thead><tbody>${all.map(x=>`<tr><td>${escape(x.name)}</td><td>${x.articles.length}</td><td>${percent(x.articles.length,rows.length)}</td></tr>`).join('')}</tbody></table></div><details class="trace"><summary>Ver los artículos detrás de cada conteo</summary><label>Categoría <select data-trace="${group}">${all.map(x=>`<option>${escape(x.name)}</option>`).join('')}</select></label><div class="trace-list">${articleList(all[0].articles)}</div></details>`:'<p class="empty">No hay menciones explícitas en los registros seleccionados.</p>'}</section>`;
}
function articleList(rows) { return `<div class="table-scroll trace-table"><table><thead><tr><th>Recurso</th><th>Título</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${resource(a)}</td><td><button class="article-title" data-article="${project.articles.indexOf(a)}">${escape(title(a))}</button></td></tr>`).join('')}</tbody></table></div>`; }
function network(rows) {
  const frequencies=new Map(); rows.forEach(a=>a.keywords.forEach(k=>frequencies.set(k,(frequencies.get(k)||0)+1)));
  const nodes=[...frequencies].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,14);
  if(!nodes.length) return '<p class="empty">Los registros seleccionados no contienen palabras clave separadas por punto y coma.</p>';
  const positions=new Map(nodes.map(([name,count],i)=>[name,i===0?[540,315]:[540+405*Math.cos(-Math.PI/2+2*Math.PI*(i-1)/(nodes.length-1)),315+240*Math.sin(-Math.PI/2+2*Math.PI*(i-1)/(nodes.length-1))]]));
  const pairs=new Map(); rows.forEach(a=>{const terms=a.keywords.filter(k=>positions.has(k));for(let i=0;i<terms.length;i++)for(let j=i+1;j<terms.length;j++){const key=JSON.stringify([terms[i],terms[j]]);pairs.set(key,(pairs.get(key)||0)+1);}});
  const edges=[...pairs].filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,30),max=edges[0]?.[1]||1;
  return `<div class="network"><svg viewBox="0 0 1080 660" role="img" aria-label="Red de coocurrencia de palabras clave"><rect width="1080" height="660" rx="20" fill="#102d3c"/>${edges.map(([key,n])=>{const [l,r]=JSON.parse(key),[x1,y1]=positions.get(l),[x2,y2]=positions.get(r);return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6bc9bd" stroke-width="${1+5*n/max}" opacity="${.18+.47*n/max}"><title>${escape(l)} + ${escape(r)}: ${n} artículos</title></line>`;}).join('')}${nodes.map(([name,n],i)=>{const [x,y]=positions.get(name),r=i?27:37,words=name.split(' ');let lines=[''];for(const w of words){if((lines.at(-1)+' '+w).length>22&&lines.at(-1))lines.push('');lines[lines.length-1]+=(lines.at(-1)?' ':'')+w;}return `<g><title>${escape(name)}: ${n} artículos</title><circle cx="${x}" cy="${y}" r="${r}" fill="${i?'#53baa9':'#ef9b62'}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#102d3c" font-size="15" font-weight="700">${n}</text>${lines.slice(0,2).map((l,j)=>`<text x="${x}" y="${y+r+20+j*17}" text-anchor="middle" fill="#e9f7f5" font-size="12">${escape(l)}${j===1&&lines.length>2?'…':''}</text>`).join('')}</g>`;}).join('')}</svg></div><p class="caption">Cada nodo indica cuántos artículos contienen la palabra clave. Las líneas conectan términos presentes juntos en al menos dos registros; su grosor indica la coocurrencia. La conexión no implica que sean sinónimos.</p>`;
}
function analysis(rows) {
  if(!rows.length) return '<p class="empty">Marca al menos una categoría de recomendación o ajusta la búsqueda para analizar resultados.</p>';
  const reasons=new Map(); rows.forEach(a=>{if(a.reason)reasons.set(a.reason,(reasons.get(a.reason)||0)+1);});
  const groups=[['datasets','access'],['preparation'],['models','classification','tools'],['metrics','limitations']][state.objective];
  let content;
  if(state.objective>3) content=`<div class="empty"><h3>${objectives[state.objective][0]}</h3>Próximamente</div>`;
  else content=`<div class="objective-heading"><div class="eyebrow">OBJETIVO ${state.objective+1} · ${objectives[state.objective][0].toUpperCase()}</div><p>${objectives[state.objective][1]}</p></div>${state.objective===0&&state.hint?'<div class="hint">Se analizan los registros que superaron el filtro textual de termografía mamaria. Mencionar otra tecnología no excluye un artículo que también cumpla ese criterio.<button data-dismiss aria-label="Cerrar aviso">×</button></div>':''}${groups.map(g=>evidence(rows,g)).join('')}${state.objective===3?metricTable(rows):''}`;
  return `<p class="caption">Menciones detectadas en título, resumen y palabras clave de ${rows.length} artículos seleccionados. Un artículo puede aparecer en varias categorías. Estos conteos no sustituyen la extracción manual del texto completo.</p><details class="panel" data-disclosure="keywords" ${state.disclosures.keywords?'open':''}><summary>Palabras clave más frecuentes</summary>${network(rows)}</details><details class="panel" data-disclosure="reasons" ${state.disclosures.reasons?'open':''}><summary>Motivos de la recomendación general</summary><p class="caption">Selecciona un motivo para ver sus artículos y exportarlos en CSV.</p><div class="table-scroll"><table><thead><tr><th>Motivo</th><th>Artículos</th><th>% de seleccionados</th></tr></thead><tbody>${[...reasons].sort((a,b)=>b[1]-a[1]).map(([reason,n])=>`<tr><td><button class="article-title" data-reason="${escape(reason)}">${escape(reason)}</button></td><td>${n}</td><td>${percent(n,rows.length)}</td></tr>`).join('')}</tbody></table></div></details><nav class="objective-tabs" aria-label="Objetivos">${objectives.map((o,i)=>`<button data-objective="${i}" aria-pressed="${i===state.objective}">${i+1} · ${o[0]}</button>`).join('')}</nav><div id="objective-content">${content}</div>`;
}
function metricTable(rows) { const names=project.categories.metrics; return `<section class="evidence"><h3>Métricas mencionadas por artículo</h3><p class="caption">✓ indica una mención en título, resumen o palabras clave. No confirma que el estudio haya utilizado la métrica.</p><div class="table-scroll metric-table"><table><thead><tr><th>Recurso</th><th>Título</th>${names.map(n=>`<th>${escape(n)}</th>`).join('')}</tr></thead><tbody>${rows.map(a=>`<tr><td>${resource(a)}</td><td><button class="article-title" data-article="${project.articles.indexOf(a)}">${escape(title(a))}</button></td>${names.map(n=>`<td class="metric" aria-label="${escape(n)}: ${a.mentions.metrics.includes(n)?'sí':'no'}">${a.mentions.metrics.includes(n)?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`; }
function results() {
  const rows=selectedArticles();
  app.innerHTML=`<section class="result-hero"><div class="eyebrow">ARTÍCULOS DE LA REVISIÓN</div><a class="button back" href="#inicio">← Volver al informe</a><h1>Resultados del análisis</h1><p>Los títulos, resúmenes y palabras clave se compararon con el tema y los cuatro objetivos de la investigación. La <b>recomendación general</b> agrupa los artículos en afinidad alta, media o baja. Los <b>puntajes por objetivo</b> ayudan a identificar qué trabajos pueden aportar a cada pregunta de investigación.</p></section><section class="filters"><b>Selecciona los niveles de recomendación que quieres consultar</b><div class="level-filters">${levels.map((l,i)=>{const n=project.articles.filter(a=>a.row.nivel_recomendacion===l).length;return `<label class="level-filter"><input type="checkbox" data-level value="${l}" ${state.levels.has(l)?'checked':''}>${badge(l)}<small>${n} · ${percent(n,project.articles.length)}</small></label>`;}).join('')}</div><label class="search-label" for="search">Buscar artículos por título, resumen, palabra clave o DOI</label><input id="search" type="search" value="${escape(state.query)}" placeholder="Por ejemplo: ResNet, DMR, breast cancer…"></section><nav class="main-tabs" aria-label="Resultados"><button data-tab="table" aria-pressed="${state.tab==='table'}">Tabla de resultados</button><button data-tab="analysis" aria-pressed="${state.tab==='analysis'}">Análisis de resultados</button></nav><section id="results-content">${state.tab==='table'?resultTable(rows):analysis(rows)}</section>`;
}
function render() { if(!project)return; clearTimeout(searchTimer);location.hash.startsWith('#resultados')?results():home();app.setAttribute('aria-busy','false'); }
function showArticle(index) {
  const a=project.articles[index]; if(!a)return;state.selected=index;
  document.querySelector('#dialog-content').innerHTML=`<div class="dialog-header"><div class="eyebrow">DETALLE DEL ARTÍCULO</div><button data-close aria-label="Cerrar diálogo">×</button></div><h2>${escape(title(a))}</h2><div class="detail-meta">${badge(a.row.nivel_recomendacion)}<span>Puntaje general: <b>${number(a.row.puntaje_general)} %</b></span>${resource(a)}</div><h3>Motivo de la recomendación</h3><p>${escape(a.row.motivo_recomendacion)}</p><div class="detail-scores">${[1,2,3,4].map(i=>`<div><small>Objetivo ${i}</small><strong>${number(a.row['afinidad_O'+i])} %</strong><p>${escape(a.row['motivo_O'+i]||a.row['motivo_afinidad_O'+i]||objectives[i-1][1])}</p></div>`).join('')}</div><h3>Resumen</h3><p class="abstract">${escape(a.abstract||'Sin resumen disponible.')}</p><h3>Palabras clave</h3><p>${escape(a.keywords.join(' · ')||'Sin palabras clave disponibles.')}</p><details><summary>Metadatos bibliográficos completos</summary><dl>${project.headers.filter(h=>a.row[h]).map(h=>`<dt>${escape(h)}</dt><dd>${escape(a.row[h])}</dd>`).join('')}</dl></details><button class="primary" data-export-one="${index}">↓ Exportar artículo CSV</button>`;
  if(!dialog.open)dialog.showModal();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-copy-query')){
    const code=button.dataset.copyQuery, status=button.parentElement.querySelector('.copy-status');
    navigator.clipboard.writeText(queries.queries[code].text).then(()=>{status.textContent='Cadena copiada';}).catch(()=>{status.textContent='No se pudo copiar. Descarga el TXT o selecciona el texto.';});return;
  }
  if(button.hasAttribute('data-download-query')){
    const code=button.dataset.downloadQuery, url=URL.createObjectURL(new Blob([queries.queries[code].text],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`cadena_${code}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  if(button.hasAttribute('data-close')){dialog.close();return;}
  if(button.hasAttribute('data-article')){showArticle(Number(button.dataset.article));return;}
  if(button.hasAttribute('data-export-one')){csvDownload([project.articles[Number(button.dataset.exportOne)]],'articulo.csv');return;}
  if(button.hasAttribute('data-export')){csvDownload(sortedArticles(selectedArticles()),'analisis_seleccionado.csv');return;}
  if(button.hasAttribute('data-export-reason')){csvDownload(selectedArticles().filter(a=>a.reason===button.dataset.exportReason),'articulos_del_motivo.csv');return;}
  if(button.hasAttribute('data-reason')){const reason=button.dataset.reason,rows=selectedArticles().filter(a=>a.reason===reason);document.querySelector('#dialog-content').innerHTML=`<div class="dialog-header"><div class="eyebrow">ARTÍCULOS DE ESTE MOTIVO</div><button data-close aria-label="Cerrar diálogo">×</button></div><h2>${escape(reason)}</h2><p>${rows.length} artículos dentro de la selección actual.</p>${scoreTable(sortedArticles(rows))}<button class="primary" data-export-reason="${escape(reason)}">↓ Exportar estos artículos CSV</button>`;dialog.showModal();return;}
  if(button.hasAttribute('data-sort')){if(state.sort===button.dataset.sort)state.ascending=!state.ascending;else{state.sort=button.dataset.sort;state.ascending=!/^(puntaje|afinidad)/.test(state.sort);}state.page=0;results();}
  if(button.hasAttribute('data-page')){state.page+=Number(button.dataset.page);results();}
  if(button.hasAttribute('data-tab')){state.tab=button.dataset.tab;results();}
  if(button.hasAttribute('data-objective')){state.objective=Number(button.dataset.objective);results();}
  if(button.hasAttribute('data-dismiss')){state.hint=false;results();}
});
document.addEventListener('toggle',event=>{
  const details=event.target;
  if(details.isConnected && details.dataset.disclosure)state.disclosures[details.dataset.disclosure]=details.open;
},true);
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.hasAttribute('data-level')){input.checked?state.levels.add(input.value):state.levels.delete(input.value);state.page=0;results();}
  if(input.hasAttribute('data-chart')){const group=input.dataset.chart;state.charts[group]=input.value;updateChart(group);}
  if(input.hasAttribute('data-category')){const group=input.dataset.category;state.categories[group]??=new Set(project.categories[group]);input.checked?state.categories[group].add(input.value):state.categories[group].delete(input.value);updateChart(group);}
  if(input.hasAttribute('data-trace')){input.closest('.trace').querySelector('.trace-list').innerHTML=articleList(selectedArticles().filter(a=>a.mentions[input.dataset.trace].includes(input.value)));}
});
function updateChart(group){const rows=selectedArticles(),items=counts(rows,group).filter(x=>!state.categories[group]||state.categories[group].has(x.name));document.querySelector(`[data-group="${group}"] .chart-output`).innerHTML=graphic(items,rows.length,state.charts[group]||sections[group][1]);}
let searchTimer;
document.addEventListener('input',event=>{if(event.target.id==='search'){const field=event.target;state.query=field.value;state.page=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{document.querySelector('#results-content').innerHTML=state.tab==='table'?resultTable(selectedArticles()):analysis(selectedArticles());},180);}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
document.querySelector('#theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('brujula-theme',dark?'dark':'light');}catch{}});
try{document.documentElement.dataset.theme=localStorage.getItem('brujula-theme')||'light';}catch{}
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
try{const responses=await Promise.all(['project.json','cadenas_busqueda.json'].map(file=>fetch(new URL('./data/'+file,import.meta.url))));if(responses.some(r=>!r.ok))throw new Error('No se pudo cargar el dataset o las cadenas de búsqueda.');[project,queries]=await Promise.all(responses.map(r=>r.json()));render();}catch(error){app.innerHTML=`<div class="empty"><h1>No se pudieron cargar los datos</h1><p>${escape(error.message)}</p><p>Inicia el servidor con iniciar.bat y abre http://localhost:3000.</p><button onclick="location.reload()">Volver a intentar</button></div>`;app.setAttribute('aria-busy','false');}
