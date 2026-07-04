let animationInterval = null;
let currentFrameIndex = 0;
let framesArray = [];
let isPlaying = false;

const asciiInput = document.getElementById('asciiInput');
const linesInput = document.getElementById('linesPerFrame');
const charsInput = document.getElementById('charsPerLine');
const fpsInput = document.getElementById('fps');
const display = document.getElementById('display');
const screenWrapper = document.getElementById('screenWrapper');
const editorPanel = document.getElementById('editorPanel');

const statFrames = document.getElementById('statFrames');
const statCurrent = document.getElementById('statCurrent');

const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');
const btnToggleEditor = document.getElementById('btnToggleEditor');

// Carga de animación inicial
asciiInput.value = ` [======] \n |  ||  | \n |  o   | \n |      | \n [======] \n [======] \n |      | \n |  o== | \n |      | \n [======] \n [======] \n |      | \n |  o   | \n |  ||  | \n [======] \n [======] \n |      | \n |==o   | \n |      | \n [======]`;

function procesarFrames() {
    const text = asciiInput.value;
    const linesPerFrame = parseInt(linesInput.value) || 5;
    const charsPerLine = parseInt(charsInput.value) || 10;
    
    const allLines = text.split('\n');
    framesArray = [];

    for (let i = 0; i < allLines.length; i += linesPerFrame) {
        let frameLines = allLines.slice(i, i + linesPerFrame);
        if (frameLines.length < linesPerFrame) break;

        let processedFrame = frameLines.map(line => {
            return line.substring(0, charsPerLine).padEnd(charsPerLine, ' ');
        }).join('\n');

        framesArray.push(processedFrame);
    }
    statFrames.textContent = `Frames: ${framesArray.length}`;
}

function play() {
    if (isPlaying) return;
    procesarFrames();

    if (framesArray.length === 0) {
        display.textContent = "Sin datos válidos.";
        return;
    }

    isPlaying = true;
    screenWrapper.classList.add('playing');
    const fps = parseInt(fpsInput.value) || 4;
    
    document.activeElement.blur(); 

    animationInterval = setInterval(() => {
        display.textContent = framesArray[currentFrameIndex];
        statCurrent.textContent = `Actual: ${currentFrameIndex + 1}`;
        currentFrameIndex = (currentFrameIndex + 1) % framesArray.length;
    }, 1000 / fps);
}

function pause() {
    clearInterval(animationInterval);
    isPlaying = false;
    screenWrapper.classList.remove('playing');
}

function stop() {
    clearInterval(animationInterval);
    isPlaying = false;
    currentFrameIndex = 0;
    screenWrapper.classList.remove('playing');
    display.textContent = "Animación libre.";
    statCurrent.textContent = `Actual: 0`;
}

btnToggleEditor.addEventListener('click', () => {
    editorPanel.classList.toggle('hidden');
    const btnText = btnToggleEditor.querySelector('span');
    btnText.textContent = editorPanel.classList.contains('hidden') ? "Mostrar Editor" : "Ocultar Editor";
});

btnPlay.addEventListener('click', play);
btnPause.addEventListener('click', pause);
btnStop.addEventListener('click', stop);
asciiInput.addEventListener('input', procesarFrames);
linesInput.addEventListener('input', procesarFrames);
charsInput.addEventListener('input', procesarFrames);

procesarFrames();