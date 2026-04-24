(function(){
  "use strict";

  // ================== ELEMENTOS DEL DOM ==================
  const previewBox = document.getElementById('previewBox');
  const bioInput = document.getElementById('bioInput');
  const charCounter = document.getElementById('charCounter');
  const copyBtn = document.getElementById('copyBtn');
  
  // Pestañas y paneles
  const paletteTabBtn = document.getElementById('paletteTabBtn');
  const symbolsTabBtn = document.getElementById('symbolsTabBtn');
  const gradientTabBtn = document.getElementById('gradientTabBtn');
  const crownTabBtn = document.getElementById('crownTabBtn');
  const panels = {
    palette: document.getElementById('palettePanel'),
    symbols: document.getElementById('symbolsPanel'),
    gradient: document.getElementById('gradientPanel'),
    crown: document.getElementById('crownPanel')
  };

  // Degradados
  const gradientWord = document.getElementById('gradientWord');
  const gradientColor1 = document.getElementById('gradientColor1');
  const gradientColor2 = document.getElementById('gradientColor2');
  const applyGradientBtn = document.getElementById('applyGradientBtn');

  // Corona
  const applyCrownBtn = document.getElementById('applyCrownBtn');

  // ================== CONSTANTES ==================
  const MAX_CHARS = 50;

  const SYMBOLS = [
    '✓', '✗', '★', '☆', '☠', '☬', '♛', '♔', '✧', '✦', '❖', '⍟', '◈', '⬖', '⬗',
    'Ⓥ', 'ϟ', 'ㅤ', '☂︎', '┊', '☁︎', '✿', 'メ', 'ຊ', '〆', '炎', '⽂', '꫟', 'ᰔᩚ', '❥',
    'এ', 'み', 'ᥫ᭡', 'シ', '么', '⺓', '×᷼×', '×፝֟͜×', 'ぬ', '┋', 'ჯ', '愛', '⸸'
  ];

  // ================== SINCRONIZACIÓN DE TEMA ==================
  function syncThemeFromParent() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.tipo === 'setTema') {
        const vars = event.data.variables;
        if (vars) {
          const root = document.documentElement;
          Object.entries(vars).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
          });
        }
      }
    });

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ tipo: 'solicitarTema' }, '*');
    }
  }

  // ================== PARSER DE BIOGRAFÍA ==================
  function parseBio(text) {
    let html = '';
    let i = 0;
    const stack = [];
    
    while (i < text.length) {
      if (text[i] === '[') {
        const closeIdx = text.indexOf(']', i);
        if (closeIdx === -1) {
          html += escapeHtml(text[i]);
          i++;
          continue;
        }
        
        const tag = text.substring(i + 1, closeIdx);
        
        if (tag.startsWith('/')) {
          const closingTag = tag.substring(1);
          if (stack.length > 0 && stack[stack.length - 1] === closingTag) {
            stack.pop();
            html += getClosingTag(closingTag);
          } else {
            html += escapeHtml(text.substring(i, closeIdx + 1));
          }
          i = closeIdx + 1;
          continue;
        }
        
        if (tag === 'b' || tag === 'i' || tag === 'u' || tag === 's') {
          stack.push(tag);
          html += getOpeningTag(tag);
          i = closeIdx + 1;
          continue;
        }
        
        if (/^[0-9A-Fa-f]{6}$/.test(tag)) {
          stack.push('color');
          html += `<span style="color:#${tag};">`;
          i = closeIdx + 1;
          continue;
        }
        
        html += escapeHtml(text.substring(i, closeIdx + 1));
        i = closeIdx + 1;
      } else {
        html += escapeHtml(text[i]);
        i++;
      }
    }
    
    while (stack.length > 0) {
      const tag = stack.pop();
      html += getClosingTag(tag);
    }
    
    return html;
  }

  function getOpeningTag(tag) {
    switch (tag) {
      case 'b': return '<strong>';
      case 'i': return '<em>';
      case 'u': return '<u>';
      case 's': return '<s>';
      default: return '';
    }
  }

  function getClosingTag(tag) {
    switch (tag) {
      case 'b': return '</strong>';
      case 'i': return '</em>';
      case 'u': return '</u>';
      case 's': return '</s>';
      case 'color': return '</span>';
      default: return '';
    }
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ================== CONTADOR ==================
  function countRealChars(text) {
    return text.length;
  }

  function updateCounter() {
    const text = bioInput.value;
    const realCount = countRealChars(text);
    charCounter.textContent = `${realCount}/${MAX_CHARS}`;
    charCounter.classList.toggle('warning', realCount > MAX_CHARS);
  }

  // ================== ACTUALIZAR PREVIEW ==================
  function updatePreview() {
    const text = bioInput.value;
    const realCount = countRealChars(text);
    
    if (realCount > MAX_CHARS) {
      previewBox.innerHTML = '<span style="color:#f87171;">⚠️ Límite de 50 caracteres excedido</span>';
      return;
    }
    
    previewBox.innerHTML = parseBio(text);
  }

  // ================== INSERCIÓN DE TEXTO ==================
  function insertAtCursor(text, start, end) {
    const input = bioInput;
    const before = input.value.substring(0, start);
    const after = input.value.substring(end);
    
    input.value = before + text + after;
    input.selectionStart = input.selectionEnd = start + text.length;
    input.focus();
    
    updateCounter();
    updatePreview();
  }

  function insertTag(tag) {
    const start = bioInput.selectionStart;
    const end = bioInput.selectionEnd;
    const selectedText = bioInput.value.substring(start, end);
    const newText = `[${tag}]${selectedText}[/${tag}]`;
    insertAtCursor(newText, start, end);
  }

  function insertColorCode(color) {
    const start = bioInput.selectionStart;
    const end = bioInput.selectionEnd;
    const selectedText = bioInput.value.substring(start, end) || 'texto';
    const newText = `[${color}]${selectedText}`;
    insertAtCursor(newText, start, end);
  }

  // ================== FUNCIÓN DE CORONA (MODIFICADA - INSERCIÓN SIMPLE) ==================
  function applyCrown() {
    const start = bioInput.selectionStart;
    const end = bioInput.selectionEnd;
    
    // Insertar el símbolo en la posición del cursor
    const textToInsert = '፝֟';
    insertAtCursor(textToInsert, start, end);
    
    // El cursor ya queda después del símbolo gracias a insertAtCursor
  }

  // ================== GENERADOR DE DEGRADADOS ==================
  function hexToRgb(hex) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  function rgbToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  function generateGradient(word, color1, color2) {
    if (!word) return '';
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const length = word.length;
    let result = '';
    for (let i = 0; i < length; i++) {
      const ratio = i / (length - 1 || 1);
      const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
      const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
      const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
      const hex = rgbToHex(r, g, b);
      result += `[${hex}]${word[i]}`;
    }
    return result;
  }

  // ================== CONSTRUIR UI DINÁMICA ==================
  function buildSymbolsGrid() {
    const grid = document.getElementById('symbolsGrid');
    grid.innerHTML = SYMBOLS.map(s => 
      `<button class="symbol-btn" data-char="${s}">${s}</button>`
    ).join('');
  }

  // ================== MANEJO DE PESTAÑAS ==================
  function setupTabs() {
    const tabs = [paletteTabBtn, symbolsTabBtn, gradientTabBtn, crownTabBtn];
    const panelNames = ['palette', 'symbols', 'gradient', 'crown'];
    
    function activateTab(activeBtn, panelKey) {
      tabs.forEach(btn => btn.classList.remove('active-tab'));
      activeBtn.classList.add('active-tab');
      
      Object.values(panels).forEach(p => p.classList.remove('active'));
      panels[panelKey].classList.add('active');
    }

    paletteTabBtn.addEventListener('click', () => activateTab(paletteTabBtn, 'palette'));
    symbolsTabBtn.addEventListener('click', () => activateTab(symbolsTabBtn, 'symbols'));
    gradientTabBtn.addEventListener('click', () => activateTab(gradientTabBtn, 'gradient'));
    crownTabBtn.addEventListener('click', () => activateTab(crownTabBtn, 'crown'));

    // Activar paleta por defecto
    activateTab(paletteTabBtn, 'palette');
  }

  // ================== INICIALIZACIÓN DE EVENTOS ==================
  function initEvents() {
    bioInput.addEventListener('input', () => {
      updateCounter();
      updatePreview();
    });

    document.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => insertTag(btn.dataset.tag));
    });

    // Paleta de colores (cubitos)
    document.querySelectorAll('.color-cube').forEach(btn => {
      btn.addEventListener('click', () => insertColorCode(btn.dataset.color));
    });

    // Símbolos
    document.getElementById('symbolsGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.symbol-btn');
      if (!btn) return;
      const char = btn.dataset.char;
      const start = bioInput.selectionStart;
      const end = bioInput.selectionEnd;
      insertAtCursor(char, start, end);
    });

    // Degradado
    applyGradientBtn.addEventListener('click', () => {
      const word = gradientWord.value.trim();
      if (!word) {
        alert('Escribe una palabra para el degradado');
        return;
      }
      const color1 = gradientColor1.value.substring(1);
      const color2 = gradientColor2.value.substring(1);
      const gradientCode = generateGradient(word, color1, color2);
      const start = bioInput.selectionStart;
      insertAtCursor(gradientCode, start, start);
    });

    // Corona (inserción simple)
    if (applyCrownBtn) {
      applyCrownBtn.addEventListener('click', applyCrown);
    }

    // Copiar
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bioInput.value);
        alert('✅ Código copiado al portapapeles');
      } catch (err) {
        alert('❌ Error al copiar. Selecciona y copia manualmente.');
      }
    });

    // Bloquear entrada si excede límite
    bioInput.addEventListener('keydown', (e) => {
      const text = bioInput.value;
      const realCount = countRealChars(text);
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key.startsWith('Arrow')) return;
      if (realCount >= MAX_CHARS && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        charCounter.classList.add('warning');
        setTimeout(() => charCounter.classList.remove('warning'), 300);
      }
    });
  }

  // ================== ARRANQUE ==================
  function init() {
    syncThemeFromParent();
    buildSymbolsGrid();
    setupTabs();
    initEvents();
    updateCounter();
    updatePreview();
  }

  init();
})();