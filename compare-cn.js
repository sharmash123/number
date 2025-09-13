const redPairs = {0:5,1:6,2:7,3:8,4:9,5:0,6:1,7:2,8:3,9:4};
let ROWS = 30;
let COLS = 7;
const tbody = document.querySelector("#grid tbody");
const sequenceList = document.getElementById("sequenceList");
let gridData = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

let currentUser = localStorage.getItem("cnUser");
if (!currentUser) {
  currentUser = prompt("Enter your name:");
  if (currentUser) {
    localStorage.setItem("cnUser", currentUser);
  } else {
    alert("Name is required to continue.");
    location.reload();
  }
}

function getCN(num) {
  const a = parseInt(num[0]);
  const b = parseInt(num[1]);
  return ((a + b) % 10 + (a + a) % 10) % 10;
}

function isRed(num) {
  const a = parseInt(num[0]);
  const b = parseInt(num[1]);
  return a === b || redPairs[a] === b;
}

function checkSequences() {
  sequenceList.innerHTML = "";
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const cn1 = gridData[r][c]?.cn;
      const cn2 = gridData[r + 1][c]?.cn;
      const cn3 = gridData[r + 2][c]?.cn;
      if (cn1 != null && cn2 != null && cn3 != null) {
        const isAsc = cn2 === cn1 + 1 && cn3 === cn2 + 1;
        const isDesc = cn2 === cn1 - 1 && cn3 === cn2 - 1;
        if (isAsc || isDesc) {
          const li = document.createElement("li");
          li.textContent = `List-${c + 1}: ${r + 1}r${c + 1}c (${cn1}), ${r + 2}r${c + 1}c (${cn2}), ${r + 3}r${c + 1}c (${cn3})`;
          sequenceList.appendChild(li);
        }
      }
    }
  }
}

function saveToHistory(label = `Box-${Date.now()}`) {
  const historyKey = `cnHistory_${currentUser}`;
  const history = JSON.parse(localStorage.getItem(historyKey)) || {};
  history[label] = JSON.parse(JSON.stringify(gridData));
  localStorage.setItem(historyKey, JSON.stringify(history));
  populateHistoryDropdown();
}

function populateHistoryDropdown() {
  const historyKey = `cnHistory_${currentUser}`;
  const history = JSON.parse(localStorage.getItem(historyKey)) || {};
  const select = document.getElementById("historySelect");
  select.innerHTML = `<option value="">-- Select --</option>`;
  Object.keys(history).forEach(label => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });
}

function loadFromHistory(label) {
  const historyKey = `cnHistory_${currentUser}`;
  const history = JSON.parse(localStorage.getItem(historyKey)) || {};
  const savedGrid = history[label];
  if (!savedGrid) return;

  for (let r = 0; r < ROWS && r < savedGrid.length; r++) {
    for (let c = 0; c < COLS && c < savedGrid[r].length; c++) {
      const td = tbody.rows[r].cells[c];
      const cell = savedGrid[r][c];
      if (cell && (cell.val === "**" || /^\d{2}$/.test(cell.val))) {
        if (cell.val === "**") {
          td.innerHTML = `<span class="red">${cell.val}</span>`;
        } else {
          const red = isRed(cell.val);
          td.innerHTML = `<span class="${red ? 'red' : ''}">${cell.val} (${cell.cn})</span>`;
        }
        gridData[r][c] = cell;
      } else {
        td.innerHTML = "";
        gridData[r][c] = null;
      }
    }
  }
  checkSequences();
}

function processImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) return alert("Please upload an image first.");

  Tesseract.recognize(file, 'eng').then(({ data: { text } }) => {
    const cleaned = text.replace(/\D/g, "");
    const values = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      const pair = cleaned.slice(i, i + 2);
      if (pair.length === 2) values.push(pair);
    }
    fillGrid(values);
    saveToHistory();
  });
}

function fillFromText() {
  const raw = document.getElementById("manualInput").value.trim();
  const cleaned = raw.replace(/\D/g, "");
  const values = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    const pair = cleaned.slice(i, i + 2);
    if (pair.length === 2) values.push(pair);
  }
  fillGrid(values);
  saveToHistory();
}

function fillGrid(values) {
  let index = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const td = tbody.rows[r].cells[c];
      if (index >= values.length) {
        td.innerHTML = "";
        gridData[r][c] = null;
        continue;
      }
      const val = values[index++];
      if (/^\d{2}$/.test(val)) {
        const cn = getCN(val);
        const red = isRed(val);
        gridData[r][c] = { val, cn };
        td.innerHTML = `<span class="${red ? 'red' : ''}">${val} (${cn})</span>`;
      } else {
        td.innerHTML = "";
        gridData[r][c] = null;
      }
    }
  }
  checkSequences();
}

function clearGrid() {
  localStorage.removeItem("cnGridData");
  location.reload();
}

function resizeGrid(newRows, newCols) {
  newRows = Math.max(1, parseInt(newRows) || ROWS);
  newCols = Math.max(1, parseInt(newCols) || COLS);

  // Preserve existing data where possible
  const newGridData = Array.from({ length: newRows }, () => Array(newCols).fill(null));
  for (let r = 0; r < Math.min(ROWS, newRows); r++) {
    for (let c = 0; c < Math.min(COLS, newCols); c++) {
      newGridData[r][c] = gridData[r][c];
    }
  }

  ROWS = newRows;
  COLS = newCols;
  gridData = newGridData;
  tbody.innerHTML = "";

  // Create new grid
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < COLS; c++) {
      const td = document.createElement("td");
      td.addEventListener("click", () => {
        td.innerHTML = "";
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 2;
        input.className = "cell-input";
        input.value = gridData[r][c]?.val || "";
        td.appendChild(input);
        input.focus();

        input.addEventListener("input", () => {
          const val = input.value.trim();
          if (val === "**" || /^\d{2}$/.test(val)) {
            input.blur();
            if (val === "**") {
              gridData[r][c] = { val, cn: null };
              td.innerHTML = `<span class="red">${val}</span>`;
            } else {
              const cn = getCN(val);
              const red = isRed(val);
              gridData[r][c] = { val, cn };
              td.innerHTML = `<span class="${red ? 'red' : ''}">${val} (${cn})</span>`;
            }
            checkSequences();
            saveToHistory();

            // Move to next cell
            let nextRow = r;
            let nextCol = c + 1;
            if (nextCol >= COLS) {
              nextCol = 0;
              nextRow = r + 1;
            }
            if (nextRow < ROWS) {
              tbody.rows[nextRow].cells[nextCol].click();
            }
          }
        });

        input.addEventListener("blur", () => {
          const val = input.value.trim();
          if (val === "**") {
            gridData[r][c] = { val, cn: null };
            td.innerHTML = `<span class="red">${val}</span>`;
          } else if (/^\d{2}$/.test(val)) {
            const cn = getCN(val);
            const red = isRed(val);
            gridData[r][c] = { val, cn };
            td.innerHTML = `<span class="${red ? 'red' : ''}">${val} (${cn})</span>`;
          } else {
            td.innerHTML = "";
            gridData[r][c] = null;
          }
          checkSequences();
          saveToHistory();
        });
      });

      if (gridData[r][c]) {
        const { val, cn } = gridData[r][c];
        if (val === "**") {
          td.innerHTML = `<span class="red">${val}</span>`;
        } else {
          const red = isRed(val);
          td.innerHTML = `<span class="${red ? 'red' : ''}">${val} (${cn})</span>`;
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  checkSequences();
}

// Initialize grid
resizeGrid(ROWS, COLS);
populateHistoryDropdown();

// Handle grid size update
document.getElementById("resizeButton")?.addEventListener("click", () => {
  const newRows = document.getElementById("rowsInput").value;
  const newCols = document.getElementById("colsInput").value;
  resizeGrid(newRows, newCols);
});