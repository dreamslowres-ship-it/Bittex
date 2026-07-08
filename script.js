let framesData = []; 
let activeFrameIndex = 0; 
let framesArray = []; 
let isPlaying = false;
let currentFrameIndex = 0;
let animationRequestId = null; 
let lastFrameTime = 0;
let targetScroll = 0;

const LIMITS = { FPS: 20, FRAMES: 200, LINES: 50, CHARS: 80 };
const SEPARATOR = "===ASCII_FRAME_BOUNDARY===";

const linesInput = document.getElementById('linesPerFrame');
const charsInput = document.getElementById('charsPerLine');
const fpsInput = document.getElementById('fps');

const activeCanvas = document.getElementById('activeCanvas');
const canvasTitle = document.getElementById('canvasTitle');
const timelineContainer = document.getElementById('timeline');
const display = document.getElementById('display');
const screenWrapper = document.getElementById('screenWrapper');
const statCurrent = document.getElementById('statCurrent');

const btnAddFrame = document.getElementById('btnAddFrame');
const btnDeleteFrame = document.getElementById('btnDeleteFrame');
const btnDuplicateFrame = document.getElementById('btnDuplicateFrame');

// Controles y Dropdown
const btnPlayPause = document.getElementById('btnPlayPause');
const playPauseIcon = document.getElementById('playPauseIcon');
const btnSettingsTrigger = document.getElementById('btnSettingsTrigger');
const settingsDropdown = document.getElementById('settingsDropdown');

// Modales
const modalSave = document.getElementById('modalSave');
const modalVault = document.getElementById('modalVault');
const modalInfo = document.getElementById('modalInfo');

const btnSaveMenu = document.getElementById('btnSaveMenu');
const btnVaultMenu = document.getElementById('btnVaultMenu');
const btnInfoTrigger = document.getElementById('btnInfoTrigger');

const btnCloseSaveModal = document.getElementById('btnCloseSaveModal');
const btnCloseVaultModal = document.getElementById('btnCloseVaultModal');
const btnCloseInfoModal = document.getElementById('btnCloseInfoModal');

// Operaciones Archivos
const btnExportTxt = document.getElementById('btnExportTxt');
const btnImportTxt = document.getElementById('btnImportTxt');
const btnSaveToVault = document.getElementById('btnSaveToVault');
const vaultSlotsContainer = document.getElementById('vaultSlotsContainer');

const initialFrames = [
    ` [======] \n |  ||  | \n |  o   | \n |      | \n [======]`,
    ` [======] \n |      | \n |  o== | \n |      | \n [======]`,
    ` [======] \n |      | \n |  o   | \n |  ||  | \n [======]`,
    ` [======] \n |      | \n |==o   | \n |      | \n [======]`
];

// --- GESTIÓN INTERFAZ FLOTANTE ---
btnSettingsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle('open');
});
document.addEventListener('click', () => settingsDropdown.classList.remove('open'));
settingsDropdown.addEventListener('click', (e) => e.stopPropagation());

function abrirModal(modal) {
    modal.classList.add('open');
    if(isPlaying) togglePlayPause();
}
function cerrarModal(modal) {
    modal.classList.remove('open');
}

btnSaveMenu.addEventListener('click', () => abrirModal(modalSave));
btnVaultMenu.addEventListener('click', () => { renderizarBaul(); abrirModal(modalVault); });
btnInfoTrigger.addEventListener('click', () => { settingsDropdown.classList.remove('open'); abrirModal(modalInfo); });

btnCloseSaveModal.addEventListener('click', () => cerrarModal(modalSave));
btnCloseVaultModal.addEventListener('click', () => cerrarModal(modalVault));
btnCloseInfoModal.addEventListener('click', () => cerrarModal(modalInfo));

// --- ENGINE DEL EDITOR ---
function clampInputs() {
    if (parseInt(fpsInput.value) > LIMITS.FPS) fpsInput.value = LIMITS.FPS;
    if (parseInt(linesInput.value) > LIMITS.LINES) linesInput.value = LIMITS.LINES;
    if (parseInt(charsInput.value) > LIMITS.CHARS) charsInput.value = LIMITS.CHARS;
    
    if (parseInt(fpsInput.value) < 1) fpsInput.value = 1;
    if (parseInt(linesInput.value) < 1) linesInput.value = 1;
    if (parseInt(charsInput.value) < 1) charsInput.value = 1;
}

function cargarLienzoActivo() {
    activeCanvas.value = framesData[activeFrameIndex] || "";
    canvasTitle.textContent = `LIENZO #${activeFrameIndex + 1}`;
}

function renderizarTimeline() {
    timelineContainer.innerHTML = '';
    framesData.forEach((_, index) => {
        const thumb = document.createElement('div');
        thumb.className = `frame-thumb ${(!isPlaying && index === activeFrameIndex) ? 'active' : ''}`;
        thumb.addEventListener('click', () => {
            if(isPlaying) togglePlayPause(); 
            activeFrameIndex = index;
            cargarLienzoActivo();
            renderizarTimeline();
            actualizarStats(activeFrameIndex);
            display.textContent = framesArray[activeFrameIndex];
            autoEscalarVisor();
            thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        timelineContainer.appendChild(thumb);
    });
}

function actualizarStats(indexMostrar) {
    statCurrent.textContent = `${indexMostrar + 1}/${framesData.length}`;
}

function autoEscalarVisor() {
    display.style.transform = 'scale(1)';
    const contenedorW = screenWrapper.clientWidth - 20; 
    const contenedorH = screenWrapper.clientHeight - 20;
    const textoW = display.offsetWidth;
    const textoH = display.offsetHeight;
    if (textoW === 0 || textoH === 0) return;
    const escalaFinal = Math.min(contenedorW / textoW, contenedorH / textoH);
    display.style.transform = `scale(${escalaFinal})`;
}
window.addEventListener('resize', autoEscalarVisor);

function validarCanvas() {
    clampInputs();
    const linesPerFrame = parseInt(linesInput.value) || 5;
    const charsPerLine = parseInt(charsInput.value) || 10;
    
    let lines = activeCanvas.value.split('\n');
    if (lines.length > linesPerFrame) lines = lines.slice(0, linesPerFrame);
    
    const posCursor = activeCanvas.selectionStart;
    const nuevoTexto = lines.map(line => line.substring(0, charsPerLine)).join('\n');
    
    if (activeCanvas.value !== nuevoTexto) {
        activeCanvas.value = nuevoTexto;
        activeCanvas.setSelectionRange(posCursor, posCursor);
    }
    
    framesData[activeFrameIndex] = activeCanvas.value;
    compilarAnimacion();
    display.textContent = framesArray[activeFrameIndex];
    autoEscalarVisor();
}

// --- ENGINE REPRODUCTOR CONMUTABLE ---
function togglePlayPause() {
    if (!isPlaying) {
        if (framesArray.length === 0) return;
        clampInputs();
        compilarAnimacion();
        isPlaying = true;
        screenWrapper.classList.add('playing');
        playPauseIcon.className = "btn-sprite sprite-stop"; 
        
        if (timelineContainer.children[activeFrameIndex]) {
            timelineContainer.children[activeFrameIndex].classList.remove('active');
        }
        document.activeElement.blur();
        targetScroll = timelineContainer.scrollLeft;
        lastFrameTime = performance.now();
        animationRequestId = requestAnimationFrame(animate);
    } else {
        isPlaying = false;
        cancelAnimationFrame(animationRequestId);
        screenWrapper.classList.remove('playing');
        playPauseIcon.className = "btn-sprite sprite-play"; 
        currentFrameIndex = 0;
        volverAlEditor();
    }
}
btnPlayPause.addEventListener('click', togglePlayPause);

function animate(timestamp) {
    if (!isPlaying) return;

    const currentScroll = timelineContainer.scrollLeft;
    const diff = targetScroll - currentScroll;
    if (Math.abs(diff) > 0.5) {
        timelineContainer.scrollLeft += diff * 0.15;
    }

    const fps = parseInt(fpsInput.value) || 4;
    const interval = 1000 / fps;
    const elapsed = timestamp - lastFrameTime;

    if (elapsed > interval) {
        lastFrameTime = timestamp - (elapsed % interval);
        display.textContent = framesArray[currentFrameIndex];
        updateTimelineVisuals(currentFrameIndex);
        currentFrameIndex = (currentFrameIndex + 1) % framesArray.length;
    }
    animationRequestId = requestAnimationFrame(animate);
}

function updateTimelineVisuals(index) {
    const prev = timelineContainer.querySelector('.playback-active');
    if (prev) prev.classList.remove('playback-active');
    const currentThumb = timelineContainer.children[index];
    if (currentThumb) {
        currentThumb.classList.add('playback-active');
        targetScroll = currentThumb.offsetLeft - (timelineContainer.clientWidth / 2) + (currentThumb.clientWidth / 2);
    }
    actualizarStats(index);
}

function volverAlEditor() {
    renderizarTimeline(); 
    if(timelineContainer.children[activeFrameIndex]) {
        timelineContainer.children[activeFrameIndex].scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
    if (framesArray[activeFrameIndex] !== undefined) {
        display.textContent = framesArray[activeFrameIndex];
        autoEscalarVisor();
    }
    actualizarStats(activeFrameIndex);
}

// --- EDICIÓN DE FOTOGRAMAS ---
btnAddFrame.addEventListener('click', () => {
    if (framesData.length >= LIMITS.FRAMES) return;
    framesData.push(""); 
    activeFrameIndex = framesData.length - 1;
    cargarLienzoActivo();
    renderizarTimeline();
    setTimeout(() => { if(timelineContainer.lastChild) timelineContainer.lastChild.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }, 10);
    actualizarStats(activeFrameIndex);
});

btnDuplicateFrame.addEventListener('click', () => {
    if (framesData.length >= LIMITS.FRAMES) return;
    framesData.splice(activeFrameIndex + 1, 0, framesData[activeFrameIndex]);
    activeFrameIndex++;
    cargarLienzoActivo();
    renderizarTimeline();
    setTimeout(() => { if(timelineContainer.children[activeFrameIndex]) timelineContainer.children[activeFrameIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }, 10);
    actualizarStats(activeFrameIndex);
});

btnDeleteFrame.addEventListener('click', () => {
    if (framesData.length <= 1) {
        framesData[0] = "";
    } else {
        framesData.splice(activeFrameIndex, 1);
        if (activeFrameIndex >= framesData.length) activeFrameIndex = framesData.length - 1;
    }
    cargarLienzoActivo();
    renderizarTimeline();
    compilarAnimacion();
    display.textContent = framesArray[activeFrameIndex];
    autoEscalarVisor();
    actualizarStats(activeFrameIndex);
});

activeCanvas.addEventListener('input', validarCanvas);

function compilarAnimacion() {
    clampInputs();
    const charsPerLine = parseInt(charsInput.value) || 10;
    const linesPerFrame = parseInt(linesInput.value) || 5;
    
    framesArray = framesData.map(frameText => {
        let lines = frameText.split('\n');
        while (lines.length < linesPerFrame) lines.push('');
        lines = lines.slice(0, linesPerFrame);
        return lines.map(line => line.substring(0, charsPerLine).padEnd(charsPerLine, ' ')).join('\n');
    });
}

// --- SISTEMA DE MANEJO DE ARCHIVOS TXT ---
btnExportTxt.addEventListener('click', () => {
    try {
        const meta = `${linesInput.value},${charsInput.value},${fpsInput.value}`;
        const payload = [meta, ...framesData].join(SEPARATOR);
        const blob = new Blob([payload], { type: 'text/plain' });
        const objectUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `ascii_animacion_${Date.now()}.txt`;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        cerrarModal(modalSave);
    } catch (err) {
        console.error(err);
    }
});

btnImportTxt.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const content = evt.target.result;
        const chunks = content.split(SEPARATOR);
        if (chunks.length < 2) return;
        
        const meta = chunks[0].split(',');
        linesInput.value = meta[0] || 5;
        charsInput.value = meta[1] || 10;
        fpsInput.value = meta[2] || 4;
        
        framesData = chunks.slice(1);
        activeFrameIndex = 0;
        
        clampInputs();
        cargarLienzoActivo();
        compilarAnimacion();
        renderizarTimeline();
        display.textContent = framesArray[activeFrameIndex];
        autoEscalarVisor();
        actualizarStats(activeFrameIndex);
        cerrarModal(modalSave);
    };
    reader.readAsText(file);
    e.target.value = ''; 
});

// --- EL BAÚL LOCALSTORAGE ---
function obtenerDatosBaul() { return JSON.parse(localStorage.getItem('ascii_vault_slots')) || []; }

btnSaveToVault.addEventListener('click', () => {
    let baul = obtenerDatosBaul();
    if (baul.length >= 4) { alert("El Baúl está lleno. Borra uno."); return; }
    
    baul.push({
        id: Date.now(),
        fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        lines: linesInput.value,
        chars: charsInput.value,
        fps: fpsInput.value,
        frames: [...framesData]
    });
    localStorage.setItem('ascii_vault_slots', JSON.stringify(baul));
    cerrarModal(modalSave);
});

function renderizarBaul() {
    vaultSlotsContainer.innerHTML = '';
    const baul = obtenerDatosBaul();
    if (baul.length === 0) { vaultSlotsContainer.innerHTML = '<p style="color:#555; font-size:0.8rem; padding:10px;">El baúl está vacío.</p>'; return; }
    
    baul.forEach((slot, index) => {
        const item = document.createElement('div');
        item.className = 'vault-slot-item';
        item.innerHTML = `
            <div class="vault-slot-info"><strong>Slot #${index + 1}</strong> (${slot.fecha})<br>Dim: ${slot.lines}x${slot.chars}</div>
            <div class="vault-slot-actions">
                <button class="btn btn-small" onclick="cargarSlotBaul(${slot.id})">Abrir</button>
                <button class="btn btn-small btn-danger" onclick="eliminarSlotBaul(${slot.id})">Borrar</button>
            </div>`;
        vaultSlotsContainer.appendChild(item);
    });
}

window.cargarSlotBaul = function(id) {
    const baul = obtenerDatosBaul();
    const slot = baul.find(s => s.id === id);
    if (!slot) return;
    linesInput.value = slot.lines; charsInput.value = slot.chars; fpsInput.value = slot.fps;
    framesData = [...slot.frames]; activeFrameIndex = 0;
    clampInputs(); cargarLienzoActivo(); compilarAnimacion(); renderizarTimeline();
    display.textContent = framesArray[activeFrameIndex]; autoEscalarVisor(); actualizarStats(activeFrameIndex);
    cerrarModal(modalVault);
};

window.eliminarSlotBaul = function(id) {
    let baul = obtenerDatosBaul().filter(s => s.id !== id);
    localStorage.setItem('ascii_vault_slots', JSON.stringify(baul));
    renderizarBaul();
};

[linesInput, charsInput, fpsInput].forEach(input => {
    input.addEventListener('change', () => { clampInputs(); validarCanvas(); renderizarTimeline(); });
});

function iniciarApp() {
    framesData = [...initialFrames];
    activeFrameIndex = 0;
    clampInputs();
    cargarLienzoActivo();
    compilarAnimacion();
    renderizarTimeline();
    display.textContent = framesArray[activeFrameIndex]; 
    autoEscalarVisor(); 
    actualizarStats(activeFrameIndex);
}
iniciarApp();
