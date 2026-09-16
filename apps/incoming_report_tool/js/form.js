const FormUI = (function(){

  function buildInfoForm(){
    const c = document.getElementById('infoForm');
    c.innerHTML = '';
    CONFIG.fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'field-row';

      const lbl = document.createElement('label');
      lbl.htmlFor = 'f_' + f.id;
      lbl.textContent = f.label;

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'f_' + f.id;
      inp.name = f.id;
      inp.value = f.def || '';
      inp.dataset.tag = f.tag;

      row.appendChild(lbl);
      row.appendChild(inp);
      c.appendChild(row);
    });
  }

  function buildRadioGroup(containerId, groupName, items, selectedId){
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    items.forEach(item => {
      const label = document.createElement('label');
      label.className = 'radio-item';
      const checked = (item.id === selectedId) ? 'checked' : '';
      label.innerHTML =
        `<input type="radio" name="${groupName}" value="${item.id}" ${checked}>
         <span>${item.label}</span>`;
      c.appendChild(label);
    });
  }

  function buildHWRadios(){
    buildRadioGroup('hwRadios', 'hw', CONFIG.hwModels, CONFIG.hwModels[0].id);
  }
  function buildDecisionRadios(){
    buildRadioGroup('decisionRadios', 'dec', CONFIG.decisions, CONFIG.defaultDecision);
  }

  function getValues(){
    const values = {};

    /* Anagrafica */
    CONFIG.fields.forEach(f => {
      const el = document.getElementById('f_' + f.id);
      values[f.tag] = el ? el.value : '';
    });

    /* Commenti e data */
    values[CONFIG.commentsTag] = document.getElementById('comments').value;
    values[CONFIG.dateTag]     = new Date().toLocaleDateString('it-IT');

    /* HW */
    const hwSel = document.querySelector('input[name="hw"]:checked');
    const hwVal = hwSel ? hwSel.value : '';
    CONFIG.hwModels.forEach(m => {
      values[m.tag] = (m.id === hwVal) ? CONFIG.checkFlag.on : CONFIG.checkFlag.off;
    });

    /* Decisione */
    const decSel = document.querySelector('input[name="dec"]:checked');
    const decVal = decSel ? decSel.value : '';
    CONFIG.decisions.forEach(d => {
      values[d.tag] = (d.id === decVal) ? CONFIG.checkFlag.on : CONFIG.checkFlag.off;
    });

    return values;
  }

  return { buildInfoForm, buildHWRadios, buildDecisionRadios, getValues };
})();