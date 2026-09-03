const pages = [...document.querySelectorAll('.page')];
const nextButtons = [...document.querySelectorAll('.next-btn')];
const audio = document.getElementById('bg-music');
const giftCover = document.querySelector('.gift-cover');
const giftButton = document.querySelector('.gift-card');
const toggleAudioButton = document.getElementById('toggle-audio');
const volumeSlider = document.getElementById('volume-slider');
const visualizerBars = [...document.querySelectorAll('.bar')];

let currentPage = -1;
let petalInterval = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let animationFrameId = null;

const pagePetalPalettes = {
  0: ['#f9a8d4', '#f5d0fe', '#fbcfe8', '#f9a8d4'],
  1: ['#c4b5fd', '#ddd6fe', '#e9d5ff', '#a78bfa'],
  2: ['#f9a8d4', '#fbcfe8', '#fdf2f8', '#ffffff'],
  3: ['#fca5a5', '#fecaca', '#fda4af', '#fef2f2'],
  4: ['#ff84c8', '#d85c9c', '#fbcfe8', '#fdf2f8'],
  5: ['#86efac', '#85d4a1', '#72d6a3', '#ecfccb'],
  6: ['#f9a8d4', '#fbcfe8', '#fdf2f8', '#ffffff'],
  7: ['#7cb0eb', '#bfdbfe', '#dbeafe', '#e0f2fe'],
  8: ['#e5e7eb', '#f3f4f6', '#ffffff', '#d1d5db'],
  9: ['#fdba74', '#fcd34d', '#fed7aa', '#fff7ed'],
  10: ['#c084fc', '#e9d5ff', '#aa9fda', '#f5d0fe']
};

const pageFlowerButtonPalettes = {
  0: ['#f472b6', '#f9a8d4', '#fdf2f8'],
  1: ['#a78bfa', '#c4b5fd', '#f5f3ff'],
  2: ['#f9a8d4', '#fbcfe8', '#fff7fb'],
  3: ['#ef4444', '#fca5a5', '#fff1f2'],
  4: ['#fb7185', '#f9a8d4', '#fff1f2'],
  5: ['#22c55e', '#86efac', '#f0fdf4'],
  6: ['#f9a8d4', '#fbcfe8', '#fff7fb'],
  7: ['#22c55e', '#86efac', '#f0fdf4'],
  8: ['#cbd5e1', '#e2e8f0', '#f8fafc'],
  9: ['#fbbf24', '#fdba74', '#fff7ed'],
  10: ['#c084fc', '#e9d5ff', '#faf5ff']
};

const pageThemePalettes = {
  0: { panelStart: '#f472b6', panelEnd: '#f9a8d4', buttonStart: '#ec4899', buttonEnd: '#f43f5e', accent: '#831843', bar1: '#f9a8d4', bar2: '#ee46bc' },
  1: { panelStart: '#7c3aed', panelEnd: '#a78bfa', buttonStart: '#8b5cf6', buttonEnd: '#6d28d9', accent: '#4c1d95', bar1: '#ddd6fe', bar2: '#8b5cf6' },
  2: { panelStart: '#38bdf8', panelEnd: '#f9a8d4', buttonStart: '#67e8f9', buttonEnd: '#ec4899', accent: '#0f172a', bar1: '#f9a8d4', bar2: '#67e8f9' },
  3: { panelStart: '#ef4444', panelEnd: '#fca5a5', buttonStart: '#f87171', buttonEnd: '#dc2626', accent: '#7f1d1d', bar1: '#fecaca', bar2: '#ef4444' },
  4: { panelStart: '#fb7185', panelEnd: '#f9a8d4', buttonStart: '#f43f5e', buttonEnd: '#ec4899', accent: '#831843', bar1: '#f9a8d4', bar2: '#fb7185' },
  5: { panelStart: '#22c55e', panelEnd: '#86efac', buttonStart: '#4ade80', buttonEnd: '#16a34a', accent: '#14532d', bar1: '#bbf7d0', bar2: '#22c55e' },
  6: { panelStart: '#60a5fa', panelEnd: '#f9a8d4', buttonStart: '#60a5fa', buttonEnd: '#f472b6', accent: '#1e3a8a', bar1: '#f9a8d4', bar2: '#60a5fa' },
  7: { panelStart: '#22c55e', panelEnd: '#4ade80', buttonStart: '#16a34a', buttonEnd: '#4ade80', accent: '#052e16', bar1: '#bbf7d0', bar2: '#22c55e' },
  8: { panelStart: '#cbd5e1', panelEnd: '#e2e8f0', buttonStart: '#94a3b8', buttonEnd: '#94a3b8', accent: '#111827', bar1: '#f8fafc', bar2: '#cbd5e1' },
  9: { panelStart: '#f59e0b', panelEnd: '#fdba74', buttonStart: '#fbbf24', buttonEnd: '#fb7185', accent: '#7c2d12', bar1: '#fdba74', bar2: '#fbbf24' },
  10: { panelStart: '#8b5cf6', panelEnd: '#c084fc', buttonStart: '#a78bfa', buttonEnd: '#7c3aed', accent: '#4c1d95', bar1: '#ddd6fe', bar2: '#a78bfa' }
};

function syncAudioUI() {
  if (!toggleAudioButton || !audio) return;

  if (audio.paused) {
    toggleAudioButton.textContent = 'Play';
    toggleAudioButton.setAttribute('aria-label', 'Play music');
  } else {
    toggleAudioButton.textContent = 'Pause';
    toggleAudioButton.setAttribute('aria-label', 'Pause music');
  }
}

function setVolume(value) {
  if (!audio) return;

  const normalized = Math.min(1, Math.max(0, Number(value) || 0));
  audio.volume = normalized;

  if (volumeSlider) {
    volumeSlider.value = String(normalized);
  }
}

function toggleAudioPlayback() {
  if (!audio) return;

  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }

  syncAudioUI();
}

function setupVisualizer() {
  if (!audio || visualizerBars.length === 0 || analyser) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const renderVisualizer = () => {
    if (!analyser || !visualizerBars.length) return;

    analyser.getByteFrequencyData(dataArray);

    visualizerBars.forEach((bar, index) => {
      const sampleIndex = Math.min(dataArray.length - 1, Math.max(0, Math.floor((index / visualizerBars.length) * dataArray.length)));
      const value = dataArray[sampleIndex] / 255;
      const height = 12 + value * 42;

      bar.style.height = `${height}px`;
      bar.style.opacity = String(0.45 + value * 0.8);
      bar.style.transform = `scaleY(${0.7 + value})`;
    });

    animationFrameId = requestAnimationFrame(renderVisualizer);
  };

  renderVisualizer();
}

function createPetalBurst(page) {
  const layer = page.querySelector('.petal-layer') || document.createElement('div');
  if (!layer.classList || !layer.classList.contains('petal-layer')) {
    layer.className = 'petal-layer';
    page.appendChild(layer);
  }

  const pageIndex = Number(page.dataset.page);
  const colors = pagePetalPalettes[pageIndex] || ['#f9a8d4', '#fbcfe8', '#ffffff'];

  for (let i = 0; i < 10; i += 1) {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.background = colors[Math.floor(Math.random() * colors.length)];
    petal.style.setProperty('--drift', `${(Math.random() - 0.5) * 180}px`);
    petal.style.animationDuration = `${5 + Math.random() * 4}s`;
    petal.style.animationDelay = `${Math.random() * 0.7}s`;
    layer.appendChild(petal);
  }
}

function stopPetalRain() {
  if (petalInterval) {
    clearInterval(petalInterval);
    petalInterval = null;
  }

  pages.forEach((page) => {
    const layer = page.querySelector('.petal-layer');
    if (layer) layer.remove();
  });
}

function startPetalRain(page) {
  stopPetalRain();
  createPetalBurst(page);
  petalInterval = setInterval(() => createPetalBurst(page), 450);
}

function decorateButton(button) {
  const page = button.closest('.page');
  const pageIndex = Number(page?.dataset.page ?? 0);
  const colors = pageFlowerButtonPalettes[pageIndex] || ['#f9a8d4', '#fbcfe8', '#fff7fb'];

  if (button.querySelector('.button-flowers')) {
    return;
  }

  const label = document.createElement('span');
  label.className = 'button-label';
  label.textContent = button.textContent.trim();
  button.textContent = '';
  button.appendChild(label);

  const flowerCluster = document.createElement('span');
  flowerCluster.className = 'button-flowers';

  [0.7, 1, 1.25, 0.9, 1.15].forEach((size, index) => {
    const flower = document.createElement('span');
    flower.className = 'flower-button';
    flower.style.setProperty('--flower-size', `${18 * size}px`);
    flower.style.setProperty('--flower-main', colors[index % colors.length]);
    flower.style.setProperty('--flower-accent', colors[(index + 1) % colors.length]);
    flower.style.setProperty('--flower-center', colors[(index + 2) % colors.length]);
    flower.style.setProperty('--flower-offset', `${index * 8 - 14}px`);

    for (let p = 0; p < 5; p += 1) {
      const petal = document.createElement('span');
      petal.className = 'flower-petal';
      petal.style.transform = `translate(-50%, -50%) rotate(${p * 72}deg) translateY(-${7 * size}px)`;
      flower.appendChild(petal);
    }

    const center = document.createElement('span');
    center.className = 'flower-center';
    flower.appendChild(center);
    flowerCluster.appendChild(flower);
  });

  button.appendChild(flowerCluster);
}

function updateMusicPanelTheme(pageIndex) {
  const theme = pageThemePalettes[pageIndex] || pageThemePalettes[0];
  const panel = document.querySelector('.music-panel');
  if (!panel) return;

  panel.style.setProperty('--panel-start', theme.panelStart);
  panel.style.setProperty('--panel-end', theme.panelEnd);
  panel.style.setProperty('--panel-button-start', theme.buttonStart);
  panel.style.setProperty('--panel-button-end', theme.buttonEnd);
  panel.style.setProperty('--panel-accent', theme.accent);
  panel.style.setProperty('--panel-bar-1', theme.bar1);
  panel.style.setProperty('--panel-bar-2', theme.bar2);
}

function showPage(index) {
  currentPage = index;
  updateMusicPanelTheme(currentPage);

  pages.forEach((page, pageIndex) => {
    const isActive = pageIndex === currentPage;
    page.classList.toggle('active', isActive);

    if (isActive) {
      startPetalRain(page);
    }
  });
}

function openGift() {
  if (giftCover) {
    giftCover.classList.add('hidden');
  }

  showPage(0);
  playAudio();
}

function playAudio() {
  if (!audio) return;

  setVolume(volumeSlider ? volumeSlider.value : 0.6);

  audio.play().then(() => {
    syncAudioUI();
  }).catch(() => {
    syncAudioUI();
  });
}

function handleUserAudioUnlock() {
  if (!audio || !audio.paused) {
    return;
  }

  playAudio();
}

if (giftButton) {
  giftButton.addEventListener('click', openGift);
}

if (toggleAudioButton) {
  toggleAudioButton.addEventListener('click', toggleAudioPlayback);
}

if (volumeSlider) {
  volumeSlider.addEventListener('input', (event) => {
    setVolume(event.target.value);
  });
}

if (audio) {
  audio.addEventListener('play', syncAudioUI);
  audio.addEventListener('pause', syncAudioUI);
}

nextButtons.forEach((button) => {
  decorateButton(button);
  button.addEventListener('click', () => {
    handleUserAudioUnlock();

    if (currentPage < pages.length - 1) {
      showPage(currentPage + 1);
    } else {
      showPage(0);
    }
  });
});

pages.forEach((page) => page.classList.remove('active'));
if (giftCover) {
  giftCover.classList.remove('hidden');
}

document.addEventListener('pointerdown', handleUserAudioUnlock, { passive: true });
document.addEventListener('keydown', handleUserAudioUnlock, { passive: true });

setupVisualizer();
setVolume(volumeSlider ? volumeSlider.value : 0.6);
syncAudioUI();

