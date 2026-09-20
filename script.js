// ===== SISTEMA DE ÁUDIO E LOBBY MUSICAL =====
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol=0.1, slideFreq=null) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Escalonador de notas com tempo preciso (necessário para a música do lobby)
function playToneTime(freq, type, duration, vol, time) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration);
}

function playTap() { initAudio(); playTone(600, 'sine', 0.1, 0.1); }
function playSuccess() { initAudio(); playTone(400, 'square', 0.1, 0.05); setTimeout(()=>playTone(600, 'square', 0.15, 0.05), 100); }
function playError() { initAudio(); playTone(150, 'sawtooth', 0.3, 0.1, 100); }
function playDuplicate() { initAudio(); playTone(250, 'triangle', 0.2, 0.1); }
function playMeow() { initAudio(); playTone(800, 'sine', 0.4, 0.1, 400); }
function playWin() { initAudio(); playTone(400, 'sine', 0.1); setTimeout(()=>playTone(500, 'sine', 0.1), 100); setTimeout(()=>playTone(600, 'sine', 0.3), 200); }

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('pointerdown', playTap);
});

// === SEQUENCIADOR DO LOBBY ===
let isLobbyMusic = false;
let nextLobbyTick = 0;
let tickCount = 0;
let lobbyTimer = null;
let lobbyMasterGain = null;

// Melodia suave e aconchegante (C maj → Am → F → G), ritmo mais calmo
const lobbyMelody = [
    523.25, 0, 587.33, 659.25, 0, 698.46, 659.25, 0,
    587.33, 523.25, 0, 493.88, 523.25, 0, 0, 0,
    440.00, 0, 523.25, 587.33, 0, 659.25, 587.33, 0,
    523.25, 493.88, 0, 440.00, 392.00, 0, 0, 0
];
const lobbyHarmony = [
    659.25, 0, 0, 784.00, 0, 0, 698.46, 0,
    0, 659.25, 0, 0, 587.33, 0, 0, 0,
    523.25, 0, 0, 659.25, 0, 0, 587.33, 0,
    0, 523.25, 0, 0, 493.88, 0, 0, 0
];
const lobbyBass = [
    130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
    110.00, 0, 164.81, 0, 110.00, 0, 164.81, 0,
    174.61, 0, 220.00, 0, 174.61, 0, 220.00, 0,
    196.00, 0, 246.94, 0, 196.00, 0, 246.94, 0
];

function getLobbyMaster() {
    if (!audioCtx) return null;
    if (!lobbyMasterGain) {
        lobbyMasterGain = audioCtx.createGain();
        lobbyMasterGain.gain.value = 0.55;
        lobbyMasterGain.connect(audioCtx.destination);
    }
    return lobbyMasterGain;
}

function playLobbyTone(freq, type, duration, vol, time) {
    if (!audioCtx || !freq) return;
    const master = getLobbyMaster();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.start(time);
    osc.stop(time + duration + 0.02);
}

function playLobbyNoise(duration, vol, time) {
    if (!audioCtx) return;
    const master = getLobbyMaster();
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.start(time);
    src.stop(time + duration);
}

function startLobbyMusic() {
    if (isLobbyMusic) return;
    initAudio();
    isLobbyMusic = true;
    tickCount = 0;
    nextLobbyTick = audioCtx.currentTime + 0.12;
    scheduleLobby();
}

function stopLobbyMusic() {
    isLobbyMusic = false;
    clearTimeout(lobbyTimer);
}

function scheduleLobby() {
    if (!isLobbyMusic) return;
    while (nextLobbyTick < audioCtx.currentTime + 0.5) {
        playLobbyNotes(nextLobbyTick, tickCount);
        nextLobbyTick += 0.22; // ritmo mais suave
        tickCount++;
    }
    lobbyTimer = setTimeout(scheduleLobby, 50);
}

function playLobbyNotes(time, tick) {
    const step = tick % 32;

    const bf = lobbyBass[step];
    if (bf) playLobbyTone(bf, 'triangle', 0.28, 0.07, time);

    const mf = lobbyMelody[step];
    if (mf) playLobbyTone(mf, 'triangle', 0.2, 0.045, time);

    const hf = lobbyHarmony[step];
    if (hf) playLobbyTone(hf, 'sine', 0.24, 0.022, time);

    // Percussão suave (não agressiva)
    if (tick % 4 === 0) playLobbyNoise(0.035, 0.012, time);
    else if (tick % 2 === 0) playLobbyNoise(0.02, 0.006, time);
}

function enterLobby() {
    document.getElementById('interaction-overlay').style.display = 'none';
    initAudio();
    startLobbyMusic();
    playTap();
}


// ===== ESTADO DO JOGO =====
// Vocabulário vem de words.js (COMMON_WORDS + MAP_SEEDS)
const playableWords = COMMON_WORDS;
const dictSet = new Set(playableWords);
dictSet.add('CAMILA');

const prefixSet = new Set();
playableWords.forEach(word => {
    let prefix = '';
    for (let i = 0; i < word.length; i++) {
        prefix += word[i];
        prefixSet.add(prefix);
    }
});
['C','CA','CAM','CAMI','CAMIL','CAMILA'].forEach(p => prefixSet.add(p));

let currentMode = '';
let score = 0;
let timeRemaining = 60;
let timerInterval = null;
let currentWord = '';
let selectedNodes = [];

let foundWords = [];
let allPossibleWords = [];
let wordPaths = new Map();

const screens = {
    start: document.getElementById('screen-start'),
    game: document.getElementById('screen-game'),
    end: document.getElementById('screen-end')
};

const ui = {
    score: document.getElementById('score'),
    timerContainer: document.getElementById('timer-container'),
    timer: document.getElementById('timer'),
    wordDisplay: document.getElementById('current-word'),
    catFace: document.getElementById('cat-face'),
    catMessage: document.getElementById('cat-message'),
    grid: document.getElementById('grid'),
    finalScore: document.getElementById('final-score'),
    foundWordsList: document.getElementById('found-words-list'),
    foundCount: document.getElementById('found-count'),
    totalCount: document.getElementById('total-count'),
    endTitle: document.getElementById('end-title'),
    endMessage: document.getElementById('end-message'),
    wordsModal: document.getElementById('words-modal')
};

function toggleWordsModal() {
    playTap();
    ui.wordsModal.classList.toggle('hidden');
}

function switchScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
}

function showStartScreen() {
    switchScreen('start');
    startLobbyMusic();
}

function startGame(mode) {
    initAudio();
    stopLobbyMusic();
    currentMode = mode;
    score = 0;
    foundWords = [];
    ui.score.innerText = score;
    ui.foundWordsList.innerHTML = '';
    
    if (mode === 'cacada') {
        timeRemaining = 60;
        ui.timer.innerText = timeRemaining;
        ui.timerContainer.classList.remove('hidden');
        startTimer();
    } else {
        ui.timerContainer.classList.add('hidden');
    }

    buildGrid();
    resetCat();
    switchScreen('game');
}

function endGame(reason = 'time') {
    clearInterval(timerInterval);
    ui.finalScore.innerText = score;
    
    if (reason === 'cleared') {
        ui.endTitle.innerText = "Limpeza Total!";
        ui.endMessage.innerText = "Você encontrou todas as palavras!";
        playWin();
    } else {
        ui.endTitle.innerText = "Fim de Jogo!";
        ui.endMessage.innerText = "Miauravilhoso!";
        playError();
    }
    switchScreen('end');
    setTimeout(startLobbyMusic, 2000); // Volta a tocar depois de 2 segundos
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining--;
        ui.timer.innerText = timeRemaining;
        if (timeRemaining <= 0) {
            endGame('time');
        }
    }, 1000);
}


// ===== GERAÇÃO DE TABULEIRO 5x5 =====
const ADJ8 = [
    [-1,-1], [-1,0], [-1,1],
    [0,-1],          [0,1],
    [1,-1],  [1,0],  [1,1]
];

function findPossibleWords(gridLetters) {
    let found = new Map();
    
    function dfs(r, c, path, word) {
        if (!prefixSet.has(word)) return;

        if (word.length >= 3 && dictSet.has(word)) {
            if (!found.has(word)) {
                found.set(word, [...path]);
            }
        }
        
        if (word.length >= 12) return; 

        for (let [dr, dc] of ADJ8) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) { 
                let idx = nr * 5 + nc;
                if (!path.includes(idx)) {
                    dfs(nr, nc, [...path, idx], word + gridLetters[idx]);
                }
            }
        }
    }
    
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            dfs(r, c, [r * 5 + c], gridLetters[r * 5 + c]);
        }
    }
    return found;
}

// Contagem de rodadas (1ª partida + a cada 20)
function getRoundCount() {
    return parseInt(localStorage.getItem('wordmila_rounds') || '0', 10);
}
function bumpRoundCount() {
    const n = getRoundCount() + 1;
    localStorage.setItem('wordmila_rounds', String(n));
    return n;
}
function shouldIncludeCamila(round) {
    return (round - 1) % 20 === 0; // rodadas 1, 21, 41...
}

// Histórico recente para evitar mapas parecidos
let recentBoardWords = [];
const RECENT_BOARDS = 5;

function boardIsTooSimilar(possible) {
    if (recentBoardWords.length === 0) return false;
    const current = new Set(possible);
    for (const prev of recentBoardWords) {
        let overlap = 0;
        for (const w of current) {
            if (prev.has(w)) overlap++;
        }
        const denom = Math.min(current.size, prev.size) || 1;
        if (overlap / denom > 0.32 || overlap >= 7) return true;
    }
    return false;
}

function rememberBoardWords(possible) {
    recentBoardWords.push(new Set(possible));
    if (recentBoardWords.length > RECENT_BOARDS) recentBoardWords.shift();
}

// Sementes do mapa = palavras usuais de 4–5 letras (words.js)
const SEED_POOL = (typeof MAP_SEEDS !== 'undefined' && MAP_SEEDS.length)
    ? MAP_SEEDS
    : playableWords.filter(w => w.length >= 4 && w.length <= 5 && w !== 'CAMILA');

const SHORT_SEEDS = playableWords.filter(w => w.length === 3 && [
    'SOL','LUA','MAR','RIO','BAR','PAZ','LUZ','MEL','SAL','PAO','MAO',
    'BOI','CAO','DIA','CEU','SEM','COM','AMA','AMO','PAI','MAE','OLA',
    'ASA','REI','BOM','DOR','DAR','OLE','ORE','TOM','MAL','LAR','COR'
].includes(w));

const PLANT_DIRS = [
    [0, 1], [1, 0], [1, 1], [1, -1],
    [0, -1], [-1, 0], [-1, 1], [-1, -1]
];

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isStraightPath(path) {
    if (path.length < 3) return true;
    const r0 = Math.floor(path[0] / 5), c0 = path[0] % 5;
    const r1 = Math.floor(path[1] / 5), c1 = path[1] % 5;
    const dr = r1 - r0, dc = c1 - c0;
    for (let i = 2; i < path.length; i++) {
        const pr = Math.floor(path[i - 1] / 5), pc = path[i - 1] % 5;
        const r = Math.floor(path[i] / 5), c = path[i] % 5;
        if (r - pr !== dr || c - pc !== dc) return false;
    }
    return true;
}

/** Planta em células vazias (null) ou com a mesma letra — não sobrescreve */
function tryPlantWordSafe(grid, word) {
    const dirs = shuffleInPlace([...PLANT_DIRS]);
    const starts = shuffleInPlace(
        Array.from({ length: 25 }, (_, i) => [Math.floor(i / 5), i % 5])
    );

    for (const [sr, sc] of starts) {
        for (const [dr, dc] of dirs) {
            const cells = [];
            let ok = true;
            for (let i = 0; i < word.length; i++) {
                const r = sr + dr * i;
                const c = sc + dc * i;
                if (r < 0 || r > 4 || c < 0 || c > 4) { ok = false; break; }
                const idx = r * 5 + c;
                if (grid[idx] !== null && grid[idx] !== word[i]) { ok = false; break; }
                cells.push(idx);
            }
            if (!ok) continue;
            if (new Set(cells).size !== cells.length) continue;

            cells.forEach((idx, i) => { grid[idx] = word[i]; });
            return cells;
        }
    }
    return null;
}

function tryPlantWordSnakeSafe(grid, word, preferBent = true) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const start = Math.floor(Math.random() * 25);
        if (grid[start] !== null && grid[start] !== word[0]) continue;

        const path = [start];
        let failed = false;

        for (let i = 1; i < word.length; i++) {
            const last = path[path.length - 1];
            const r = Math.floor(last / 5), c = last % 5;
            let neighbors = [];
            for (const [dr, dc] of ADJ8) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
                const idx = nr * 5 + nc;
                if (path.includes(idx)) continue;
                if (grid[idx] !== null && grid[idx] !== word[i]) continue;
                neighbors.push(idx);
            }
            neighbors = shuffleInPlace(neighbors);
            if (neighbors.length === 0) { failed = true; break; }

            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            if (preferBent && path.length >= 2) {
                const prev = path[path.length - 2];
                const pr = Math.floor(prev / 5), pc = prev % 5;
                const dr0 = r - pr, dc0 = c - pc;
                const bent = neighbors.filter(idx => {
                    const nr = Math.floor(idx / 5), nc = idx % 5;
                    return (nr - r) !== dr0 || (nc - c) !== dc0;
                });
                if (bent.length && Math.random() > 0.25) {
                    next = bent[Math.floor(Math.random() * bent.length)];
                }
            }
            path.push(next);
        }

        if (failed || path.length !== word.length) continue;
        if (preferBent && isStraightPath(path) && Math.random() > 0.3) continue;

        path.forEach((idx, i) => { grid[idx] = word[i]; });
        return path;
    }
    return tryPlantWordSafe(grid, word);
}

function tryPlantWord(grid, word) {
    // compat: planta forçando (grid já preenchido com letras)
    const dirs = shuffleInPlace([...PLANT_DIRS]);
    const starts = shuffleInPlace(
        Array.from({ length: 25 }, (_, i) => [Math.floor(i / 5), i % 5])
    );
    for (const [sr, sc] of starts) {
        for (const [dr, dc] of dirs) {
            const cells = [];
            let ok = true;
            for (let i = 0; i < word.length; i++) {
                const r = sr + dr * i, c = sc + dc * i;
                if (r < 0 || r > 4 || c < 0 || c > 4) { ok = false; break; }
                cells.push(r * 5 + c);
            }
            if (!ok || new Set(cells).size !== cells.length) continue;
            cells.forEach((idx, i) => { grid[idx] = word[i]; });
            return cells;
        }
    }
    return null;
}

function tryPlantWordSnake(grid, word, preferBent = true) {
    return tryPlantWordSnakeSafe(grid, word, preferBent) || tryPlantWord(grid, word);
}

function sprinkleCamilaDecoys(grid, path) {
    const pathSet = new Set(path || []);
    const decoys = ['C', 'A', 'M', 'I', 'L', 'A', 'C', 'M', 'L'];
    const free = shuffleInPlace(
        Array.from({ length: 25 }, (_, i) => i).filter(i => !pathSet.has(i) && (grid[i] === null || true))
    );
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count && i < free.length; i++) {
        if (pathSet.has(free[i])) continue;
        grid[free[i]] = decoys[i % decoys.length];
    }
}

function breakCamilaIfPresent(grid, possibleMap) {
    const path = possibleMap.get('CAMILA');
    if (!path) return;
    const fillers = 'EORUSTNBDG';
    const idx = path[Math.floor(Math.random() * path.length)];
    let letter;
    do { letter = fillers[Math.floor(Math.random() * fillers.length)]; }
    while (letter === grid[idx]);
    grid[idx] = letter;
}

function pickVariedSeeds(count, recentWords) {
    const recent = recentWords || new Set();
    const picked = [];
    const primary = shuffleInPlace([...SEED_POOL]);
    const shorts = shuffleInPlace([...SHORT_SEEDS]);

    // 80% palavras de 4–5 letras
    for (const w of primary) {
        if (picked.length >= Math.ceil(count * 0.85)) break;
        if (recent.has(w) || picked.includes(w)) continue;
        picked.push(w);
    }
    for (const w of shorts) {
        if (picked.length >= count) break;
        if (recent.has(w) || picked.includes(w)) continue;
        picked.push(w);
    }
    for (const w of primary) {
        if (picked.length >= count) break;
        if (!picked.includes(w)) picked.push(w);
    }
    return picked;
}

function countByLen(words, minLen) {
    return words.filter(w => w.length >= minLen).length;
}

function generateValidBoard(forceCamila) {
    const FREQ = 'AAAAAEEEEEEIIIIOOOOUUUSSSSRRRRNNNNMMMCCCLLLPPPTTTVVDDGGGBBFFHH';
    const allRecent = new Set();
    recentBoardWords.forEach(set => set.forEach(w => allRecent.add(w)));

    let gridLetters = [];
    let possibleMap = new Map();
    let possible = [];
    let best = null;

    for (let attempts = 0; attempts < 150; attempts++) {
        // 1) grid vazio — planta palavras usuais sem sobrescrever
        const grid = Array(25).fill(null);
        const planted = [];
        const seedCount = 5 + Math.floor(Math.random() * 3); // 5–7
        const seeds = pickVariedSeeds(seedCount + 6, allRecent);

        for (const word of seeds) {
            if (planted.length >= seedCount) break;
            const path = Math.random() > 0.5
                ? tryPlantWordSnakeSafe(grid, word, false)
                : tryPlantWordSafe(grid, word);
            if (path) planted.push(word);
        }

        // garante palavras usuais se couber
        for (const w of shuffleInPlace([
            'BAR','SOL','LUA','MAR','PAZ','MEL','DOR','DAR','OLE','ORE',
            'CASA','AMOR','AMA','AMO','GATO','MESA','NATO','NETA','NETO',
            'FUMO','MOLA','SONO','SONHO','SONHA','MIA','MIO','MIOU','MIADO'
        ])) {
            if (planted.includes(w)) continue;
            if (planted.length >= seedCount + 2) break;
            const path = tryPlantWordSafe(grid, w);
            if (path) planted.push(w);
        }

        let camilaPath = null;
        if (forceCamila) {
            camilaPath = tryPlantWordSnakeSafe(grid, 'CAMILA', true) || tryPlantWordSafe(grid, 'CAMILA');
            if (camilaPath) {
                planted.push('CAMILA');
                // iscas só em células ainda vazias
                const pathSet = new Set(camilaPath);
                const free = shuffleInPlace(Array.from({length:25},(_,i)=>i).filter(i => grid[i]===null && !pathSet.has(i)));
                ['C','A','M','I','L'].forEach((ch, i) => { if (free[i] != null) grid[free[i]] = ch; });
            }
        }

        // 2) preenche vazios com letras das palavras plantadas + frequência PT
        const fromSeeds = planted.join('') || 'AEIOURSN';
        for (let i = 0; i < 25; i++) {
            if (grid[i] !== null) continue;
            if (Math.random() > 0.35) {
                grid[i] = fromSeeds[Math.floor(Math.random() * fromSeeds.length)];
            } else {
                grid[i] = FREQ[Math.floor(Math.random() * FREQ.length)];
            }
        }

        gridLetters = grid;
        possibleMap = findPossibleWords(gridLetters);

        if (forceCamila && !possibleMap.has('CAMILA')) continue;
        if (!forceCamila && possibleMap.has('CAMILA')) {
            breakCamilaIfPresent(gridLetters, possibleMap);
            possibleMap = findPossibleWords(gridLetters);
            if (possibleMap.has('CAMILA')) continue;
        }

        possible = Array.from(possibleMap.keys());

        // palavras plantadas que realmente dá pra formar
        const plantedOk = planted.filter(w => possibleMap.has(w));
        const usual4 = countByLen(possible, 4);
        const usual5 = countByLen(possible, 5);

        // critérios de qualidade (mapa jogável)
        const quality =
            plantedOk.length >= Math.min(4, planted.length) &&
            possible.length >= 10 &&
            usual4 >= 5;

        const score = plantedOk.length * 10 + usual4 * 3 + usual5 * 2 + possible.length;
        if (!best || score > best.score) {
            best = { gridLetters: [...gridLetters], possible: [...possible], possibleMap: new Map(possibleMap), score };
        }

        if (!quality) continue;
        // similaridade: só evita cópia quase igual, sem forçar mapa pior
        if (boardIsTooSimilar(possible) && attempts < 80 && score < (best.score || 0) + 5) continue;

        rememberBoardWords(possible);
        return { gridLetters, possible, possibleMap };
    }

    // Fallback: melhor tentativa (não piora com o tempo)
    if (best) {
        rememberBoardWords(best.possible);
        return best;
    }
    rememberBoardWords(possible);
    return { gridLetters, possible, possibleMap };
}

function buildGrid() {
    ui.grid.innerHTML = '';

    const round = bumpRoundCount();
    const forceCamila = shouldIncludeCamila(round);
    
    const boardData = generateValidBoard(forceCamila);
    allPossibleWords = boardData.possible;
    wordPaths = boardData.possibleMap;
    
    ui.foundCount.innerText = "0";
    ui.totalCount.innerText = allPossibleWords.length;

    boardData.gridLetters.forEach((letter, index) => {
        const node = document.createElement('div');
        node.classList.add('letter-node');
        node.innerText = letter;
        node.dataset.index = index;
        
        node.addEventListener('pointerdown', startWord);
        node.addEventListener('pointerenter', enterNode);
        
        ui.grid.appendChild(node);
    });

    document.addEventListener('pointerup', endWord);
}


// ===== LÓGICA DE INTERAÇÃO =====
let isDragging = false;

function startWord(e) {
    isDragging = true;
    selectedNodes = [];
    currentWord = '';
    ui.wordDisplay.innerText = '';

    // Ao começar a montar outra palavra, encerra reação fofa pendente
    if (cuteReactionActive) resetCat();
    
    document.querySelectorAll('.letter-node').forEach(n => {
        n.classList.remove('selected', 'hint', 'error', 'duplicate', 'correct');
    });
    
    enterNode.call(this, e);
}

function enterNode(e) {
    if (!isDragging) return;
    if (selectedNodes.includes(this)) return;

    playTap();
    this.classList.add('selected');
    selectedNodes.push(this);
    currentWord += this.innerText;
    ui.wordDisplay.innerText = currentWord;
}

ui.grid.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.classList.contains('letter-node')) {
        enterNode.call(element, e);
    }
});

function endWord() {
    if (!isDragging) return;
    isDragging = false;
    checkWord(currentWord);
}

function checkWord(word) {
    let isCorrect = false;
    let isDuplicate = false;

    if (word.length >= 3) {
        if (foundWords.includes(word)) {
            isDuplicate = true;
        } else if (dictSet.has(word)) {
            isCorrect = true;
        }
    }

    if (isDuplicate) {
        playDuplicate();
        reactCat('o_O', 'Já achei essa!');
        selectedNodes.forEach(n => n.classList.add('duplicate'));
    } 
    else if (isCorrect) {
        playSuccess();
        
        selectedNodes.forEach(n => n.classList.add('correct'));
        
        foundWords.push(word);
        ui.foundCount.innerText = foundWords.length;
        
        const tag = document.createElement('span');
        tag.classList.add('found-word-tag');
        tag.innerText = word;
        ui.foundWordsList.appendChild(tag);
        
        let wordScore = word.length * 10;
        score += wordScore;
        if (currentMode === 'cacada') {
            timeRemaining += 2; 
            ui.timer.innerText = timeRemaining;
        }

        if (word === 'CAMILA') {
            playWin();
            reactCat('♥‿♥', 'A gata mais linda do mundo! +100 pts!', true);
            score += 100;
        } else if (word.startsWith('AMOR')) {
            playMeow();
            reactCat('♥‿♥', 'O amor está no ar! +50 pts!', true);
            score += 50;
        } else if (word.startsWith('GATA')) {
            playMeow();
            reactCat('♥ω♥', 'Miau! É vc! +50 pts!', true);
            score += 50;
        } else if (word.startsWith('GATO')) {
            playMeow();
            reactCat('^ↀᴥↀ^', 'Miau! Sou eu! +50 pts!', true);
            score += 50;
        } else {
            reactCat('^w^', `Boa! +${wordScore} pts`);
        }
    } 
    else {
        if (word.length >= 3) playError();
        reactCat('T_T', 'Essa eu não sei...');
        selectedNodes.forEach(n => n.classList.add('error'));
    }
    
    ui.score.innerText = score;

    setTimeout(() => {
        document.querySelectorAll('.letter-node').forEach(n => {
            n.classList.remove('selected', 'error', 'duplicate', 'correct');
        });
        ui.wordDisplay.innerText = '';
        currentWord = '';
    }, 400);

    if (isCorrect && foundWords.length === allPossibleWords.length) {
        setTimeout(() => endGame('cleared'), 1000);
    }
}

let catReactionTimer = null;
let cuteReactionActive = false;

function reactCat(face, message, cute = false) {
    clearTimeout(catReactionTimer);
    cuteReactionActive = cute;
    ui.catFace.innerHTML = ` /\\_/\\<br>(${face})`;
    ui.catMessage.innerText = message;

    // Fofa: +1s (4s) ou até formar a próxima palavra
    const duration = cute ? 4000 : 3000;
    catReactionTimer = setTimeout(resetCat, duration);
}

function resetCat() {
    clearTimeout(catReactionTimer);
    cuteReactionActive = false;
    ui.catFace.innerHTML = ` /\\_/\\<br>( -.- )`;
    ui.catMessage.innerText = currentMode === 'soneca' ? 'zZzZz...' : 'Tô de olho...';
}

function useHint() {
    playTap();
    const missingWords = allPossibleWords.filter(w => !foundWords.includes(w));
    if (missingWords.length === 0) {
        reactCat('^_^', 'Você já achou tudo!');
        return;
    }

    // Prefere dica real: palavra existente de até 4 letras
    let shortHints = missingWords.filter(w => w.length >= 3 && w.length <= 4);
    if (shortHints.length === 0) {
        const minLen = Math.min(...missingWords.map(w => w.length));
        shortHints = missingWords.filter(w => w.length === minLen);
    }

    const hintWord = shortHints[Math.floor(Math.random() * shortHints.length)];
    const path = wordPaths.get(hintWord);
    if (!path) return;

    reactCat('O_O', `Pista: ${hintWord}!`);

    document.querySelectorAll('.letter-node.hint').forEach(n => n.classList.remove('hint'));
    path.forEach((idx, i) => {
        const node = document.querySelector(`.letter-node[data-index="${idx}"]`);
        if (!node) return;
        setTimeout(() => {
            node.classList.add('hint');
            setTimeout(() => node.classList.remove('hint'), 1800);
        }, i * 120);
    });
}
