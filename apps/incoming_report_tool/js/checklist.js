const ChecklistUI = (function(){

  function build(){
    const c = document.getElementById('checklistContainer');
    c.innerHTML = '';
    CONFIG.checklist.forEach(item => {
      const row = document.createElement('div');
      row.className = 'checklist-row';
      row.dataset.id = item.id;

      const txt = document.createElement('div');
      txt.className = 'checklist-text';
      txt.textContent = item.text;

      const opts = document.createElement('div');
      opts.className = 'checklist-opts';
      CONFIG.checklistOptions.forEach((opt, i) => {
        const label = document.createElement('label');
        label.className = 'radio-item compact';
        label.innerHTML =
          `<input type="radio" name="chk_${item.id}" value="${opt}" ${i===0?'checked':''}>
           <span>${opt}</span>`;
        opts.appendChild(label);
      });

      row.appendChild(txt);
      row.appendChild(opts);
      c.appendChild(row);
    });
  }

  /* Genera i tag: CH_<ID>_NA / CH_<ID>_YES / CH_<ID>_NO */
  function collectValues(){
    const values = {};
    CONFIG.checklist.forEach(item => {
      const sel = document.querySelector(`input[name="chk_${item.id}"]:checked`);
      const val = sel ? sel.value : '';
      const base = 'CH_' + item.id.toUpperCase() + '_';
      values[base + 'NA']  = val === 'N/A' ? CONFIG.checkFlag.on : CONFIG.checkFlag.off;
      values[base + 'YES'] = val === 'Yes' ? CONFIG.checkFlag.on : CONFIG.checkFlag.off;
      values[base + 'NO']  = val === 'No'  ? CONFIG.checkFlag.on : CONFIG.checkFlag.off;
    });
    return values;
  }

  /* Elenco di tutti i tag attesi, per la UI. */
  function allTags(){
    const tags = [];
    CONFIG.fields.forEach(f => tags.push(f.tag));
    tags.push(CONFIG.commentsTag, CONFIG.dateTag);
    CONFIG.hwModels.forEach(m => tags.push(m.tag));
    CONFIG.decisions.forEach(d => tags.push(d.tag));
    CONFIG.checklist.forEach(item => {
      const base = 'CH_' + item.id.toUpperCase() + '_';
      tags.push(base + 'NA', base + 'YES', base + 'NO');
    });
    return tags;
  }

  return { build, collectValues, allTags };
})();