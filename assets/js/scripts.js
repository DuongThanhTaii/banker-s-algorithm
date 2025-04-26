let numProcesses, numResources;
let allocation = [], maxDemand = [], need = [], available = [], finish = [];
let safeSequence = [], work = [];
let stepIndex = 0;

function generateInputs(event) {
  if (event && event.preventDefault) event.preventDefault();
  numProcesses = parseInt(document.getElementById('numProcesses').value);
  numResources = parseInt(document.getElementById('numResources').value);

  const procDiv = document.getElementById('processInputs');
  const availDiv = document.getElementById('availableInputs');
  procDiv.innerHTML = '';
  availDiv.innerHTML = '';

  for (let i = 0; i < numProcesses; i++) {
    const container = document.createElement('div');
    container.className = 'subtitle';

    const allocGroup = document.createElement('div');
    allocGroup.className = 'input-group';
    allocGroup.innerHTML = `<input type='number' id='alloc-${i}' value='0' required><label for='alloc-${i}'>P${i} Alloc</label>`;

    const maxGroup = document.createElement('div');
    maxGroup.className = 'input-group';
    maxGroup.innerHTML = `<input type='number' id='max-${i}' value='0' required><label for='max-${i}'>P${i} Max</label>`;

    container.appendChild(allocGroup);
    container.appendChild(maxGroup);
    procDiv.appendChild(container);
  }
  
  const availContainer  = document.createElement('div');
  availContainer.className = 'subtitle';
  for (let j = 0; j < numResources; j++) {
    const group = document.createElement('div');
    group.className = 'input-group';
  group.innerHTML = `<input type='number' id='avail-${j}' value='0' required>
                     <label for='avail-${j}'>Resource ${j}</label>`;
  availContainer.appendChild(group);
  }
  availDiv.appendChild(availContainer);

  document.getElementById('detailsForm').style.display = 'block';

  // Cuộn chuột tăng step
  document.querySelectorAll('input[type=number]').forEach(input => {
    input.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.deltaY < 0) input.stepUp();
      else input.stepDown();
    });
  });

}

function initSimulation(event) {
  if (event && event.preventDefault) event.preventDefault();

  allocation = Array.from({ length: numProcesses }, (_, i) =>
    Array.from({ length: numResources }, (_, j) => parseInt(document.getElementById(`alloc-${i}`).value))
  );
  maxDemand = Array.from({ length: numProcesses }, (_, i) =>
    Array.from({ length: numResources }, (_, j) => parseInt(document.getElementById(`max-${i}`).value))
  );
  available = Array.from({ length: numResources }, (_, j) => parseInt(document.getElementById(`avail-${j}`).value));

  need = allocation.map((row, i) => row.map((val, j) => maxDemand[i][j] - val));
  finish = Array(numProcesses).fill(false);
  work = available.slice();
  safeSequence = [];
  stepIndex = 0;

  renderTables();
  document.getElementById('available-box').style.display = 'inline-block';
  document.getElementById('controls').style.display = 'block';
  document.getElementById('resetBtn').style.display = 'block';
  document.getElementById('status').innerText = '';

  const procContainer = document.getElementById('processes');
  procContainer.innerHTML = '';
  for (let i = 0; i < numProcesses; i++) {
    const div = document.createElement('div');
    div.className = 'process waiting';
    div.id = `circle-${i}`;
    div.innerText = `P${i}`;
    procContainer.appendChild(div);
  }
}

function renderTables() {
  let cont = document.getElementById('tablesContainer');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'tablesContainer';
    document.body.insertBefore(cont, document.getElementById('processes'));
  }
  cont.innerHTML = '';

  const table = document.createElement('table');
  table.border = '1'; table.cellPadding = '8'; table.style.margin = '20px auto';

  const hdr = document.createElement('tr');
  hdr.innerHTML = `<th>Proc</th>` +
    Array.from({ length: numResources }, (_, j) => `<th>Alloc R${j}</th>`).join('') +
    Array.from({ length: numResources }, (_, j) => `<th>Max R${j}</th>`).join('') +
    Array.from({ length: numResources }, (_, j) => `<th>Need R${j}</th>`).join('');
  table.appendChild(hdr);

  for (let i = 0; i < numProcesses; i++) {
    const tr = document.createElement('tr');
    tr.id = `row-${i}`;
    let html = `<td>P${i}</td>`;
    allocation[i].forEach(v => html += `<td>${v}</td>`);
    maxDemand[i].forEach(v => html += `<td>${v}</td>`);
    need[i].forEach(v => html += `<td>${v}</td>`);
    tr.innerHTML = html;
    table.appendChild(tr);
  }

  const ar = document.createElement('tr');
  ar.id = 'avail-row';
  ar.innerHTML = `<td>Available</td>` + available.map(v => `<td>${v}</td>`).join('') + `<td colspan='${numResources*2}'></td>`;
  table.appendChild(ar);

  cont.appendChild(table);
  updateAvailableText();
}

function nextStep() {
  while (stepIndex < numProcesses) {
    const i = stepIndex++;
    if (!finish[i]) {
      clearHighlights(); resetCircles();
      const circ = document.getElementById(`circle-${i}`);
      const row = document.getElementById(`row-${i}`);

      if (need[i].every((n,j) => n <= work[j])) {
        circ.classList.replace('waiting','running'); row.classList.add('row-running'); circ.textContent = `P${i}...`;
        document.getElementById('doneSound').play();
        setTimeout(() => {
          circ.classList.replace('running','done'); row.classList.replace('running','done'); circ.textContent = `P${i}`;
        }, 500);
        for (let j=0;j<numResources;j++) available[j]+=allocation[i][j]; work = available.slice(); finish[i]=true; safeSequence.push(`P${i}`);
        updateAvailableRow(); updateAvailableText();
      } else {
        circ.classList.replace('waiting','error'); row.classList.add('error');
        document.getElementById('failSound').play();
      }
      return;
    }
  }

  // Sau khi chạy hết:
  const st = document.getElementById('status');
  if (safeSequence.length === numProcesses) {
    st.innerHTML = `<span style="color:#88d498; font-weight: bold;">HỆ THỐNG AN TOÀN!</span> TRÌNH TỰ LÀ: ${safeSequence.join(' → ')}`;
  } else {
    st.innerHTML = `<span style="color:red; font-weight: bold;">HỆ THỐNG KHÔNG AN TOÀN!</span>`;
  }

  // Tô màu toàn bộ các hàng theo trạng thái
  document.querySelectorAll('#tablesContainer tr').forEach(tr => {
    if (tr.id.startsWith('row-')) {
      if (!tr.classList.contains('done') && !tr.classList.contains('error')) {
        tr.classList.add('waiting');  // Những tiến trình còn lại (chưa done/error)
      }
    }
  });
}


function updateAvailableRow() {
  const r = document.getElementById('avail-row');
  available.forEach((v, j) => r.cells[j + 1].innerText = v);
}

function updateAvailableText() {
  const textEl = document.getElementById('available-text');
  textEl.textContent = available.join(', ');
  const numbers = textEl.innerText.match(/\b\d+\b/g);
  if (numbers && numbers.length > 2) {
    textEl.classList.add('small-font');
  } else {
    textEl.classList.remove('small-font');
  }
}

function clearHighlights() {
    document.querySelectorAll('#tablesContainer tr').forEach(tr => {
    if (!tr.classList.contains('done') && !tr.classList.contains('error')) {
      tr.style.backgroundColor = '';
    }
  });
}

function resetCircles() {
    document.querySelectorAll('.process').forEach(c => {
    c.classList.remove('running');
    const idx = parseInt(c.id.split('-')[1]);
    if (!finish[idx] && !c.classList.contains('error')) {
      c.classList.add('waiting');
    }
  });
}

function generateRandomExample() {
  numProcesses = Math.floor(Math.random() * 3) + 2;
  numResources = Math.floor(Math.random() * 3) + 1;
  document.getElementById('numProcesses').value = numProcesses;
  document.getElementById('numResources').value = numResources;
  generateInputs();
  for (let i = 0; i < numProcesses; i++) {
    for (let j = 0; j < numResources; j++) {
      document.getElementById(`alloc-${i}`).value = Math.floor(Math.random() * 3);
      document.getElementById(`max-${i}`).value = Math.floor(Math.random() * 5) + 1;
    }
  }
  for (let j = 0; j < numResources; j++) document.getElementById(`avail-${j}`).value = Math.floor(Math.random() * 5) + 1;
  initSimulation();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inputForm').addEventListener('submit', generateInputs);
  document.getElementById('detailsForm').addEventListener('submit', initSimulation);
  document.getElementById('randomBtn').addEventListener('click', generateRandomExample);
  document.getElementById('resetBtn').addEventListener('click', () => location.reload());

  document.querySelectorAll('button.button, button.magic-button').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('animate');
      setTimeout(() => btn.classList.remove('animate'), 600);
    });
  });
  // Cuộn chuột tăng step
  document.querySelectorAll('input[type=number]').forEach(input => {
    input.addEventListener('wheel', e => {
      e.preventDefault(); if (e.deltaY < 0) input.stepUp(); else input.stepDown();
    });
  });
});