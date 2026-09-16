import { $, escapeHtml } from '../../../shared/js/dom-utils.js';
import { registerServiceWorker, initInstallPrompt } from '../../../shared/js/pwa.js';
import { initTheme } from '../../../shared/js/theme.js';

// ==================== STATE ====================
let loadedData=[];
let currentTracks=[];
let isDatetimeX=false;
let cursor1=null, cursor2=null;
let trackColors=['#00ff66','#67c7ff','#ffb700','#ff5555','#cc66ff','#00ffff','#ff8800','#66ff99'];
let lastFFTTraces=[];
let lastStatsText='';
let lastFFTText='';
let popupWindow=null;
let popupCloseChecker=null;

let plotMode='single'; // 'single' | 'stacked'

// Zoom: X comune, Y per pannello/asse
let viewXMin=null, viewXMax=null;
let viewYMinLeft=null, viewYMaxLeft=null;
let viewYMinRight=null, viewYMaxRight=null;
let viewYByPanel={}; // { panelIndex: {min, max} }
let yScaleMode='auto';

// Interazione
let mouseDown=false, mouseStartX=0, mouseStartY=0, mouseCurrentX=0, mouseCurrentY=0;
let isPanning=false;
let panStartView=null;
let lastLayout=null;

// Pannello corrente al passaggio del mouse (per zoom Y)
let hoverPanelIndex=0;

const AXIS_COLOR_LEFT='#00ff66';
const AXIS_COLOR_RIGHT='#67c7ff';
const PANEL_COLORS=['#00ff66','#67c7ff','#ffb700','#ff5555','#cc66ff','#00ffff','#ff8800','#66ff99'];
const MAX_PANELS=6;

// ==================== DOM ====================
const mainView=$('mainView'), plotView=$('plotView');
const yTableBody=document.querySelector('#yTable tbody');
const previewWrap=$('previewWrap');
const statusLabel=$('statusLabel');
const plotCanvas=$('plotCanvas');
const plotContainer=$('plotContainer');
const chartTooltip=$('chartTooltip');
const fftCanvasMain=$('fftCanvasMain');
const statsTextEl=$('statsText');
const fftTextEl=$('fftText');
const legendHits=[];

function setStatus(text,type){
  statusLabel.textContent=text;
  statusLabel.className='status-bar'+(type?' '+type:'');
}
function toggleWidget(el){
  const w=el.closest('.widget');
  const c=w.classList.toggle('collapsed');
  el.querySelector('.collapse-arrow').textContent=c?'▶':'▼';
}

// ==================== PLOT MODE ====================
$('plotModeSelect').addEventListener('change',(e)=>{
  plotMode=e.target.value;
  applyPlotModeUI();
  updatePanelLabelsFromTable();
});

function applyPlotModeUI(){
  if(plotMode==='stacked'){
    $('singleAxisLabels').style.display='none';
    $('stackedPanelLabels').style.display='block';
    $('thAxisPanel').textContent='Pannello';
  } else {
    $('singleAxisLabels').style.display='block';
    $('stackedPanelLabels').style.display='none';
    $('thAxisPanel').textContent='Asse';
  }
  rebuildAxisColumn();
}

// Ricostruisce i select nella colonna Asse/Pannello
function rebuildAxisColumn(){
  yTableBody.querySelectorAll('tr').forEach(tr=>{
    const cell=tr.querySelector('.axis-cell');
    if(!cell) return;
    const prev=tr.dataset.axisValue||'1';
    let html='';
    if(plotMode==='stacked'){
      html='<select class="axis-select panel-select">';
      for(let i=1;i<=MAX_PANELS;i++){
        html+='<option value="'+i+'">P'+i+'</option>';
      }
      html+='</select>';
    } else {
      html='<select class="axis-select">'+
        '<option value="left">SX</option>'+
        '<option value="right">DX</option>'+
      '</select>';
    }
    cell.innerHTML=html;
    const sel=cell.querySelector('select');
    if(plotMode==='stacked'){
      const n=parseInt(prev,10);
      if(n>=1&&n<=MAX_PANELS) sel.value=String(n);
      else sel.value='1';
      tr.dataset.axisValue=sel.value;
    } else {
      if(prev==='right') sel.value='right'; else sel.value='left';
      tr.dataset.axisValue=sel.value;
      sel.classList.toggle('right',sel.value==='right');
    }
    sel.addEventListener('change',()=>{
      tr.dataset.axisValue=sel.value;
      if(plotMode==='single'){
        sel.classList.toggle('right',sel.value==='right');
      }
      updatePanelLabelsFromTable();
    });
  });
}

// Aggiorna la lista dei pannelli visibili nel widget labels
function updatePanelLabelsFromTable(){
  if(plotMode!=='stacked'){
    $('panelLabelsList').innerHTML='';
    return;
  }
  const usedPanels=new Set();
  yTableBody.querySelectorAll('tr').forEach(tr=>{
    const cb=tr.querySelector('input[type=checkbox]');
    if(!cb||!cb.checked) return;
    const v=parseInt(tr.dataset.axisValue||'1',10);
    if(v>=1&&v<=MAX_PANELS) usedPanels.add(v);
  });
  const sorted=[...usedPanels].sort((a,b)=>a-b);
  const list=$('panelLabelsList');
  const existingInputs={};
  list.querySelectorAll('input[data-panel]').forEach(inp=>{
    existingInputs[inp.dataset.panel]=inp.value;
  });
  list.innerHTML='';
  if(!sorted.length){
    list.innerHTML='<div style="color:#555;font-size:.9em;text-align:center">Nessun canale selezionato</div>';
    return;
  }
  sorted.forEach((n,i)=>{
    const row=document.createElement('div');
    row.className='panel-label-row';
    const defaultLabel='Pannello '+n;
    const val=existingInputs[String(n)]||defaultLabel;
    row.innerHTML='<label style="color:'+PANEL_COLORS[i%PANEL_COLORS.length]+'">P'+n+'</label>'+
      '<input type="text" data-panel="'+n+'" value="'+escapeHtml(val)+'">';
    list.appendChild(row);
  });
}

function getPanelLabel(origNumber){
  const inp=$('panelLabelsList').querySelector('input[data-panel="'+origNumber+'"]');
  if(inp&&inp.value) return inp.value;
  return 'Pannello '+origNumber;
}

// Aggiorna le label quando l'utente scrive
document.addEventListener('input',(e)=>{
  if(e.target.matches('#panelLabelsList input[data-panel]')){
    if(currentTracks.length) renderChart();
  }
});

// Aggiorna i pannelli quando l'utente spunta una checkbox
yTableBody.addEventListener('change',(e)=>{
  if(e.target.matches('input[type=checkbox]')){
    updatePanelLabelsFromTable();
  }
});

// ==================== FILE LOADING ====================
$('btnLoad').addEventListener('click',()=>$('fileInput').click());

$('fileInput').addEventListener('change',async e=>{
  const files=Array.from(e.target.files);
  if(!files.length) return;
  setStatus('> Caricamento in corso...','');
  let errors='';
  for(const file of files){
    const ext=file.name.split('.').pop().toLowerCase();
    try{
      let table;
      if(ext==='xlsx') table=await loadXLSXFile(file);
      else if(ext==='xls') throw new Error('Formato .xls legacy non supportato — salva in .xlsx o .csv');
      else if(ext==='csv'||ext==='txt'||ext==='dat') table=await loadTextFile(file);
      else throw new Error('Formato non supportato: .'+ext);
      if(!table||!table.varNames.length) continue;
      tryConvertDatetime(table);
      loadedData.push({fileName:file.name,varNames:table.varNames,rows:table.rows});
    }catch(err){
      console.error(err);
      errors+='Errore ['+file.name+']: '+err.message+'\n';
    }
  }
  $('fileInput').value='';
  if(loadedData.length){
    $('fileInfo').textContent='✔ Caricati '+loadedData.length+' file nella sessione corrente.';
    populateUiComponents();
    $('btnPlot').disabled=false;
    setStatus(errors||'> Pronto. Scegli modalità, assegna pannelli e genera il grafico.','ok');
  }else if(errors){
    setStatus(errors,'err');
  }
});

function detectDelimiter(line){
  const c={
    ',':(line.match(/,/g)||[]).length,
    ';':(line.match(/;/g)||[]).length,
    '\t':(line.match(/\t/g)||[]).length
  };
  let best=',', max=0;
  for(const k of Object.keys(c)) if(c[k]>max){max=c[k];best=k;}
  return best;
}
function parseDelimited(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  const firstLine=text.split(/\r?\n/)[0]||'';
  const delim=detectDelimiter(firstLine);
  const rows=[];
  let row=[], field='', inQuote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQuote){
      if(c==='"'){
        if(text[i+1]==='"'){field+='"';i++;}
        else inQuote=false;
      } else field+=c;
    } else {
      if(c==='"') inQuote=true;
      else if(c===delim){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c==='\r'){}
      else field+=c;
    }
  }
  if(field!==''||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.some(c=>c!==null&&String(c).trim()!==''));
}
function tableFromRows(rawRows){
  if(!rawRows.length) return {varNames:[],rows:[]};
  const varNames=rawRows[0].map((v,i)=>(v!=null&&v!=='')?String(v).trim():'Col'+(i+1));
  const data=rawRows.slice(1).map(r=>varNames.map((_,i)=>{
    const v=r[i];
    if(v===null||v===undefined||v==='') return null;
    if(typeof v==='number') return v;
    const s=String(v).trim().replace(',', '.');
    if(s!==''&&!isNaN(Number(s))&&/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return Number(s);
    return String(v).trim();
  }));
  return {varNames,rows:data};
}
function loadTextFile(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=e=>{try{resolve(tableFromRows(parseDelimited(String(e.target.result))));}catch(err){reject(err);}};
    r.onerror=reject;
    r.readAsText(file,'UTF-8');
  });
}

async function loadXLSXFile(file){
  if(typeof DecompressionStream==='undefined'){
    throw new Error('Browser troppo vecchio per leggere XLSX. Salva come CSV.');
  }
  const buf=await file.arrayBuffer();
  const files=await unzipXLSX(buf);
  if(!files['xl/worksheets/sheet1.xml']) throw new Error('Foglio 1 non trovato');
  const sheetXml=decodeText(files['xl/worksheets/sheet1.xml']);
  const sharedStrings=files['xl/sharedStrings.xml']
    ? parseSharedStrings(decodeText(files['xl/sharedStrings.xml']))
    : [];
  return tableFromRows(parseSheetXml(sheetXml, sharedStrings));
}

function decodeText(bytes){return new TextDecoder('UTF-8').decode(bytes);}

async function unzipXLSX(buf){
  const view=new DataView(buf);
  const u8=new Uint8Array(buf);
  let eocd=-1;
  for(let i=buf.byteLength-22;i>=0;i--){
    if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0) throw new Error('File ZIP non valido (XLSX corrotto?)');
  const cdOffset=view.getUint32(eocd+16,true);
  const numEntries=view.getUint16(eocd+10,true);
  const files={};
  let p=cdOffset;
  for(let i=0;i<numEntries;i++){
    if(view.getUint32(p,true)!==0x02014b50) break;
    const compMethod=view.getUint16(p+10,true);
    const compSize=view.getUint32(p+20,true);
    const nameLen=view.getUint16(p+28,true);
    const extraLen=view.getUint16(p+30,true);
    const commentLen=view.getUint16(p+32,true);
    const localOffset=view.getUint32(p+42,true);
    const name=decodeText(u8.subarray(p+46,p+46+nameLen));
    const lhNameLen=view.getUint16(localOffset+26,true);
    const lhExtraLen=view.getUint16(localOffset+28,true);
    const dataStart=localOffset+30+lhNameLen+lhExtraLen;
    const compData=u8.subarray(dataStart,dataStart+compSize);
    let data;
    if(compMethod===0) data=compData;
    else if(compMethod===8) data=await inflateRaw(compData);
    else throw new Error('Compressione ZIP non supportata');
    files[name]=data;
    p+=46+nameLen+extraLen+commentLen;
  }
  return files;
}

async function inflateRaw(compData){
  const ds=new DecompressionStream('deflate-raw');
  const stream=new Blob([compData]).stream().pipeThrough(ds);
  const result=await new Response(stream).arrayBuffer();
  return new Uint8Array(result);
}

function parseSharedStrings(xml){
  const strings=[];
  const siRegex=/<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while((m=siRegex.exec(xml))){
    const inner=m[1];
    let s='';
    const tRegex=/<t[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while((t=tRegex.exec(inner))) s+=xmlUnescape(t[1]);
    strings.push(s);
  }
  return strings;
}

function xmlUnescape(s){
  return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
          .replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}

function colLetterToNum(letters){
  let n=0;
  for(let i=0;i<letters.length;i++) n=n*26+(letters.charCodeAt(i)-64);
  return n-1;
}

function parseSheetXml(xml, sharedStrings){
  const rows=[];
  const rowRegex=/<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while((rm=rowRegex.exec(xml))){
    const cells=[];
    let lastCol=-1;
    const cellRegex=/<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while((cm=cellRegex.exec(rm[1]))){
      const attrs=cm[1]||cm[2]||'';
      const inner=cm[3]||'';
      const rMatch=attrs.match(/\br="([A-Z]+)\d+"/);
      const tMatch=attrs.match(/\bt="([^"]+)"/);
      const col=rMatch?colLetterToNum(rMatch[1]):lastCol+1;
      const type=tMatch?tMatch[1]:'';
      let val=null;
      if(type==='inlineStr'){
        const tRegex=/<t[^>]*>([\s\S]*?)<\/t>/g;
        let t, parts=[];
        while((t=tRegex.exec(inner))) parts.push(xmlUnescape(t[1]));
        val=parts.join('');
      } else {
        const vMatch=inner.match(/<v>([\s\S]*?)<\/v>/);
        if(vMatch){
          const raw=vMatch[1];
          if(type==='s') val=sharedStrings[parseInt(raw,10)]||'';
          else if(type==='b') val=raw==='1';
          else if(type==='str') val=xmlUnescape(raw);
          else {
            const num=Number(raw);
            val=isNaN(num)?raw:num;
          }
        }
      }
      while(lastCol+1<col){cells.push(null);lastCol++;}
      cells.push(val);
      lastCol=col;
    }
    rows.push(cells);
  }
  return rows.filter(r=>r.some(c=>c!==null&&c!==undefined&&String(c).trim()!==''));
}

// ==================== DATETIME ====================
const DT_REGEX=/(\d{4})[/-](\d{2})[/-](\d{2}).*?(\d{2}):(\d{2}):(\d{2})\.?(\d*)/;
function tryConvertDatetime(table){
  for(let c=0;c<table.varNames.length;c++){
    const col=table.rows.map(r=>r[c]);
    const nn=col.filter(v=>v!==null&&v!==undefined&&v!=='');
    if(nn.length<2) continue;
    if(!nn.every(v=>typeof v==='string')) continue;
    const parsed=[];let ok=0;
    for(const v of col){
      if(v===null||v===undefined||v===''){parsed.push(null);continue;}
      const s=String(v).trim().replace(/"/g,'');
      const m=s.match(DT_REGEX);
      if(m){
        const y=+m[1],mo=+m[2],d=+m[3],h=+m[4],mi=+m[5],se=+m[6];
        const fr=m[7]?parseFloat('0.'+m[7]):0;
        const dt=new Date(y,mo-1,d,h,mi,se+fr);
        if(!isNaN(dt.getTime())){parsed.push(dt);ok++;continue;}
      }
      parsed.push(null);
    }
    if(ok>0.5*col.length){
      for(let r=0;r<table.rows.length;r++) table.rows[r][c]=parsed[r];
    }
  }
}

// ==================== UI POPULATION ====================
function populateUiComponents(){
  if(!loadedData.length) return;
  const allVars=[];
  for(const ld of loadedData) for(const v of ld.varNames) if(!allVars.includes(v)) allVars.push(v);
  const dd=$('xDropdown');
  dd.innerHTML='<option value="__index__">-- Indice campione --</option>'+
    allVars.map(v=>'<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>').join('');

  yTableBody.innerHTML='';
  let autoPanel=1;
  for(const ld of loadedData){
    for(const v of ld.varNames){
      const tr=document.createElement('tr');
      tr.dataset.fileName=ld.fileName;
      tr.dataset.varName=v;
      tr.dataset.axisValue=(plotMode==='stacked')?String(autoPanel):'left';
      const def=v+' ('+ld.fileName+')';
      tr.innerHTML='<td><input type="checkbox"></td>'+
        '<td class="axis-cell"></td>'+
        '<td>'+escapeHtml(ld.fileName)+'</td>'+
        '<td style="color:#00ff66">'+escapeHtml(v)+'</td>'+
        '<td><input type="text" value="'+escapeHtml(def)+'"></td>';
      yTableBody.appendChild(tr);
      if(plotMode==='stacked') autoPanel=(autoPanel%MAX_PANELS)+1;
    }
  }
  rebuildAxisColumn();
  applyPlotModeUI();
  renderPreview(loadedData[loadedData.length-1]);
}

function renderPreview(ld){
  const maxR=Math.min(50,ld.rows.length);
  let html='<table class="preview"><thead><tr>';
  for(const v of ld.varNames) html+='<th>'+escapeHtml(v)+'</th>';
  html+='</tr></thead><tbody>';
  for(let r=0;r<maxR;r++){
    html+='<tr>';
    for(let c=0;c<ld.varNames.length;c++) html+='<td>'+escapeHtml(fmtPreview(ld.rows[r][c]))+'</td>';
    html+='</tr>';
  }
  html+='</tbody></table>';
  previewWrap.innerHTML=html;
}
function fmtPreview(v){
  if(v===null||v===undefined) return '';
  if(v instanceof Date) return v.toISOString().replace('T',' ').replace('Z','').slice(0,23);
  if(typeof v==='number') return Number.isInteger(v)?String(v):v.toFixed(4);
  return String(v);
}

$('xDropdown').addEventListener('change',()=>{
  const v=$('xDropdown').value;
  $('editXLabel').value=(v==='__index__')?'Indice campione':v;
});

// ==================== GENERATE PLOT ====================
$('btnPlot').addEventListener('click',generatePlot);

function generatePlot(){
  setStatus('> Generazione grafico...');
  const selected=[];
  yTableBody.querySelectorAll('tr').forEach(tr=>{
    const cb=tr.querySelector('input[type=checkbox]');
    if(cb&&cb.checked){
      selected.push({
        fileName:tr.dataset.fileName,
        varName:tr.dataset.varName,
        legendName:tr.querySelector('input[type=text]').value,
        axisValue:tr.dataset.axisValue||'left'
      });
    }
  });
  if(!selected.length){
    setStatus('> ⚠ Seleziona almeno un canale Y spuntando la casella.','err');
    return;
  }
  const xSel=$('xDropdown').value;
  currentTracks=[];

  try{
    for(const sel of selected){
      const ld=loadedData.find(l=>l.fileName===sel.fileName);
      if(!ld) continue;
      const colIdx=ld.varNames.indexOf(sel.varName);
      if(colIdx<0) continue;

      let xData,isDtX;
      if(xSel==='__index__'){
        xData=ld.rows.map((_,i)=>i+1);isDtX=false;
      }else{
        const xc=ld.varNames.indexOf(xSel);
        if(xc>=0){
          xData=ld.rows.map(r=>r[xc]);
          isDtX=xData.some(v=>v instanceof Date);
          if(!isDtX){
            xData=xData.map(v=>{
              if(v===null) return NaN;
              if(typeof v==='number') return v;
              const n=Number(String(v).replace(',','.'));
              return isNaN(n)?NaN:n;
            });
          }
        }else{
          xData=ld.rows.map((_,i)=>i+1);isDtX=false;
        }
      }

      const yData=ld.rows.map(r=>{
        const v=r[colIdx];
        if(v===null||v===undefined||v==='') return NaN;
        if(typeof v==='number') return v;
        const n=Number(String(v).replace(',','.'));
        return isNaN(n)?NaN:n;
      });

      const xC=[],yC=[];
      for(let i=0;i<xData.length;i++){
        const xv=xData[i],yv=yData[i];
        if(isDtX){
          if(xv instanceof Date&&!isNaN(xv.getTime())&&!isNaN(yv)){xC.push(xv);yC.push(yv);}
        }else{
          if(!isNaN(xv)&&!isNaN(yv)){xC.push(xv);yC.push(yv);}
        }
      }
      if(!xC.length) continue;

      let tYMin=Infinity,tYMax=-Infinity;
      for(const yv of yC){if(yv<tYMin)tYMin=yv; if(yv>tYMax)tYMax=yv;}

      const track={
        fileName:sel.fileName,varName:sel.varName,legendName:sel.legendName,
        xData:xC,yData:yC,isDatetime:isDtX,visible:true,
        yMin:tYMin,yMax:tYMax
      };
      if(plotMode==='stacked'){
        track.panel=parseInt(sel.axisValue,10)||1;
      } else {
        track.axis=sel.axisValue||'left';
      }
      currentTracks.push(track);
    }
    if(!currentTracks.length) throw new Error('Nessun dato valido rimasto dopo il filtraggio.');
    isDatetimeX=currentTracks[0].isDatetime;

    const first=currentTracks[0];
    const n=first.xData.length;
    cursor1={value:first.xData[Math.max(0,Math.floor(n*0.25))],isDatetime:first.isDatetime};
    cursor2={value:first.xData[Math.max(0,Math.floor(n*0.75))],isDatetime:first.isDatetime};

    viewXMin=null;viewXMax=null;
    viewYMinLeft=null;viewYMaxLeft=null;
    viewYMinRight=null;viewYMaxRight=null;
    viewYByPanel={};

    showPlotView();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      renderChart();
      syncCursorInputs();
      updateStats();
    }));
    const modeMsg=(plotMode==='stacked')
      ? '> Grafico a pannelli impilati generato. Rotella/Shift+rotella per zoom.'
      : '> Grafico singolo con doppio asse Y generato.';
    setStatus(modeMsg,'ok');
  }catch(err){
    console.error(err);
    setStatus('> Errore: '+err.message,'err');
  }
}

// ==================== PANEL COMPUTATION ====================
function computePanelsForRender(){
  // Ritorna { isStacked, panels: [{ origNumber, index, tracks, color }] }
  if(plotMode==='stacked'){
    const nums=new Set();
    for(const t of currentTracks) nums.add(t.panel||1);
    const sorted=[...nums].sort((a,b)=>a-b);
    const panels=sorted.map((n,i)=>({
      origNumber:n,
      index:i,
      color:PANEL_COLORS[i%PANEL_COLORS.length],
      tracks:currentTracks.filter(t=>(t.panel||1)===n)
    }));
    return {isStacked:true, panels};
  } else {
    // Modalità singola: due "pannelli virtuali" SX e DX sovrapposti
    const leftTracks=currentTracks.filter(t=>t.axis==='left');
    const rightTracks=currentTracks.filter(t=>t.axis==='right');
    return {
      isStacked:false,
      leftTracks,
      rightTracks,
      hasRight:rightTracks.length>0
    };
  }
}

// ==================== RENDER CHART ====================
function renderChart(){
  const container=plotCanvas.parentElement;
  if(!container) return;
  const W=container.clientWidth;
  const H=container.clientHeight;
  if(W<=0||H<=0) return;
  const dpr=window.devicePixelRatio||1;
  plotCanvas.width=W*dpr;
  plotCanvas.height=H*dpr;
  plotCanvas.style.width=W+'px';
  plotCanvas.style.height=H+'px';
  const ctx=plotCanvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#0c0c0c';
  ctx.fillRect(0,0,W,H);

  if(plotMode==='stacked'){
    renderStackedChart(ctx,W,H);
  } else {
    renderSingleChart(ctx,W,H);
  }
}

// ==================== STACKED RENDER ====================
function renderStackedChart(ctx,W,H){
  const info=computePanelsForRender();
  const panels=info.panels;
  if(!panels.length) return;

  // Margini esterni
  const margin={top:50, right:30, bottom:50, left:90};
  const plotW=W-margin.left-margin.right;
  const plotH=H-margin.top-margin.bottom;
  if(plotW<=0||plotH<=0) return;

  const gap=8;
  const panelCount=panels.length;
  const panelH=(plotH-gap*(panelCount-1))/panelCount;
  if(panelH<=0) return;

  // Range X globale
  const xR=getGlobalXRange();
  let xMin = viewXMin!==null ? viewXMin : xR.min;
  let xMax = viewXMax!==null ? viewXMax : xR.max;
  if(viewXMin===null){
    const pad=(xMax-xMin)*0.02;
    xMin-=pad;xMax+=pad;
  }
  const xToPx=v=>margin.left+((v-xMin)/(xMax-xMin))*plotW;

  // Calcola range Y per ogni pannello
  const useNormalized=(yScaleMode==='normalized');
  const useLog=(yScaleMode==='log');

  const panelRanges=panels.map((p,i)=>{
    const saved=viewYByPanel[p.origNumber];
    if(saved && saved.min!==null && saved.max!==null){
      return {min:saved.min,max:saved.max};
    }
    if(useNormalized) return {min:0,max:1};
    // Range dati
    let mn=Infinity,mx=-Infinity;
    for(const t of p.tracks){
      if(!t.visible) continue;
      for(const yv of t.yData){if(yv<mn)mn=yv; if(yv>mx)mx=yv;}
    }
    if(!isFinite(mn)||!isFinite(mx)){mn=0;mx=1;}
    if(mn===mx){mn-=1;mx+=1;}
    if(useLog){
      let lMin=Infinity,lMax=-Infinity;
      for(const t of p.tracks){
        if(!t.visible) continue;
        for(const yv of t.yData){
          if(yv>0){
            const lv=Math.log10(yv);
            if(lv<lMin)lMin=lv; if(lv>lMax)lMax=lv;
          }
        }
      }
      if(!isFinite(lMin)||lMin===lMax){lMin=0;lMax=1;}
      const pad=(lMax-lMin)*0.05;
      return {min:lMin-pad,max:lMax+pad};
    }
    const pad=(mx-mn)*0.05;
    return {min:mn-pad,max:mx+pad};
  });

  function transformY(v,t){
    if(useNormalized){
      const r=(t.yMax-t.yMin)||1;
      return (v-t.yMin)/r;
    }
    if(useLog){
      if(v<=0) return NaN;
      return Math.log10(v);
    }
    return v;
  }

  // Salva layout
  const panelBounds=[];
  for(let i=0;i<panelCount;i++){
    const py0=margin.top+i*(panelH+gap);
    panelBounds.push({y0:py0, y1:py0+panelH});
  }
  lastLayout={
    isStacked:true,
    margin,plotW,plotH,panelH,gap,
    panels,panelBounds,panelRanges,
    xMin,xMax,xToPx,
    useNormalized,useLog
  };

  // Font
  ctx.font='11px Consolas, monospace';

  // Cursori (attraversano tutti i pannelli)
  const cursorLines=[];
  for(const c of [cursor1,cursor2]){
    if(!c) continue;
    const cv=c.value instanceof Date?c.value.getTime():c.value;
    if(!isFinite(cv)) continue;
    const px=xToPx(cv);
    if(px<margin.left||px>margin.left+plotW) continue;
    cursorLines.push({x:px,cursor:c,color:c===cursor1?'#ff5555':'#ffaa00',label:c===cursor1?'C1':'C2'});
  }

  // Disegna ciascun pannello
  for(let i=0;i<panelCount;i++){
    const panel=panels[i];
    const range=panelRanges[i];
    const b=panelBounds[i];
    const py0=b.y0;
    const py1=b.y1;
    const pH=py1-py0;

    const yToPxRaw=v=>py1-((v-range.min)/(range.max-range.min))*pH;

    // Griglia Y orizzontale
    ctx.strokeStyle='#1e1e1e';
    ctx.lineWidth=1;
    const yTicks=niceTicks(range.min,range.max,5);
    ctx.textAlign='right';
    ctx.textBaseline='middle';
    for(const tv of yTicks){
      const py=yToPxRaw(tv);
      if(py<py0-1||py>py1+1) continue;
      ctx.beginPath();
      ctx.moveTo(margin.left,py);
      ctx.lineTo(margin.left+plotW,py);
      ctx.stroke();
      ctx.fillStyle=panel.color;
      ctx.font='10px Consolas, monospace';
      const label=useLog?'1e'+tv.toFixed(2):formatNum(tv);
      ctx.fillText(label,margin.left-8,py);
    }

    // Griglia X verticale
    const xTicks=isDatetimeX?datetimeTicks(xMin,xMax):niceTicks(xMin,xMax,8);
    ctx.strokeStyle='#161616';
    for(const tv of xTicks){
      const px=xToPx(tv);
      if(px<margin.left-1||px>margin.left+plotW+1) continue;
      ctx.beginPath();
      ctx.moveTo(px,py0);
      ctx.lineTo(px,py1);
      ctx.stroke();
    }

    // Bordo
    ctx.strokeStyle=panel.color;
    ctx.globalAlpha=0.5;
    ctx.lineWidth=1.2;
    ctx.strokeRect(margin.left,py0,plotW,pH);
    ctx.globalAlpha=1;

    // Tracce del pannello (clip)
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left,py0,plotW,pH);
    ctx.clip();

    for(const t of panel.tracks){
      if(!t.visible) continue;
      const globalIdx=currentTracks.indexOf(t);
      ctx.strokeStyle=trackColors[globalIdx%trackColors.length];
      ctx.lineWidth=1.5;
      ctx.beginPath();
      let started=false;
      for(let k=0;k<t.xData.length;k++){
        const xv=t.xData[k] instanceof Date?t.xData[k].getTime():t.xData[k];
        const yv=t.yData[k];
        const yt=transformY(yv,t);
        if(!isFinite(yt)||!isFinite(xv)){started=false;continue;}
        const px=xToPx(xv);
        const py=yToPxRaw(yt);
        if(!started){ctx.moveTo(px,py);started=true;}
        else ctx.lineTo(px,py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Label Y del pannello (ruotata a sinistra, verticale fuori dall'area)
    const panelLabel=getPanelLabel(panel.origNumber);
    ctx.save();
    ctx.translate(22,py0+pH/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillStyle=panel.color;
    ctx.font='bold 11px Consolas, monospace';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(panelLabel,0,0);
    ctx.restore();

    // Numero pannello nell'angolo
    ctx.fillStyle=panel.color;
    ctx.font='bold 10px Consolas, monospace';
    ctx.textAlign='left';
    ctx.textBaseline='top';
    ctx.fillText('P'+panel.origNumber,margin.left+6,py0+4);

    // Legenda pannello (solo nome)
    const legendItems=panel.tracks.map(t=>({
      name:t.legendName,
      color:trackColors[currentTracks.indexOf(t)%trackColors.length],
      visible:t.visible,
      track:t
    }));
    if(legendItems.length){
      ctx.font='10px Consolas, monospace';
      ctx.textAlign='left';
      ctx.textBaseline='middle';
      let maxW=0;
      for(const it of legendItems) maxW=Math.max(maxW,ctx.measureText(it.name).width);
      const lw=Math.min(maxW+30,plotW*0.55);
      const lh=legendItems.length*16+8;
      const lx=margin.left+plotW-lw-8;
      const ly=py0+6;
      ctx.fillStyle='rgba(12,12,12,0.9)';
      ctx.strokeStyle='#222';
      ctx.fillRect(lx,ly,lw,lh);
      ctx.strokeRect(lx,ly,lw,lh);
      for(let k=0;k<legendItems.length;k++){
        const it=legendItems[k];
        const iy=ly+10+k*16;
        ctx.fillStyle=it.visible?it.color:'#444';
        ctx.fillRect(lx+6,iy-1,12,3);
        ctx.fillStyle=it.visible?'#ddd':'#555';
        ctx.fillText(it.name,lx+24,iy);
        legendHits.push({
          x:lx,y:ly+4+k*16,w:lw,h:16,
          trackIndex:currentTracks.indexOf(it.track),
          panelIndex:i
        });
      }
    }
  }

  // Bordo di separazione fra pannelli: bordo superiore area plot
  ctx.strokeStyle='#333';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(margin.left,margin.top);
  ctx.lineTo(margin.left,margin.top+plotH);
  ctx.moveTo(margin.left+plotW,margin.top);
  ctx.lineTo(margin.left+plotW,margin.top+plotH);
  ctx.stroke();

  // Asse X in fondo (ultimo pannello)
  const lastPanel=panelBounds[panelCount-1];
  const xAxisY=lastPanel.y1;
  ctx.strokeStyle='#333';
  ctx.beginPath();
  ctx.moveTo(margin.left,xAxisY);
  ctx.lineTo(margin.left+plotW,xAxisY);
  ctx.stroke();

  const xTicksBottom=isDatetimeX?datetimeTicks(xMin,xMax):niceTicks(xMin,xMax,8);
  ctx.fillStyle='#888';
  ctx.font='11px Consolas, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='top';
  for(const tv of xTicksBottom){
    const px=xToPx(tv);
    if(px<margin.left-1||px>margin.left+plotW+1) continue;
    ctx.fillText(isDatetimeX?formatDateTick(tv,xMax-xMin):formatNum(tv),px,xAxisY+8);
  }

  // Etichetta asse X
  ctx.fillStyle='#888';
  ctx.fillText($('editXLabel').value,margin.left+plotW/2,H-15);

  // Cursori sopra tutto
  for(const cl of cursorLines){
    ctx.save();
    ctx.strokeStyle=cl.color;
    ctx.lineWidth=1.8;
    ctx.setLineDash([7,4]);
    ctx.beginPath();
    ctx.moveTo(cl.x,margin.top);
    ctx.lineTo(cl.x,lastPanel.y1);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle=cl.color;
    ctx.font='bold 11px Consolas, monospace';
    ctx.textAlign='center';
    ctx.textBaseline='bottom';
    ctx.fillText(cl.label,cl.x,margin.top-14);

    const valTxt=isDatetimeX?formatCursorValue(cl.cursor.value):formatNum(cl.cursor.value instanceof Date?cl.cursor.value.getTime():cl.cursor.value);
    ctx.font='10px Consolas, monospace';
    ctx.textBaseline='top';
    ctx.fillStyle=cl.color;
    ctx.fillText(valTxt,cl.x,margin.top-12);
  }

  // Box zoom
  if(mouseDown && !isPanning && mouseStartX!==mouseCurrentX){
    ctx.save();
    ctx.strokeStyle='#67c7ff';
    ctx.fillStyle='rgba(103,199,255,0.12)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([4,3]);
    const rx=Math.min(mouseStartX,mouseCurrentX);
    const rw=Math.abs(mouseCurrentX-mouseStartX);
    ctx.fillRect(rx,margin.top,rw,lastPanel.y1-margin.top);
    ctx.strokeRect(rx,margin.top,rw,lastPanel.y1-margin.top);
    ctx.restore();
  }

  // Titolo
  ctx.fillStyle='#00ff66';
  ctx.font='bold 13px Consolas, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText($('editTitle').value,W/2,20);
}

// ==================== SINGLE RENDER (con SX/DX) ====================
function renderSingleChart(ctx,W,H){
  const hasRightAxis=currentTracks.some(t=>t.axis==='right' && t.visible);
  const margin={top:50, right:hasRightAxis?85:30, bottom:50, left:80};
  const plotW=W-margin.left-margin.right;
  const plotH=H-margin.top-margin.bottom;
  if(plotW<=0||plotH<=0) return;

  const xR=getGlobalXRange();
  let xMin = viewXMin!==null ? viewXMin : xR.min;
  let xMax = viewXMax!==null ? viewXMax : xR.max;
  if(viewXMin===null){
    const pad=(xMax-xMin)*0.02;
    xMin-=pad;xMax+=pad;
  }

  function getRangeYForAxis(axis){
    let mn=Infinity,mx=-Infinity;
    for(const t of currentTracks){
      if(!t.visible) continue;
      if(t.axis!==axis) continue;
      for(const yv of t.yData){if(yv<mn)mn=yv; if(yv>mx)mx=yv;}
    }
    if(!isFinite(mn)||!isFinite(mx)) return null;
    if(mn===mx){mn-=1;mx+=1;}
    return {min:mn,max:mx};
  }

  const rangeLeft=getRangeYForAxis('left');
  const rangeRight=getRangeYForAxis('right');
  const useNormalized=(yScaleMode==='normalized');
  const useLog=(yScaleMode==='log');

  function computeAxisRange(range,viewMin,viewMax,tracksOfAxis){
    if(viewMin!==null && viewMax!==null) return {min:viewMin,max:viewMax};
    if(useNormalized) return {min:0,max:1};
    if(!range) return {min:0,max:1};
    if(useLog){
      let lMin=Infinity,lMax=-Infinity;
      for(const t of tracksOfAxis){
        if(!t.visible) continue;
        for(const yv of t.yData){
          if(yv>0){
            const lv=Math.log10(yv);
            if(lv<lMin)lMin=lv; if(lv>lMax)lMax=lv;
          }
        }
      }
      if(!isFinite(lMin)||lMin===lMax){lMin=0;lMax=1;}
      const pad=(lMax-lMin)*0.05;
      return {min:lMin-pad,max:lMax+pad};
    }
    const pad=(range.max-range.min)*0.05;
    return {min:range.min-pad,max:range.max+pad};
  }

  const tracksLeft=currentTracks.filter(t=>t.axis==='left');
  const tracksRight=currentTracks.filter(t=>t.axis==='right');
  const yRangeLeft=computeAxisRange(rangeLeft,viewYMinLeft,viewYMaxLeft,tracksLeft);
  const yRangeRight=computeAxisRange(rangeRight,viewYMinRight,viewYMaxRight,tracksRight);

  const xToPx=v=>margin.left+((v-xMin)/(xMax-xMin))*plotW;
  const yToPxLeftRaw=v=>margin.top+plotH-((v-yRangeLeft.min)/(yRangeLeft.max-yRangeLeft.min))*plotH;
  const yToPxRightRaw=v=>margin.top+plotH-((v-yRangeRight.min)/(yRangeRight.max-yRangeRight.min))*plotH;

  function transformY(v,t){
    if(useNormalized){const r=(t.yMax-t.yMin)||1;return (v-t.yMin)/r;}
    if(useLog){if(v<=0) return NaN;return Math.log10(v);}
    return v;
  }

  lastLayout={
    isStacked:false,
    margin,plotW,plotH,xMin,xMax,
    yRangeLeft,yRangeRight,
    xToPx,hasRightAxis,useNormalized,useLog
  };

  ctx.strokeStyle='#1e1e1e';
  ctx.lineWidth=1;
  ctx.font='11px Consolas, monospace';

  const xTicks=isDatetimeX?datetimeTicks(xMin,xMax):niceTicks(xMin,xMax,8);
  ctx.textAlign='center';
  ctx.textBaseline='top';
  for(const tv of xTicks){
    const px=xToPx(tv);
    if(px<margin.left-1||px>margin.left+plotW+1) continue;
    ctx.beginPath();ctx.moveTo(px,margin.top);ctx.lineTo(px,margin.top+plotH);ctx.stroke();
    ctx.fillStyle='#888';
    ctx.fillText(isDatetimeX?formatDateTick(tv,xMax-xMin):formatNum(tv),px,margin.top+plotH+8);
  }

  const yTicksLeft=niceTicks(yRangeLeft.min,yRangeLeft.max,8);
  ctx.textAlign='right';
  ctx.textBaseline='middle';
  for(const tv of yTicksLeft){
    const py=yToPxLeftRaw(tv);
    if(py<margin.top-1||py>margin.top+plotH+1) continue;
    ctx.beginPath();ctx.moveTo(margin.left,py);ctx.lineTo(margin.left+plotW,py);ctx.stroke();
    ctx.fillStyle=AXIS_COLOR_LEFT;
    ctx.fillText(useLog?'1e'+tv.toFixed(2):formatNum(tv),margin.left-8,py);
  }

  if(hasRightAxis){
    ctx.save();
    ctx.setLineDash([3,4]);
    ctx.strokeStyle='#1a2530';
    const yTicksRight=niceTicks(yRangeRight.min,yRangeRight.max,8);
    ctx.textAlign='left';
    for(const tv of yTicksRight){
      const py=yToPxRightRaw(tv);
      if(py<margin.top-1||py>margin.top+plotH+1) continue;
      ctx.beginPath();ctx.moveTo(margin.left,py);ctx.lineTo(margin.left+plotW,py);ctx.stroke();
      ctx.fillStyle=AXIS_COLOR_RIGHT;
      ctx.fillText(useLog?'1e'+tv.toFixed(2):formatNum(tv),margin.left+plotW+8,py);
    }
    ctx.restore();
  }

  ctx.strokeStyle='#222';
  ctx.strokeRect(margin.left,margin.top,plotW,plotH);

  if(hasRightAxis){
    ctx.strokeStyle=AXIS_COLOR_RIGHT;
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(margin.left+plotW,margin.top);ctx.lineTo(margin.left+plotW,margin.top+plotH);ctx.stroke();
  }
  ctx.strokeStyle=AXIS_COLOR_LEFT;
  ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(margin.left,margin.top);ctx.lineTo(margin.left,margin.top+plotH);ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left,margin.top,plotW,plotH);
  ctx.clip();

  for(let ti=0;ti<currentTracks.length;ti++){
    const t=currentTracks[ti];
    if(!t.visible) continue;
    ctx.strokeStyle=trackColors[ti%trackColors.length];
    ctx.lineWidth=1.5;
    ctx.beginPath();
    let started=false;
    const yToPx=(t.axis==='right')?yToPxRightRaw:yToPxLeftRaw;
    for(let i=0;i<t.xData.length;i++){
      const xv=t.xData[i] instanceof Date?t.xData[i].getTime():t.xData[i];
      const yv=t.yData[i];
      const yt=transformY(yv,t);
      if(!isFinite(yt)||!isFinite(xv)){started=false;continue;}
      const px=xToPx(xv);
      const py=yToPx(yt);
      if(!started){ctx.moveTo(px,py);started=true;}
      else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  ctx.restore();

  drawCursorLine(ctx,cursor1,'#ff5555','C1',margin,plotW,plotH,xToPx,isDatetimeX);
  drawCursorLine(ctx,cursor2,'#ffaa00','C2',margin,plotW,plotH,xToPx,isDatetimeX);

  if(mouseDown && !isPanning && mouseStartX!==mouseCurrentX){
    ctx.save();
    ctx.strokeStyle='#67c7ff';
    ctx.fillStyle='rgba(103,199,255,0.12)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([4,3]);
    const rx=Math.min(mouseStartX,mouseCurrentX);
    const rw=Math.abs(mouseCurrentX-mouseStartX);
    ctx.fillRect(rx,margin.top,rw,plotH);
    ctx.strokeRect(rx,margin.top,rw,plotH);
    ctx.restore();
  }

  ctx.fillStyle='#00ff66';
  ctx.font='bold 13px Consolas, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText($('editTitle').value,W/2,20);

  ctx.font='11px Consolas, monospace';
  ctx.fillStyle='#888';
  ctx.fillText($('editXLabel').value,margin.left+plotW/2,H-15);

  ctx.save();
  ctx.translate(15,margin.top+plotH/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillStyle=AXIS_COLOR_LEFT;
  let yLabelLeft=$('editYLabel').value;
  if(useNormalized) yLabelLeft+=' (norm. 0–1)';
  else if(useLog) yLabelLeft+=' (log10)';
  ctx.fillText(yLabelLeft,0,0);
  ctx.restore();

  if(hasRightAxis){
    ctx.save();
    ctx.translate(W-15,margin.top+plotH/2);
    ctx.rotate(Math.PI/2);
    ctx.fillStyle=AXIS_COLOR_RIGHT;
    let yLabelRight=$('editYLabelRight').value;
    if(useNormalized) yLabelRight+=' (norm. 0–1)';
    else if(useLog) yLabelRight+=' (log10)';
    ctx.fillText(yLabelRight,0,0);
    ctx.restore();
  }

  legendHits.length=0;
  ctx.font='10px Consolas, monospace';
  ctx.textAlign='left';
  ctx.textBaseline='middle';

  const legendItems=currentTracks.map((t,i)=>({
    name:t.legendName,
    color:trackColors[i%trackColors.length],
    visible:t.visible,
    index:i,
    axis:t.axis
  }));

  let maxLabelW=0;
  for(const it of legendItems){
    const prefix=(it.axis==='right'?'▸DX ':'▸SX ');
    maxLabelW=Math.max(maxLabelW,ctx.measureText(prefix+it.name).width);
  }
  const legendW=maxLabelW+34;
  const lineH=18;
  const legendH=legendItems.length*lineH+12;
  const legendX=margin.left+plotW-Math.min(legendW,plotW*0.55)-10;
  const legendY=margin.top+10;

  if(legendItems.length){
    ctx.fillStyle='rgba(12,12,12,0.92)';
    ctx.strokeStyle='#222';
    ctx.fillRect(legendX,legendY,Math.min(legendW,plotW*0.55),legendH);
    ctx.strokeRect(legendX,legendY,Math.min(legendW,plotW*0.55),legendH);
    for(let i=0;i<legendItems.length;i++){
      const it=legendItems[i];
      const iy=legendY+12+i*lineH;
      const axisColor=(it.axis==='right')?AXIS_COLOR_RIGHT:AXIS_COLOR_LEFT;
      ctx.fillStyle=it.visible?it.color:'#444';
      ctx.fillRect(legendX+8,iy-1,14,3);
      ctx.font='bold 9px Consolas, monospace';
      ctx.fillStyle=it.visible?axisColor:'#444';
      ctx.fillText(it.axis==='right'?'DX':'SX',legendX+26,iy);
      ctx.font='10px Consolas, monospace';
      ctx.fillStyle=it.visible?'#ddd':'#555';
      ctx.fillText(it.name,legendX+48,iy);
      legendHits.push({
        x:legendX,y:legendY+6+i*lineH,w:Math.min(legendW,plotW*0.55),h:lineH,
        trackIndex:it.index,
        panelIndex:0
      });
    }
  }
}

// ==================== HELPERS COMUNI ====================
function getGlobalXRange(){
  let mn=Infinity,mx=-Infinity,any=false;
  for(const t of currentTracks){
    if(!t.visible) continue;
    any=true;
    for(let i=0;i<t.xData.length;i++){
      const xv=t.xData[i] instanceof Date?t.xData[i].getTime():t.xData[i];
      if(xv<mn)mn=xv; if(xv>mx)mx=xv;
    }
  }
  if(!any){mn=0;mx=1;}
  if(!isFinite(mn)||mn===mx){mn-=1;mx+=1;}
  for(const c of [cursor1,cursor2]){
    if(!c) continue;
    const cv=c.value instanceof Date?c.value.getTime():c.value;
    if(isFinite(cv)){if(cv<mn)mn=cv; if(cv>mx)mx=cv;}
  }
  return {min:mn,max:mx};
}

function drawCursorLine(ctx,cursor,color,label,margin,plotW,plotH,xToPx,isDt){
  if(!cursor) return;
  const xv=cursor.value instanceof Date?cursor.value.getTime():cursor.value;
  if(!isFinite(xv)) return;
  const px=xToPx(xv);
  if(px<margin.left||px>margin.left+plotW) return;

  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=1.8;
  ctx.setLineDash([7,4]);
  ctx.beginPath();
  ctx.moveTo(px,margin.top);
  ctx.lineTo(px,margin.top+plotH);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle=color;
  ctx.font='bold 11px Consolas, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='bottom';
  ctx.fillText(label,px,margin.top-14);

  const valTxt=isDt?formatCursorValue(cursor.value):formatNum(xv);
  ctx.font='10px Consolas, monospace';
  ctx.textBaseline='top';
  ctx.fillStyle=color;
  ctx.fillText(valTxt,px,margin.top-12);
}

function niceTicks(min,max,count){
  if(max===min) return [min];
  const range=max-min;
  const rough=range/count;
  const mag=Math.pow(10,Math.floor(Math.log10(rough)));
  const norm=rough/mag;
  let step;
  if(norm<1.5) step=1*mag;
  else if(norm<3) step=2*mag;
  else if(norm<7) step=5*mag;
  else step=10*mag;
  const first=Math.ceil(min/step)*step;
  const ticks=[];
  for(let v=first;v<=max+step*0.001;v+=step) ticks.push(v);
  return ticks;
}

function datetimeTicks(minMs,maxMs){
  const span=maxMs-minMs;
  const candidates=[
    1,2,5,10,20,50,100,200,500,
    1000,2000,5000,10000,30000,
    60000,120000,300000,600000,1800000,
    3600000,7200000,21600000,43200000,
    86400000,172800000,604800000
  ];
  let step=candidates[candidates.length-1];
  for(const c of candidates){if(span/c<=10){step=c;break;}}
  const first=Math.ceil(minMs/step)*step;
  const ticks=[];
  for(let v=first;v<=maxMs;v+=step) ticks.push(v);
  return ticks;
}

function formatNum(v){
  if(v===0) return '0';
  const abs=Math.abs(v);
  if(abs>=1e6||abs<1e-3) return v.toExponential(2);
  return Number(v.toPrecision(6)).toString();
}

function formatDateTick(ms,span){
  const d=new Date(ms);
  const pad=(n,l=2)=>String(n).padStart(l,'0');
  if(span<1000) return pad(d.getSeconds())+'.'+pad(d.getMilliseconds(),3);
  if(span<60000) return pad(d.getMinutes())+':'+pad(d.getSeconds());
  if(span<3600000) return pad(d.getHours())+':'+pad(d.getMinutes());
  if(span<86400000) return pad(d.getHours())+':'+pad(d.getMinutes());
  return pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}

// Legenda click
plotCanvas.addEventListener('click',(e)=>{
  const rect=plotCanvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  for(const hit of legendHits){
    if(x>=hit.x&&x<=hit.x+hit.w&&y>=hit.y&&y<=hit.y+hit.h){
      currentTracks[hit.trackIndex].visible=!currentTracks[hit.trackIndex].visible;
      renderChart();
      updateStats();
      return;
    }
  }
});

// ==================== ZOOM / PAN / HOVER ====================
function getMouseXY(e){
  const rect=plotCanvas.getBoundingClientRect();
  return {x:e.clientX-rect.left, y:e.clientY-rect.top, clientX:e.clientX, clientY:e.clientY};
}

plotCanvas.addEventListener('wheel',(e)=>{
  if(!lastLayout) return;
  e.preventDefault();
  const {x,y}=getMouseXY(e);
  const L=lastLayout;
  if(x<L.margin.left||x>L.margin.left+L.plotW) return;

  const zoomFactor=e.deltaY<0?0.85:1/0.85;

  if(e.shiftKey){
    if(L.isStacked){
      // Trova il pannello sotto il mouse
      let pIdx=-1;
      for(let i=0;i<L.panelBounds.length;i++){
        if(y>=L.panelBounds[i].y0 && y<=L.panelBounds[i].y1){pIdx=i;break;}
      }
      if(pIdx<0) return;
      const range=L.panelRanges[pIdx];
      const yc=(range.min+range.max)/2;
      const half=(range.max-range.min)/2*zoomFactor;
      const orig=L.panels[pIdx].origNumber;
      viewYByPanel[orig]={min:yc-half, max:yc+half};
    } else {
      const centerX=L.margin.left+L.plotW/2;
      const useRight=L.hasRightAxis && x>centerX;
      const range=useRight?L.yRangeRight:L.yRangeLeft;
      const yc=(range.min+range.max)/2;
      const half=(range.max-range.min)/2*zoomFactor;
      if(useRight){viewYMinRight=yc-half;viewYMaxRight=yc+half;}
      else {viewYMinLeft=yc-half;viewYMaxLeft=yc+half;}
    }
  } else {
    const xMouse=L.xMin+((x-L.margin.left)/L.plotW)*(L.xMax-L.xMin);
    const newRange=(L.xMax-L.xMin)*zoomFactor;
    const frac=(xMouse-L.xMin)/(L.xMax-L.xMin);
    viewXMin=xMouse-frac*newRange;
    viewXMax=xMouse+(1-frac)*newRange;
  }
  renderChart();
},{passive:false});

plotCanvas.addEventListener('mousedown',(e)=>{
  if(!lastLayout) return;
  const {x,y}=getMouseXY(e);
  const L=lastLayout;
  if(x<L.margin.left||x>L.margin.left+L.plotW) return;
  if(y<L.margin.top||y>L.margin.top+L.plotH) return;

  if(e.button===2 || e.ctrlKey || e.metaKey){
    isPanning=true;
    const start={xMin:L.xMin,xMax:L.xMax,mouseX:x,mouseY:y,isStacked:L.isStacked};
    if(L.isStacked){
      start.yByPanel={};
      for(const p of L.panels){
        const r=L.panelRanges[L.panels.indexOf(p)];
        start.yByPanel[p.origNumber]={min:r.min,max:r.max};
      }
    } else {
      start.yMinL=L.yRangeLeft.min;start.yMaxL=L.yRangeLeft.max;
      start.yMinR=L.yRangeRight.min;start.yMaxR=L.yRangeRight.max;
    }
    panStartView=start;
    plotCanvas.style.cursor='grabbing';
    e.preventDefault();
    return;
  }
  if(e.button!==0) return;

  mouseDown=true;
  mouseStartX=x;mouseStartY=y;
  mouseCurrentX=x;mouseCurrentY=y;
});

plotCanvas.addEventListener('mousemove',(e)=>{
  if(!lastLayout) return;
  const {x,y,clientX,clientY}=getMouseXY(e);
  const L=lastLayout;

  if(isPanning && panStartView){
    const dx=x-panStartView.mouseX;
    const dy=y-panStartView.mouseY;
    const dxData=(dx/L.plotW)*(panStartView.xMax-panStartView.xMin);
    viewXMin=panStartView.xMin-dxData;
    viewXMax=panStartView.xMax-dxData;

    if(L.isStacked){
      for(const origStr of Object.keys(panStartView.yByPanel)){
        const orig=parseInt(origStr,10);
        const s=panStartView.yByPanel[origStr];
        const dyData=(dy/L.plotH)*(s.max-s.min);
        viewYByPanel[orig]={min:s.min+dyData, max:s.max+dyData};
      }
    } else {
      const dyDataL=(dy/L.plotH)*(panStartView.yMaxL-panStartView.yMinL);
      viewYMinLeft=panStartView.yMinL+dyDataL;
      viewYMaxLeft=panStartView.yMaxL+dyDataL;
      const dyDataR=(dy/L.plotH)*(panStartView.yMaxR-panStartView.yMinR);
      viewYMinRight=panStartView.yMinR+dyDataR;
      viewYMaxRight=panStartView.yMaxR+dyDataR;
    }
    renderChart();
    return;
  }

  if(mouseDown){
    mouseCurrentX=x;mouseCurrentY=y;
    renderChart();
    return;
  }

  if(x>=L.margin.left && x<=L.margin.left+L.plotW &&
     y>=L.margin.top && y<=L.margin.top+L.plotH){
    if(L.isStacked){
      hoverPanelIndex=0;
      for(let i=0;i<L.panelBounds.length;i++){
        if(y>=L.panelBounds[i].y0 && y<=L.panelBounds[i].y1){hoverPanelIndex=i;break;}
      }
    }
    showTooltip(clientX,clientY,L,x);
  } else {
    chartTooltip.style.display='none';
  }
});

window.addEventListener('mouseup',(e)=>{
  if(isPanning){
    isPanning=false;
    panStartView=null;
    plotCanvas.style.cursor='crosshair';
    return;
  }
  if(mouseDown){
    const L=lastLayout;
    mouseDown=false;
    if(L && Math.abs(mouseCurrentX-mouseStartX)>5){
      const x1=L.xMin+((Math.min(mouseStartX,mouseCurrentX)-L.margin.left)/L.plotW)*(L.xMax-L.xMin);
      const x2=L.xMin+((Math.max(mouseStartX,mouseCurrentX)-L.margin.left)/L.plotW)*(L.xMax-L.xMin);
      viewXMin=x1;viewXMax=x2;
    }
    mouseStartX=mouseCurrentX;mouseStartY=mouseCurrentY;
    renderChart();
  }
});

plotCanvas.addEventListener('dblclick',(e)=>{
  e.preventDefault();
  viewXMin=null;viewXMax=null;
  viewYMinLeft=null;viewYMaxLeft=null;
  viewYMinRight=null;viewYMaxRight=null;
  viewYByPanel={};
  renderChart();
  setStatus('> Zoom resettato.','ok');
});

plotCanvas.addEventListener('contextmenu',(e)=>e.preventDefault());
plotCanvas.addEventListener('mouseleave',()=>{
  chartTooltip.style.display='none';
});

// ==================== TOOLTIP ====================
function showTooltip(clientX,clientY,L,xPx){
  if(!currentTracks.length){chartTooltip.style.display='none';return;}
  const xVal=L.xMin+((xPx-L.margin.left)/L.plotW)*(L.xMax-L.xMin);

  const tracksToShow=[];
  if(L.isStacked){
    const panel=L.panels[hoverPanelIndex];
    if(panel){
      for(const t of panel.tracks) tracksToShow.push(t);
    }
  } else {
    for(const t of currentTracks) tracksToShow.push(t);
  }

  const lines=[];
  for(const t of tracksToShow){
    if(!t.visible) continue;
    let bestIdx=-1,bestDist=Infinity;
    for(let i=0;i<t.xData.length;i++){
      const xv=t.xData[i] instanceof Date?t.xData[i].getTime():t.xData[i];
      const d=Math.abs(xv-xVal);
      if(d<bestDist){bestDist=d;bestIdx=i;}
    }
    if(bestIdx<0) continue;
    lines.push({name:t.legendName,color:trackColors[currentTracks.indexOf(t)%trackColors.length]});
  }
  if(!lines.length){chartTooltip.style.display='none';return;}

  let html='';
  for(const l of lines){
    html+='<div class="tt-row">'+
      '<span class="tt-color" style="background:'+l.color+'"></span>'+
      '<span class="tt-name">'+escapeHtml(l.name)+'</span>'+
    '</div>';
  }
  chartTooltip.innerHTML=html;
  chartTooltip.style.display='block';

  const contRect=plotContainer.getBoundingClientRect();
  let ttX=clientX-contRect.left+15;
  let ttY=clientY-contRect.top+15;
  const ttW=chartTooltip.offsetWidth;
  const ttH=chartTooltip.offsetHeight;
  if(ttX+ttW>contRect.width) ttX=clientX-contRect.left-ttW-15;
  if(ttY+ttH>contRect.height) ttY=clientY-contRect.top-ttH-15;
  chartTooltip.style.left=ttX+'px';
  chartTooltip.style.top=ttY+'px';
}

// ==================== ZOOM BUTTONS ====================
function zoomByFactor(f){
  if(!lastLayout) return;
  const L=lastLayout;
  const xc=(L.xMin+L.xMax)/2;
  const halfRange=(L.xMax-L.xMin)/2*f;
  viewXMin=xc-halfRange;
  viewXMax=xc+halfRange;
  renderChart();
}
$('btnZoomIn').addEventListener('click',()=>zoomByFactor(0.8));
$('btnZoomOut').addEventListener('click',()=>zoomByFactor(1/0.8));
$('btnZoomReset').addEventListener('click',()=>{
  viewXMin=null;viewXMax=null;
  viewYMinLeft=null;viewYMaxLeft=null;
  viewYMinRight=null;viewYMaxRight=null;
  viewYByPanel={};
  renderChart();
  setStatus('> Zoom resettato.','ok');
});

$('yScaleMode').addEventListener('change',(e)=>{
  yScaleMode=e.target.value;
  viewYMinLeft=null;viewYMaxLeft=null;
  viewYMinRight=null;viewYMaxRight=null;
  viewYByPanel={};
  renderChart();
  const labels={auto:'Auto (range comune)',normalized:'Normalizzata (0–1)',log:'Logaritmica (log10)'};
  setStatus('> Scala Y: '+labels[yScaleMode],'ok');
});

// ==================== CURSOR INPUT ====================
function formatCursorValue(v){
  if(v instanceof Date){
    const pad=(n,l=2)=>String(n).padStart(l,'0');
    return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate())+' '+
           pad(v.getHours())+':'+pad(v.getMinutes())+':'+pad(v.getSeconds())+'.'+pad(v.getMilliseconds(),3);
  }
  const num=Number(v);
  if(!isFinite(num)) return '';
  if(Number.isInteger(num)) return String(num);
  return String(Number(num.toPrecision(10)));
}

function parseCursorValue(s){
  s=String(s).trim();
  if(!s) return null;
  if(isDatetimeX){
    const t=s.replace(/\//g,'-').replace(' ','T');
    const d=new Date(t);
    if(isNaN(d.getTime())) return null;
    return d;
  }
  const n=Number(s.replace(',','.'));
  return isNaN(n)?null:n;
}

function syncCursorInputs(){
  if(!cursor1||!cursor2) return;
  $('cursorInput1').value=formatCursorValue(cursor1.value);
  $('cursorInput2').value=formatCursorValue(cursor2.value);
}

function applyCursorInputs(){
  if(!cursor1||!cursor2) return;
  const i1=$('cursorInput1'), i2=$('cursorInput2');
  i1.classList.remove('err');
  i2.classList.remove('err');
  const v1=parseCursorValue(i1.value);
  const v2=parseCursorValue(i2.value);
  let ok=true;
  if(v1===null){i1.classList.add('err');ok=false;}
  if(v2===null){i2.classList.add('err');ok=false;}
  if(!ok){
    setStatus('> ⚠ Valore cursore non valido. '+(isDatetimeX?'Formato: YYYY-MM-DD HH:mm:ss.SSS':'Atteso un numero.'),'err');
    return;
  }
  cursor1.value=v1;
  cursor2.value=v2;
  renderChart();
  updateStats();
  setStatus('> Cursori aggiornati.','ok');
}

function resetCursors(){
  if(!currentTracks||!currentTracks.length) return;
  const first=currentTracks[0];
  const n=first.xData.length;
  cursor1.value=first.xData[Math.max(0,Math.floor(n*0.25))];
  cursor2.value=first.xData[Math.max(0,Math.floor(n*0.75))];
  syncCursorInputs();
  renderChart();
  updateStats();
  setStatus('> Cursori reimpostati (25% / 75%).','ok');
}

$('btnApplyCursor').addEventListener('click',applyCursorInputs);
$('btnResetCursor').addEventListener('click',resetCursors);
$('cursorInput1').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCursorInputs();}});
$('cursorInput2').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCursorInputs();}});
$('cursorInput1').addEventListener('change',applyCursorInputs);
$('cursorInput2').addEventListener('change',applyCursorInputs);

// ==================== STATISTICS + FFT ====================
function updateStats(){
  if(!cursor1||!cursor2) return;

  let v1=cursor1.value,v2=cursor2.value;
  let t1=v1 instanceof Date?v1.getTime():v1;
  let t2=v2 instanceof Date?v2.getTime():v2;
  if(t1>t2){[v1,v2]=[v2,v1];[t1,t2]=[t2,t1];}

  let header;
  if(isDatetimeX){
    header='=== REPORT MULTI-FILE TEMPORALE ===\nDurata Intervallo (ΔX): '+formatDuration((t2-t1)/1000)+'\n';
  }else{
    header='=== REPORT MULTI-FILE NUMERICO ===\nDistanza Campioni (ΔX): '+(t2-t1).toFixed(3)+'\n';
  }
  header+='='.repeat(65)+'\n\n';

  let statsTxt=header;
  let fftTxt=header+'Picchi spettrali dominanti nell\'intervallo per traccia:\n\n';
  const fftTraces=[];

  for(let ti=0;ti<currentTracks.length;ti++){
    const track=currentTracks[ti];
    if(!track.visible) continue;
    const xSel=[],ySel=[];
    for(let i=0;i<track.xData.length;i++){
      const xv=track.xData[i];
      const xt=xv instanceof Date?xv.getTime():xv;
      if(xt>=t1&&xt<=t2){xSel.push(xt);ySel.push(track.yData[i]);}
    }
    if(!ySel.length) continue;

    const mean=avg(ySel);
    const rms=Math.sqrt(avg(ySel.map(v=>v*v)));
    const std=stdDev(ySel,mean);
    const maxV=Math.max(...ySel);
    const minV=Math.min(...ySel);
    const dY=ySel[ySel.length-1]-ySel[0];

    let xNum;
    if(track.isDatetime) xNum=xSel.map(v=>(v-xSel[0])/1000);
    else xNum=xSel.slice();
    const integral=trapz(xNum,ySel);

    let modeTag='';
    if(plotMode==='stacked') modeTag=' [P'+track.panel+']';
    else modeTag=(track.axis==='right')?' [asse DX]':' [asse SX]';

    statsTxt+='📌 File: '+track.fileName+'\n'+
      '  Canale: '+track.varName+' [Legenda: '+track.legendName+']'+modeTag+'\n'+
      '  Media: '+mean.toFixed(3)+' | RMS: '+rms.toFixed(3)+' | Dev.Std(σ): '+std.toFixed(3)+'\n'+
      '  Max: '+maxV.toFixed(3)+' | Min: '+minV.toFixed(3)+' | ΔY: '+dY.toFixed(3)+' | Area ∫: '+integral.toFixed(3)+'\n'+
      '-'.repeat(65)+'\n';

    const N=ySel.length;
    if(N>4){
      let dtSum=0;
      for(let i=1;i<xNum.length;i++) dtSum+=xNum[i]-xNum[i-1];
      const dt=dtSum/(xNum.length-1);
      let fs=1/(dt+1e-12);
      if(dt<=0) fs=1;

      const yDetrend=ySel.map(v=>v-mean);
      const {f,P1}=computeFFT(yDetrend,fs,N);

      fftTraces.push({
        f:Array.from(f),P1:Array.from(P1),
        name:track.legendName,
        color:trackColors[ti%trackColors.length]
      });

      const validIdx=[];
      for(let i=0;i<f.length;i++) if(f[i]>0) validIdx.push(i);
      validIdx.sort((a,b)=>P1[b]-P1[a]);
      const numPeaks=Math.min(5,validIdx.length);

      fftTxt+='  [Fs: '+fs.toFixed(2)+' Hz | Campioni: '+N+']\n';
      for(let k=0;k<numPeaks;k++){
        const idx=validIdx[k];
        fftTxt+='   ⚡ Freq = '+f[idx].toFixed(3)+' Hz  |  Ampiezza = '+P1[idx].toFixed(4)+'\n';
      }
    }else{
      fftTxt+='  ⚠️ Campioni insufficienti nell\'intervallo per FFT.\n';
    }
    fftTxt+='-'.repeat(60)+'\n';
  }

  lastStatsText=statsTxt;
  lastFFTText=fftTxt;
  lastFFTTraces=fftTraces;

  statsTextEl.textContent=statsTxt;
  fftTextEl.textContent=fftTxt;

  if(popupWindow && !popupWindow.closed){
    try{
      const doc=popupWindow.document;
      const pStats=doc.getElementById('popupStatsText');
      const pFft=doc.getElementById('popupFftText');
      if(pStats) pStats.textContent=statsTxt;
      if(pFft) pFft.textContent=fftTxt;
    }catch(e){}
  }

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    renderFFTChartOn(fftCanvasMain,lastFFTTraces);
    if(popupWindow && !popupWindow.closed){
      const pc=popupWindow.document.getElementById('popupFftCanvas');
      if(pc) renderFFTChartOn(pc,lastFFTTraces);
    }
  }));
}

function renderFFTChartOn(canvas,traces){
  if(!canvas) return;
  const container=canvas.parentElement;
  if(!container) return;
  const W=container.clientWidth;
  const H=container.clientHeight;
  if(W<10||H<10) return;
  const dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr;
  canvas.height=H*dpr;
  canvas.style.width=W+'px';
  canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#0c0c0c';
  ctx.fillRect(0,0,W,H);

  if(!traces||!traces.length){
    ctx.fillStyle='#555';
    ctx.font='11px Consolas, monospace';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('Nessun dato FFT disponibile',W/2,H/2);
    return;
  }

  const margin={top:35,right:20,bottom:35,left:55};
  const plotW=W-margin.left-margin.right;
  const plotH=H-margin.top-margin.bottom;
  if(plotW<=0||plotH<=0) return;

  let fMin=Infinity,fMax=-Infinity,aMax=-Infinity;
  for(const t of traces){
    for(let i=0;i<t.f.length;i++){
      if(t.f[i]<=0) continue;
      if(t.f[i]<fMin)fMin=t.f[i];
      if(t.f[i]>fMax)fMax=t.f[i];
      if(t.P1[i]>aMax)aMax=t.P1[i];
    }
  }
  if(!isFinite(fMin)||fMin===fMax){fMin=0;fMax=1;}
  if(!isFinite(aMax)||aMax<=0) aMax=1;
  aMax*=1.05;
  const fToPx=v=>margin.left+((v-fMin)/(fMax-fMin))*plotW;
  const aToPx=v=>margin.top+plotH-(v/aMax)*plotH;

  ctx.strokeStyle='#1e1e1e';
  ctx.lineWidth=1;
  ctx.font='10px Consolas, monospace';
  const fTicks=niceTicks(fMin,fMax,7);
  ctx.textAlign='center';
  ctx.textBaseline='top';
  for(const tv of fTicks){
    const px=fToPx(tv);
    if(px<margin.left-1||px>margin.left+plotW+1) continue;
    ctx.beginPath();ctx.moveTo(px,margin.top);ctx.lineTo(px,margin.top+plotH);ctx.stroke();
    ctx.fillStyle='#888';
    ctx.fillText(formatNum(tv),px,margin.top+plotH+6);
  }
  const aTicks=niceTicks(0,aMax,6);
  ctx.textAlign='right';
  ctx.textBaseline='middle';
  for(const tv of aTicks){
    const py=aToPx(tv);
    if(py<margin.top-1||py>margin.top+plotH+1) continue;
    ctx.beginPath();ctx.moveTo(margin.left,py);ctx.lineTo(margin.left+plotW,py);ctx.stroke();
    ctx.fillStyle='#888';
    ctx.fillText(formatNum(tv),margin.left-6,py);
  }
  ctx.strokeStyle='#222';
  ctx.strokeRect(margin.left,margin.top,plotW,plotH);

  for(const t of traces){
    ctx.strokeStyle=t.color;
    ctx.lineWidth=1.4;
    ctx.beginPath();
    let started=false;
    for(let i=0;i<t.f.length;i++){
      if(t.f[i]<=0) continue;
      const px=fToPx(t.f[i]);
      const py=aToPx(t.P1[i]);
      if(!started){ctx.moveTo(px,py);started=true;}
      else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }

  ctx.fillStyle='#00ff66';
  ctx.font='bold 11px Consolas, monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('Spettro di Frequenza Comparativo (FFT)',W/2,14);

  ctx.fillStyle='#888';
  ctx.font='10px Consolas, monospace';
  ctx.fillText('Frequenza [Hz]',margin.left+plotW/2,H-8);
  ctx.save();
  ctx.translate(12,margin.top+plotH/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('Ampiezza',0,0);
  ctx.restore();

  ctx.font='9px Consolas, monospace';
  ctx.textAlign='left';
  ctx.textBaseline='middle';
  let maxLabelW=0;
  for(const t of traces) maxLabelW=Math.max(maxLabelW,ctx.measureText(t.name).width);
  const legendW=maxLabelW+28;
  const legendH=traces.length*14+10;
  const legendX=margin.left+plotW-legendW-6;
  const legendY=margin.top+6;
  ctx.fillStyle='rgba(12,12,12,0.85)';
  ctx.strokeStyle='#222';
  ctx.fillRect(legendX,legendY,legendW,legendH);
  ctx.strokeRect(legendX,legendY,legendW,legendH);
  for(let i=0;i<traces.length;i++){
    const iy=legendY+10+i*14;
    ctx.fillStyle=traces[i].color;
    ctx.fillRect(legendX+6,iy-1,10,2.5);
    ctx.fillStyle='#aaa';
    ctx.fillText(traces[i].name,legendX+22,iy);
  }
}

function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function stdDev(a,m){if(a.length<2) return 0;return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1));}
function trapz(x,y){let s=0;for(let i=1;i<x.length;i++) s+=(x[i]-x[i-1])*(y[i]+y[i-1])/2;return s;}
function formatDuration(s){
  if(s<0.001) return (s*1e6).toFixed(3)+' µs';
  if(s<1) return (s*1000).toFixed(3)+' ms';
  if(s<60) return s.toFixed(3)+' s';
  if(s<3600) return (s/60).toFixed(2)+' min';
  return (s/3600).toFixed(2)+' ore';
}

// ==================== FFT ====================
function computeFFT(y,fs,Norig){
  const N=y.length;
  let Np=1; while(Np<N) Np<<=1;
  const re=new Float64Array(Np), im=new Float64Array(Np);
  for(let i=0;i<N;i++) re[i]=y[i];
  fftInPlace(re,im);
  const half=Math.floor(Np/2)+1;
  const P2=new Float64Array(half);
  for(let i=0;i<half;i++) P2[i]=Math.hypot(re[i],im[i])/Norig;
  const P1=new Float64Array(half);
  P1[0]=P2[0];
  for(let i=1;i<half-1;i++) P1[i]=2*P2[i];
  if(half>1) P1[half-1]=P2[half-1];
  const f=new Float64Array(half);
  for(let i=0;i<half;i++) f[i]=fs*i/Np;
  return {f,P1};
}

function fftInPlace(re,im){
  const n=re.length;
  let j=0;
  for(let i=0;i<n;i++){
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
    let m=n>>1;
    while(m>=1&&j>=m){j-=m;m>>=1;}
    j+=m;
  }
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len;
    const wRe=Math.cos(ang),wIm=Math.sin(ang);
    for(let i=0;i<n;i+=len){
      let cRe=1,cIm=0;
      for(let k=0;k<len/2;k++){
        const uRe=re[i+k],uIm=im[i+k];
        const vRe=re[i+k+len/2]*cRe-im[i+k+len/2]*cIm;
        const vIm=re[i+k+len/2]*cIm+im[i+k+len/2]*cRe;
        re[i+k]=uRe+vRe;im[i+k]=uIm+vIm;
        re[i+k+len/2]=uRe-vRe;im[i+k+len/2]=uIm-vIm;
        const nRe=cRe*wRe-cIm*wIm;
        const nIm=cRe*wIm+cIm*wRe;
        cRe=nRe;cIm=nIm;
      }
    }
  }
}

// ==================== EXPORT REPORT ====================
$('btnExportReport').addEventListener('click',()=>{
  if(!currentTracks||!currentTracks.length){
    setStatus('> ⚠ Nessun dato da esportare. Genera prima il grafico.','err');
    return;
  }
  const now=new Date();
  const pad=(n,l=2)=>String(n).padStart(l,'0');
  const ts=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'_'+
           pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds());

  let out='';
  out+='╔'+'═'.repeat(72)+'╗\n';
  out+='║  DATA ANALYSIS TOOL — REPORT DI ANALISI\n';
  out+='║  Data: '+now.toLocaleString('it-IT')+'\n';
  out+='║  Titolo grafico: '+$('editTitle').value+'\n';
  out+='║  Modalità: '+(plotMode==='stacked'?'Impilato (multi-pannello)':'Singolo (SX/DX)')+'\n';
  out+='║  Asse X: '+$('editXLabel').value+'\n';
  if(plotMode==='stacked'){
    const usedPanels=[...new Set(currentTracks.map(t=>t.panel))].sort((a,b)=>a-b);
    out+='║  Pannelli: '+usedPanels.map(n=>'P'+n+' ('+getPanelLabel(n)+')').join(' · ')+'\n';
  } else {
    out+='║  Asse Y SX: '+$('editYLabel').value+'   |   Asse Y DX: '+$('editYLabelRight').value+'\n';
  }
  out+='║  Scala Y: '+$('yScaleMode').value+'\n';
  out+='╚'+'═'.repeat(72)+'╝\n\n';

  out+='── CONFIGURAZIONE CURSORI ──────────────────────────────────────\n';
  out+='C1: '+(cursor1?(cursor1.value instanceof Date?formatCursorValue(cursor1.value):formatNum(cursor1.value)):'-')+'\n';
  out+='C2: '+(cursor2?(cursor2.value instanceof Date?formatCursorValue(cursor2.value):formatNum(cursor2.value)):'-')+'\n\n';

  out+='\n';
  out+=lastStatsText||'(nessuna statistica)\n';
  out+='\n\n';
  out+='────────────────────────────────────────────────────────────────\n';
  out+='SPETTRO FFT — PICCHI DOMINANTI\n';
  out+='────────────────────────────────────────────────────────────────\n';
  out+=lastFFTText||'(nessun dato FFT)\n';

  out+='\n\n';
  out+='── TRACCE INCLUSE ─────────────────────────────────────────────\n';
  for(let i=0;i<currentTracks.length;i++){
    const t=currentTracks[i];
    let tag='';
    if(plotMode==='stacked') tag='[P'+t.panel+']';
    else tag='['+(t.axis==='right'?'DX':'SX')+']';
    out+=(i+1)+'. '+tag+' '+t.legendName+' | File: '+t.fileName+' | Canale: '+t.varName+
      ' | Y-range: '+formatNum(t.yMin)+' … '+formatNum(t.yMax)+
      ' | '+(t.visible?'VISIBILE':'nascosta')+' | '+t.xData.length+' campioni\n';
  }

  const blob=new Blob([out],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='DataAnalysis_Report_'+ts+'.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setStatus('> Report esportato: DataAnalysis_Report_'+ts+'.txt','ok');
});

// ==================== POPUP ====================
$('btnPopupTabs').addEventListener('click',togglePopup);

function togglePopup(){
  if(popupWindow && !popupWindow.closed){
    popupWindow.close();
    return;
  }
  openPopup();
}

function openPopup(){
  const popup=window.open('','daTabsPopup',
    'width=1200,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no');
  if(!popup){
    alert('La finestra popup è stata bloccata dal browser.\nConsenti i popup per questa pagina e riprova.');
    return;
  }
  popupWindow=popup;

  const popupHtml=
    '<!DOCTYPE html>'+
    '<html lang="it"><head><meta charset="UTF-8">'+
    '<title>Analisi Avanzata — Data Analysis Tool</title>'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0}'+
    'html,body{height:100%;width:100%;background:#0c0c0c;color:#00ff66;font-family:Consolas,"Courier New",monospace;overflow:hidden}'+
    'body{padding:8px;display:flex;flex-direction:column;gap:8px}'+
    'button{font:inherit;cursor:pointer}'+
    '.popup-header{display:flex;align-items:center;gap:10px;background:#121212;border:1px solid #222;border-radius:6px;padding:7px 12px;font-size:.8em;flex-shrink:0}'+
    '.popup-title{color:#00ff66;font-weight:bold;letter-spacing:2px;text-transform:uppercase;font-size:.95em}'+
    '.popup-spacer{flex:1}'+
    '.popup-btn{background:#1a1a1a;color:#00ff66;border:1px solid #333;border-radius:4px;padding:6px 14px;font-size:.85em}'+
    '.popup-btn:hover{border-color:#00ff66;background:#222}'+
    '.popup-tabs-container{background:#121212;border:1px solid #222;border-radius:6px;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}'+
    '.popup-tabs{display:flex;background:#0c0c0c;border-bottom:1px solid #1e1e1e;flex-shrink:0}'+
    '.popup-tab{padding:9px 18px;border:none;background:transparent;color:#666;cursor:pointer;font-size:.75em;font-family:inherit;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid transparent}'+
    '.popup-tab.active{color:#00ff66;border-bottom-color:#00ff66;background:#121212}'+
    '.popup-tab:hover{color:#00ff66}'+
    '.popup-tab-body{flex:1;position:relative;min-height:0}'+
    '.popup-tab-pane{display:none;height:100%;padding:10px;overflow:auto}'+
    '.popup-tab-pane.active{display:block}'+
    '.popup-tab-pane pre{font-family:Consolas,monospace;font-size:.7em;white-space:pre-wrap;color:#aaa;margin:0;line-height:1.45}'+
    '.popup-fft-layout{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;height:100%}'+
    '.popup-fft-layout>pre{overflow:auto;padding-right:4px}'+
    '.popup-fft-chart{position:relative;background:#0c0c0c;border:1px solid #1e1e1e;border-radius:4px;min-height:150px;overflow:hidden}'+
    '.popup-fft-chart canvas{display:block}'+
    '</style></head><body>'+
    '<div class="popup-header">'+
      '<span class="popup-title">📊 Analisi Avanzata</span>'+
      '<span class="popup-spacer"></span>'+
      '<button class="popup-btn" id="popupRedock">⇲ REINTEGRA</button>'+
    '</div>'+
    '<div class="popup-tabs-container">'+
      '<div class="popup-tabs">'+
        '<button class="popup-tab active" data-tab="stats">📊 Statistiche Temporali</button>'+
        '<button class="popup-tab" data-tab="fft">📈 Analisi FFT</button>'+
      '</div>'+
      '<div class="popup-tab-body">'+
        '<div class="popup-tab-pane active" id="popupStatsPane"><pre id="popupStatsText"></pre></div>'+
        '<div class="popup-tab-pane" id="popupFftPane">'+
          '<div class="popup-fft-layout">'+
            '<pre id="popupFftText"></pre>'+
            '<div class="popup-fft-chart"><canvas id="popupFftCanvas"></canvas></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '</body></html>';

  popup.document.open();
  popup.document.write(popupHtml);
  popup.document.close();

  const doc=popup.document;
  doc.querySelectorAll('.popup-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      doc.querySelectorAll('.popup-tab').forEach(b=>b.classList.remove('active'));
      doc.querySelectorAll('.popup-tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const id=btn.dataset.tab==='stats'?'popupStatsPane':'popupFftPane';
      doc.getElementById(id).classList.add('active');
      setTimeout(()=>{
        const pc=doc.getElementById('popupFftCanvas');
        if(pc) renderFFTChartOn(pc,lastFFTTraces);
      },40);
    });
  });
  doc.getElementById('popupRedock').addEventListener('click',()=>{
    if(popupWindow && !popupWindow.closed) popupWindow.close();
  });
  popup.addEventListener('resize',()=>{
    const pc=doc.getElementById('popupFftCanvas');
    if(pc && pc.parentElement.clientWidth>0) renderFFTChartOn(pc,lastFFTTraces);
  });

  $('btnPopupTabs').textContent='⇲ CHIUDI POPUP';
  $('btnPopupTabs').title='Chiudi la finestra separata';

  if(popupCloseChecker) clearInterval(popupCloseChecker);
  popupCloseChecker=setInterval(()=>{
    if(popupWindow && popupWindow.closed){
      clearInterval(popupCloseChecker);
      popupCloseChecker=null;
      popupWindow=null;
      $('btnPopupTabs').textContent='⇱ FINESTRA';
      $('btnPopupTabs').title='Apri pannello in finestra separata';
    }
  },500);

  setTimeout(()=>{
    const pStats=doc.getElementById('popupStatsText');
    const pFft=doc.getElementById('popupFftText');
    const pCanvas=doc.getElementById('popupFftCanvas');
    if(pStats) pStats.textContent=lastStatsText;
    if(pFft) pFft.textContent=lastFFTText;
    if(pCanvas) renderFFTChartOn(pCanvas,lastFFTTraces);
  },200);
}

// ==================== VIEW SWITCHING ====================
function showPlotView(){
  mainView.classList.add('hidden');
  plotView.classList.add('visible');
  $('btnBack').style.display='';
  $('btnMenu').style.display='';
}
function showMainView(){
  plotView.classList.remove('visible');
  mainView.classList.remove('hidden');
  $('btnBack').style.display='none';
}

$('btnBack').addEventListener('click',showMainView);
$('btnMenu').addEventListener('click',()=>$('confirmModal').classList.add('show'));

function confirmReset(){
  $('confirmModal').classList.remove('show');
  if(popupWindow && !popupWindow.closed){
    try{ popupWindow.close(); }catch(e){}
    popupWindow=null;
    $('btnPopupTabs').textContent='⇱ FINESTRA';
  }
  loadedData=[];currentTracks=[];lastFFTTraces=[];
  lastStatsText='';lastFFTText='';
  viewXMin=null;viewXMax=null;
  viewYMinLeft=null;viewYMaxLeft=null;
  viewYMinRight=null;viewYMaxRight=null;
  viewYByPanel={};
  yTableBody.innerHTML='';previewWrap.innerHTML='';
  $('fileInfo').textContent='Nessun file caricato.';
  setStatus('> In attesa di file...');
  $('btnPlot').disabled=true;
  $('xDropdown').innerHTML='<option value="__index__">-- Indice campione --</option>';
  showMainView();
}

document.querySelectorAll('.tab-btn').forEach(btn=>{
  if(btn.dataset.tab!=='stats' && btn.dataset.tab!=='fft') return;
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab+'Pane').classList.add('active');
    if(btn.dataset.tab==='fft'){
      setTimeout(()=>{
        if(fftCanvasMain.parentElement.clientWidth>0){
          renderFFTChartOn(fftCanvasMain,lastFFTTraces);
        }
      },40);
    }
  });
});

let resizeTimer=null;
window.addEventListener('resize',()=>{
  if(plotView.classList.contains('visible')){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(currentTracks.length) renderChart();
      if(fftCanvasMain.parentElement.clientWidth>0) renderFFTChartOn(fftCanvasMain,lastFFTTraces);
    },80);
  }
});

// ==================== TAB / PWA / THEME ====================
function closeTab(){
  window.close();
  setTimeout(()=>{
    if(!window.closed) alert('Puoi chiudere questa scheda manualmente.');
  },200);
}
$('btnCloseTab').addEventListener('click',closeTab);

// index.html keeps a couple of inline onclick="..." handlers (widget
// collapse arrows, the reset-confirm modal) exactly like the original
// single-file tool — expose the functions they call on window since a
// module's top-level declarations aren't global like a classic script's.
Object.assign(window,{toggleWidget,confirmReset});

registerServiceWorker();
initInstallPrompt($('installBtn'));
initTheme($('themeToggleBtn'));

// Init
applyPlotModeUI();
