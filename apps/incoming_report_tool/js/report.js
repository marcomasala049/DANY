const Report = (function(){
  let templateBuffer = null;

  /* Carica un template di default via HTTP (funziona se il tool è servito da un server locale). */
  async function tryLoadDefaultTemplate(){
    if (templateBuffer) return templateBuffer;
    try {
      const res = await fetch(CONFIG.defaultTemplate, { cache: 'no-store' });
      if (!res.ok) return null;
      templateBuffer = await res.arrayBuffer();
      return templateBuffer;
    } catch(e){
      return null;
    }
  }

  function setTemplateBuffer(buf){ templateBuffer = buf; }
  function hasTemplate(){ return !!templateBuffer; }

  /* Genera un Blob .docx a partire dai dati raccolti. */
  async function generate(data){
    if (typeof PizZip === 'undefined' || typeof docxtemplater === 'undefined'){
      throw new Error('Librerie docxtemplater/PizZip non caricate. Verifica la connessione.');
    }

    let buf = templateBuffer;
    if (!buf) buf = await tryLoadDefaultTemplate();
    if (!buf){
      throw new Error(
        'Nessun template caricato.\n\n' +
        'Vai su "4 · Genera Report" e carica un file .docx, ' +
        'oppure metti il template in assets/ e servi la pagina via HTTP.'
      );
    }

    const zip = new PizZip(buf);
    const doc = new docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,                        // preserva \n nei commenti
      delimiters: { start: '{{', end: '}}' },  // compatibile col template MATLAB
      nullGetter: () => ''                     // tag mancanti => stringa vuota
    });

    doc.render(data);

    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  /* Nome file dinamico come nel tool MATLAB. */
  function buildFileName(){
    const safe = s => (s || '').toString().replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'');
    const proj = safe(document.getElementById('f_project').value)  || 'Project';
    const supp = safe(document.getElementById('f_supplier').value) || 'Fornitore';
    const sn   = safe(document.getElementById('f_sn').value)       || 'SN';
    return `Incoming_Report_${proj}_${supp}_${sn}.docx`;
  }

  /* Download del blob. */
  function download(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return {
    generate, buildFileName, download,
    setTemplateBuffer, hasTemplate, tryLoadDefaultTemplate
  };
})();