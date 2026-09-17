(function(){

  /* ---------- Helpers ---------- */
  function setStatus(text, cls){
    const el = document.getElementById('statusBar');
    if (!el) return;
    const icon = cls === 'status-ok' ? 'check' : cls === 'status-error' ? 'warning' : 'status';
    el.innerHTML = (window.daniIcon ? window.daniIcon(icon, { size: 13 }) : '') + '<span>' + text + '</span>';
    el.className = 'status-bar' + (cls ? ' ' + cls : '');
  }

  function showModal(title, text){
    const icon = /errore/i.test(title) ? 'warning' : /successo/i.test(title) ? 'check' : 'info';
    document.getElementById('modalTitle').innerHTML = (window.daniIcon ? window.daniIcon(icon, { size: 16 }) : '') + '<span>' + title + '</span>';
    document.getElementById('modalText').textContent  = text;
    document.getElementById('modal').hidden = false;
  }

  /* ---------- Tabs ---------- */
  function setupTabs(){
    const tabs   = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        // Stepper visual: a tab you're leaving is marked "done" (checkmark)
        // so the stepper reads as progress, not just a plain tab switch.
        tabs.forEach(b => { if (b.classList.contains('active')) b.classList.add('done'); b.classList.remove('active'); });
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.remove('done');
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  }

  /* ---------- Template input ---------- */
  function setupTemplateInput(){
    const input = document.getElementById('templateInput');
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      try {
        const buf = await f.arrayBuffer();
        Report.setTemplateBuffer(buf);
        setStatus('Template caricato: ' + f.name, 'status-ok');
      } catch(e){
        setStatus('Errore caricamento template: ' + e.message, 'status-error');
      }
    });
  }

  /* ---------- Generazione report ---------- */
  async function onGenerate(){
    try {
      setStatus('Raccolta dati dal form...');
      const data = Object.assign(
        {},
        FormUI.getValues(),
        ChecklistUI.collectValues()
      );

      setStatus('Generazione documento Word...');
      const blob = await Report.generate(data);
      const name = Report.buildFileName();
      Report.download(blob, name);

      setStatus('Report generato: ' + name, 'status-ok');
      showModal('Successo', 'Report generato correttamente!\n\nFile: ' + name);
    } catch(e){
      console.error(e);
      setStatus('Errore: ' + e.message, 'status-error');
      showModal('Errore', e.message);
    }
  }

  /* ---------- Placeholders UI ---------- */
  function renderTagsGrid(){
    const grid = document.getElementById('tagsGrid');
    grid.innerHTML = '';
    ChecklistUI.allTags().forEach(t => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.textContent = '{{' + t + '}}';
      chip.title = '{{' + t + '}}';
      grid.appendChild(chip);
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    FormUI.buildInfoForm();
    FormUI.buildHWRadios();
    FormUI.buildDecisionRadios();
    ChecklistUI.build();
    renderTagsGrid();

    setupTabs();
    setupTemplateInput();
    document.getElementById('generateBtn').addEventListener('click', onGenerate);

    /* Tenta di caricare il template di default (silenziosamente). */
    const hasDefault = await Report.tryLoadDefaultTemplate();
    if (hasDefault){
      setStatus('Pronto. Template di default caricato.', 'status-ok');
    } else {
      setStatus('Pronto. Carica un template .docx per generare il report.');
    }
  });
})();