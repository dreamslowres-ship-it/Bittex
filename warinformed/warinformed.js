(function(){
  "use strict";

  // ================== BLOQUES (hora Bolivia UTC-4) ==================
  const BLOQUES = [
    { id: 'B1', start: [18,0], end: [19,0], bono: 10 },
    { id: 'B2', start: [19,0], end: [20,0], bono: 5 },
    { id: 'B3', start: [20,0], end: [21,0], bono: 5 },
    { id: 'B4', start: [21,0], end: [22,0], bono: 5 }
  ];

  // ================== DETECCIÓN DE PAÍS (MEJORADA) ==================
  function getLocalCountry() {
    // 1. Obtener código de país desde la zona horaria (más fiable)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Mapeo común de zonas horarias a códigos de país (formato ISO 3166-1 alpha-2)
    const tzCountryMap = {
      'America/La_Paz': 'BO', 'America/Argentina/Buenos_Aires': 'AR', 'America/Argentina/Cordoba': 'AR',
      'America/Argentina/Salta': 'AR', 'America/Argentina/Tucuman': 'AR', 'America/Argentina/La_Rioja': 'AR',
      'America/Argentina/San_Juan': 'AR', 'America/Argentina/Mendoza': 'AR', 'America/Argentina/San_Luis': 'AR',
      'America/Argentina/Rio_Gallegos': 'AR', 'America/Argentina/Ushuaia': 'AR', 'America/Argentina/Catamarca': 'AR',
      'America/Argentina/Jujuy': 'AR', 'America/Santiago': 'CL', 'Pacific/Easter': 'CL', 'America/Lima': 'PE',
      'America/Bogota': 'CO', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'Pacific/Galapagos': 'EC',
      'America/Asuncion': 'PY', 'America/Montevideo': 'UY', 'America/La_Paz': 'BO', 'America/Noronha': 'BR',
      'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR', 'America/Cuiaba': 'BR', 'America/Porto_Velho': 'BR',
      'America/Boa_Vista': 'BR', 'America/Eirunepe': 'BR', 'America/Rio_Branco': 'BR', 'America/Mexico_City': 'MX',
      'America/Cancun': 'MX', 'America/Monterrey': 'MX', 'America/Tijuana': 'MX', 'America/Chicago': 'US',
      'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US',
      'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'Europe/Madrid': 'ES', 'America/Guatemala': 'GT',
      'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Panama': 'PA',
      'America/Costa_Rica': 'CR', 'America/Santo_Domingo': 'DO', 'America/Havana': 'CU', 'America/Puerto_Rico': 'PR'
    };
    const tzCountry = tzCountryMap[tz];
    
    if (tzCountry) {
      try {
        const displayNames = new Intl.DisplayNames(['es'], { type: 'region' });
        return displayNames.of(tzCountry);
      } catch(e) {}
    }
    
    // 2. Fallback: usar el código de región del idioma del navegador
    const locale = navigator.language || 'es';
    const parts = locale.split(/[-_]/);
    if (parts.length > 1 && parts[1].length === 2) {
      const region = parts[1].toUpperCase();
      try {
        const displayNames = new Intl.DisplayNames(['es'], { type: 'region' });
        return displayNames.of(region);
      } catch(e) {}
    }
    
    // 3. Último fallback: extraer del timezone
    const tzParts = tz.split('/');
    return tzParts[tzParts.length-1].replace(/_/g, ' ');
  }

  function getTimeDifference() {
    const now = new Date();
    const boliviaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    return (localTime.getTime() - boliviaTime.getTime()) / (1000 * 60 * 60);
  }

  function formatLocalTime(hour, minute, diffHours) {
    let localHour = hour + diffHours;
    if (localHour < 0) localHour += 24;
    if (localHour >= 24) localHour -= 24;
    const h = Math.floor(localHour);
    const m = Math.round((localHour - h) * 60) || minute;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }

  function updateTimezoneDisplay() {
    const country = getLocalCountry();
    const diffHours = getTimeDifference();
    const sign = diffHours >= 0 ? '+' : '';
    document.getElementById('timezoneText').textContent = 
      `Zona detectada: ${country} (UTC${sign}${diffHours.toFixed(1)}) · Las horas se muestran en tu hora local`;
    
    // Renderizar bloques con hora local y nombre del país
    const grid = document.getElementById('bloquesGrid');
    grid.innerHTML = BLOQUES.map(b => {
      const startLocal = formatLocalTime(b.start[0], b.start[1], diffHours);
      const endLocal = formatLocalTime(b.end[0], b.end[1], diffHours);
      return `
        <div class="bloque-card">
          <div class="bloque-header">${b.id}</div>
          <div class="bloque-time-local">${startLocal} – ${endLocal} (hora ${country})</div>
          <div class="bloque-bono">+${b.bono} placas</div>
        </div>
      `;
    }).join('');
  }

  // ================== CALCULADORA DE BONOS ==================
  const BLOQUE_BONOS = { B1: 10, B2: 5, B3: 5, B4: 5 };
  let seleccionados = new Set();

  function actualizarCalculadora() {
    const arr = Array.from(seleccionados);
    let total = 0;
    let detalle = '';
    arr.forEach(b => { total += BLOQUE_BONOS[b]; detalle += `${b}(+${BLOQUE_BONOS[b]}) `; });
    if (arr.length === 4) { total += 5; detalle += '+5 (4 bloques) '; }
    if (seleccionados.has('B1') && seleccionados.has('B2')) { total += 5; detalle += '+5 (B1+B2) '; }
    document.getElementById('placasValue').textContent = total;
    document.getElementById('calcDetail').textContent = detalle || 'Ningún bloque seleccionado';
  }

  function initCalculator() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const block = btn.dataset.block;
        if (seleccionados.has(block)) {
          seleccionados.delete(block);
          btn.classList.remove('active');
        } else {
          seleccionados.add(block);
          btn.classList.add('active');
        }
        actualizarCalculadora();
      });
    });
    actualizarCalculadora();
  }

  // ================== SINCRONIZACIÓN DE TEMA ==================
  function syncTheme() {
    window.addEventListener('message', (e) => {
      if (e.data?.tipo === 'setTema' && e.data.variables) {
        const root = document.documentElement;
        Object.entries(e.data.variables).forEach(([k,v]) => root.style.setProperty(`--${k}`, v));
      }
    });
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ tipo: 'solicitarTema' }, '*');
    }
  }

  // ================== INIT ==================
  updateTimezoneDisplay();
  initCalculator();
  syncTheme();
})();