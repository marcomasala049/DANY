import { $ } from '../core/dom-helpers.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { enterExecution } from './execution.js';

let builderRows = 0;

export function openBuilder() {
  $('builderCard').style.display = 'block';
  if (!builderRows) { addBuilderRow(); addBuilderRow(); }
  $('builderCard').scrollIntoView({ behavior: 'smooth' });
}

export function closeBuilder() {
  $('builderCard').style.display = 'none';
  $('builderList').innerHTML = '';
  builderRows = 0;
}

export function addBuilderRow() {
  builderRows++;

  const div = document.createElement('div');
  div.className = 'builder-row';
  div._imageData = '';
  div._imageName = '';

  const num = document.createElement('span');
  num.className = 'muted';
  num.style.alignSelf = 'center';
  num.textContent = builderRows + '.';

  const desc = document.createElement('input');
  desc.placeholder = 'Descrizione dello step';
  desc.className = 'b-desc';

  const exp = document.createElement('input');
  exp.placeholder = 'Valore atteso (opzionale)';
  exp.className = 'b-exp';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'builder-image-wrap';

  const imageBtn = document.createElement('button');
  imageBtn.className = 'btn builder-img-btn';
  imageBtn.type = 'button';
  imageBtn.textContent = '🖼 Immagine';

  const thumb = document.createElement('img');
  thumb.className = 'builder-thumb';
  thumb.alt = 'Anteprima';

  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.display = 'none';
  imageInput.onchange = () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      div._imageData = reader.result;
      div._imageName = file.name;
      thumb.src = reader.result;
      thumb.style.display = 'block';
      imageBtn.textContent = '🖼 Cambia';
    };
    reader.readAsDataURL(file);
  };
  imageBtn.onclick = () => imageInput.click();
  imageWrap.append(imageBtn, thumb, imageInput);

  const del = document.createElement('button');
  del.className = 'builder-del';
  del.textContent = '×';
  del.type = 'button';
  del.onclick = () => { div.remove(); renumberBuilderRows(); };

  div.append(num, desc, exp, imageWrap, del);
  $('builderList').appendChild(div);
}

function renumberBuilderRows() {
  const rows = [...document.querySelectorAll('.builder-row')];
  rows.forEach((r, i) => { r.querySelector('.muted').textContent = (i + 1) + '.'; });
  builderRows = rows.length;
}

/** Turns the blank-procedure builder rows into a fresh in-memory procedure and starts it. */
export function startFromBuilder() {
  const rows = [...document.querySelectorAll('.builder-row')];
  const parsed = [];

  rows.forEach(r => {
    const desc = r.querySelector('.b-desc').value.trim();
    const exp = r.querySelector('.b-exp').value.trim();
    if (!desc) return;

    parsed.push({
      step: String(parsed.length + 1),
      desc,
      expected: exp,
      measured: '',
      notes: '',
      image: r._imageData || '',
      timestamp: '',
      signature: '',
      correction: '',
      anomaly: '',
      skipReason: ''
    });
  });

  if (!parsed.length) { alert('Inserisci almeno uno step con una descrizione.'); return; }

  state.steps = parsed;
  state.sourceName = 'nuova_procedura.xlsx';
  state.currentIndex = 0;
  saveSession();
  enterExecution();
}
