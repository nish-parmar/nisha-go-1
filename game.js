/**
 * NISHA GO! - Game Engine
 * Endless runner with lane movement, momentum system
 */

// ===== GAME CONFIGURATION =====
const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 144,    // 3 lanes * 48px (divisible by 8)
  CANVAS_HEIGHT: 256,   // Tall for runner feel
  PIXEL_SCALE: 2,       // Integer scaling for crisp pixels

  // Lanes
  LANE_COUNT: 3,
  LANE_WIDTH: 48,

  // Player
  PLAYER_SIZE: 32,
  PLAYER_START_LANE: 1, // Middle lane (0-indexed)

  // Obstacles (Chaos)
  CHAOS_SIZE: 24,
  CHAOS_SPAWN_INTERVAL: 1800,   // ms (slower spawn)
  CHAOS_MIN_INTERVAL: 600,      // Minimum spawn interval
  CHAOS_SPEED: 1.2,             // pixels per frame (slower)
  CHAOS_MAX_SPEED: 4,

  // Pickups (Trainers)
  TRAINER_SIZE: 20,
  TRAINER_SPAWN_INTERVAL: 3000,
  TRAINER_SPEED: 1,             // slower
  TRAINER_SCORE_BONUS: 100,
  TRAINER_MOMENTUM_BONUS: 20,

  // Momentum
  MOMENTUM_MAX: 100,
  MOMENTUM_DECAY: 0.02,         // per frame (slower decay)
  MOMENTUM_MIN_DECAY: 0.05,     // max decay rate

  // Scoring
  SCORE_PER_SECOND: 10,

  // Difficulty
  DIFFICULTY_INCREASE_INTERVAL: 8000, // ms (slower ramp)
  DIFFICULTY_MULTIPLIER: 1.08
};

// ===== COLORS =====
const COLORS = {
  BG: '#050505',
  ORANGE_BRIGHT: '#FF8A00',
  ORANGE_GLOW: '#FFB000',
  ORANGE_DIM: '#663700',
  ORANGE_DARK: '#331c00',
  LANE_LINE: '#1a1a1a',
  PLAYER: '#FF8A00',
  PLAYER_OUTLINE: '#FFB000',
  CHAOS: '#442200',
  CHAOS_FILL: '#663700',
  CHAOS_OUTLINE: '#FF5500',
  TRAINER: '#FFB000',
  TRAINER_INNER: '#FFCC44',
  TRAINER_OUTLINE: '#FF8A00'
};

// ===== GAME STATE =====
const state = {
  // Game status
  gameState: 'start', // 'start', 'playing', 'paused', 'gameover'

  // Player
  playerLane: CONFIG.PLAYER_START_LANE,
  playerY: 0,

  // Entities
  chaosBlocks: [],
  trainers: [],
  particles: [],
  scorePopups: [],

  // Scoring
  score: 0,
  highScore: 0,

  // Momentum
  momentum: CONFIG.MOMENTUM_MAX,

  // Timing
  lastFrameTime: 0,
  lastChaosSpawn: 0,
  lastTrainerSpawn: 0,
  lastDifficultyIncrease: 0,
  gameStartTime: 0,

  // Difficulty
  currentChaosInterval: CONFIG.CHAOS_SPAWN_INTERVAL,
  currentChaosSpeed: CONFIG.CHAOS_SPEED,
  currentMomentumDecay: CONFIG.MOMENTUM_DECAY,
  speedMultiplier: 1.0,
  waveNumber: 1,

  // Reduced motion preference
  reducedMotion: false,

  // Screen shake
  shakeIntensity: 0,
  shakeDuration: 0,

  // Flash effect
  flashAlpha: 0,

  // Touch controls
  touchStartX: 0,
  touchStartY: 0,

  // Momentum warning
  momentumWarned: false,

  // FPS tracking
  frameCount: 0,
  lastFpsUpdate: 0,
  currentFps: 60
};

// ===== DOM ELEMENTS =====
let canvas, ctx;
let startScreen, pauseScreen, gameoverScreen;
let scoreDisplay, highscoreDisplay, momentumFill, momentumValue;
let gameStateDisplay, speedDisplay, modeDisplay, laneDisplay, waveDisplay;
let finalScore, finalHighscore, deathReasonDisplay;
let sysRun, sysSnd, sysNet;
let fpsDisplay;

// ===== INITIALIZATION =====
function init() {
  // Check reduced motion preference
  state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Get DOM elements
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  startScreen = document.getElementById('start-screen');
  pauseScreen = document.getElementById('pause-screen');
  gameoverScreen = document.getElementById('gameover-screen');

  scoreDisplay = document.getElementById('score-display');
  highscoreDisplay = document.getElementById('highscore-display');
  momentumFill = document.getElementById('momentum-fill');
  momentumValue = document.getElementById('momentum-value');
  gameStateDisplay = document.getElementById('game-state');
  speedDisplay = document.getElementById('speed-display');
  modeDisplay = document.getElementById('mode-display');
  laneDisplay = document.getElementById('lane-display');
  waveDisplay = document.getElementById('wave-display');
  finalScore = document.getElementById('final-score');
  finalHighscore = document.getElementById('final-highscore');
  deathReasonDisplay = document.getElementById('death-reason');
  sysRun = document.getElementById('sys-run');
  sysSnd = document.getElementById('sys-snd');
  sysNet = document.getElementById('sys-net');
  fpsDisplay = document.getElementById('fps-display');

  // Setup canvas
  setupCanvas();

  // Load high score
  loadHighScore();

  // Setup input handlers
  setupInput();

  // Setup button handlers
  setupButtons();

  // Generate session ID
  generateSessionId();

  // Start game loop
  requestAnimationFrame(gameLoop);
}

function generateSessionId() {
  const chars = '0123456789ABCDEF';
  let id = '0x';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById('session-id').textContent = id;
}

function setupCanvas() {
  // Set internal resolution
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;

  // Scale for display
  canvas.style.width = (CONFIG.CANVAS_WIDTH * CONFIG.PIXEL_SCALE) + 'px';
  canvas.style.height = (CONFIG.CANVAS_HEIGHT * CONFIG.PIXEL_SCALE) + 'px';

  // Disable image smoothing for crisp pixels
  ctx.imageSmoothingEnabled = false;

  // Calculate player Y position (near bottom)
  state.playerY = CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_SIZE - 32;
}

function loadHighScore() {
  const saved = localStorage.getItem('nisha-go-highscore');
  if (saved) {
    state.highScore = parseInt(saved, 10);
    updateHighScoreDisplay();
  }
}

function saveHighScore() {
  localStorage.setItem('nisha-go-highscore', state.highScore.toString());
}

// ===== INPUT HANDLING =====
function setupInput() {
  document.addEventListener('keydown', handleKeyDown);

  // Touch controls
  const gameCanvas = document.getElementById('game-canvas');

  gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  gameCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Also allow touch on the whole game container for mobile
  const container = document.getElementById('game-container');
  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
  e.preventDefault();
  if (!e.changedTouches[0]) return;

  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - state.touchStartX;
  const deltaY = touch.clientY - state.touchStartY;

  // Require minimum swipe distance
  const minSwipe = 30;

  // Horizontal swipe takes priority
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
    if (state.gameState === 'playing') {
      if (deltaX > 0) {
        movePlayer(1);  // Swipe right
      } else {
        movePlayer(-1); // Swipe left
      }
    }
  } else if (Math.abs(deltaY) < minSwipe && Math.abs(deltaX) < minSwipe) {
    // Tap (not a swipe) - start game or handle tap
    if (state.gameState === 'start') {
      startGame();
    } else if (state.gameState === 'gameover') {
      restartGame();
    } else if (state.gameState === 'paused') {
      togglePause();
    }
  }
}

function triggerScreenShake(intensity = 5, duration = 200) {
  if (state.reducedMotion) return;
  state.shakeIntensity = intensity;
  state.shakeDuration = duration;
}

function updateScreenShake(deltaTime) {
  if (state.shakeDuration > 0) {
    state.shakeDuration -= deltaTime;
    if (state.shakeDuration <= 0) {
      state.shakeIntensity = 0;
      state.shakeDuration = 0;
    }
  }
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();

  // Global controls
  if (key === 'escape') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (key === 'r') {
    e.preventDefault();
    if (state.gameState === 'gameover' || state.gameState === 'paused') {
      restartGame();
    }
    return;
  }

  // Playing controls
  if (state.gameState === 'playing') {
    if (key === 'a' || key === 'arrowleft') {
      e.preventDefault();
      movePlayer(-1);
    } else if (key === 'd' || key === 'arrowright') {
      e.preventDefault();
      movePlayer(1);
    }
  }

  // Start screen - Space or Enter to start
  if (state.gameState === 'start') {
    if (key === ' ' || key === 'enter') {
      e.preventDefault();
      startGame();
    }
  }
}

function movePlayer(direction) {
  const newLane = state.playerLane + direction;
  if (newLane >= 0 && newLane < CONFIG.LANE_COUNT) {
    state.playerLane = newLane;
    // Play move sound
    if (typeof Audio !== 'undefined') Audio.move();
  }
}

// ===== BUTTON HANDLERS =====
function setupButtons() {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('resume-btn').addEventListener('click', togglePause);
  document.getElementById('restart-btn').addEventListener('click', restartGame);
  document.getElementById('btn-abort').addEventListener('click', abortGame);
  document.getElementById('btn-export').addEventListener('click', exportScore);

  // Sound toggle - click SND indicator
  const sndIndicator = document.getElementById('sys-snd');
  if (sndIndicator) {
    sndIndicator.style.cursor = 'pointer';
    sndIndicator.addEventListener('click', toggleSound);
    // Initialize as active (sound on)
    sndIndicator.classList.add('active');
  }
}

function toggleSound() {
  if (typeof Audio !== 'undefined') {
    const enabled = Audio.toggle();
    const sndIndicator = document.getElementById('sys-snd');
    if (sndIndicator) {
      if (enabled) {
        sndIndicator.classList.add('active');
      } else {
        sndIndicator.classList.remove('active');
      }
    }
  }
}

function abortGame() {
  if (state.gameState === 'playing' || state.gameState === 'paused') {
    endGame();
  }
}

function exportScore() {
  const data = {
    game: 'NISHA GO!',
    score: state.score,
    highScore: state.highScore,
    timestamp: new Date().toISOString()
  };
  console.log('SCORE EXPORT:', JSON.stringify(data, null, 2));
  alert('Score exported to console!');
}

// ===== GAME STATE MANAGEMENT =====
function startGame() {
  state.gameState = 'playing';
  state.momentumWarned = false;

  // Play start sound
  if (typeof Audio !== 'undefined') Audio.start();
  state.playerLane = CONFIG.PLAYER_START_LANE;
  state.chaosBlocks = [];
  state.trainers = [];
  state.particles = [];
  state.scorePopups = [];
  state.score = 0;
  state.momentum = CONFIG.MOMENTUM_MAX;
  state.currentChaosInterval = CONFIG.CHAOS_SPAWN_INTERVAL;
  state.currentChaosSpeed = CONFIG.CHAOS_SPEED;
  state.currentMomentumDecay = CONFIG.MOMENTUM_DECAY;
  state.speedMultiplier = 1.0;
  state.waveNumber = 1;
  state.gameStartTime = performance.now();
  state.lastChaosSpawn = 0;
  state.lastTrainerSpawn = 0;
  state.lastDifficultyIncrease = 0;

  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');

  updateHUD();
  updateModeDisplay('ACTIVE');
  updateGameStateDisplay('RUN');
  updateSysIndicators(true);
}

function togglePause() {
  if (state.gameState === 'playing') {
    state.gameState = 'paused';
    pauseScreen.classList.remove('hidden');
    updateModeDisplay('PAUSED');
    updateGameStateDisplay('HALT');
    updateSysIndicators(false);
    document.getElementById('resume-btn').focus();
  } else if (state.gameState === 'paused') {
    state.gameState = 'playing';
    pauseScreen.classList.add('hidden');
    updateModeDisplay('ACTIVE');
    updateGameStateDisplay('RUN');
    updateSysIndicators(true);
  }
}

function endGame(reason = 'collision') {
  state.gameState = 'gameover';
  state.deathReason = reason;

  // Sound, screen shake, and flash
  if (typeof Audio !== 'undefined') {
    Audio.hit();
    setTimeout(() => Audio.gameOver(), 200);
  }
  triggerScreenShake(8, 300);
  if (!state.reducedMotion) {
    state.flashAlpha = 0.8; // Trigger flash
  }

  // Update high score if needed
  const isNewRecord = state.score > state.highScore;
  if (isNewRecord) {
    state.highScore = state.score;
    saveHighScore();
  }

  // Show/hide new record indicator
  const newRecordEl = document.getElementById('new-record');
  if (isNewRecord) {
    newRecordEl.classList.remove('hidden');
  } else {
    newRecordEl.classList.add('hidden');
  }

  // Update game over screen
  finalScore.textContent = formatScore(state.score);
  finalHighscore.textContent = formatScore(state.highScore);

  // Update death reason
  if (reason === 'momentum') {
    deathReasonDisplay.textContent = 'MOMENTUM DEPLETED';
  } else {
    deathReasonDisplay.textContent = 'COLLISION DETECTED';
  }

  gameoverScreen.classList.remove('hidden');
  updateModeDisplay('ENDED');
  updateGameStateDisplay('FAIL');
  updateSysIndicators(false);
  document.getElementById('restart-btn').focus();
}

function restartGame() {
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  startGame();
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
  const deltaTime = timestamp - state.lastFrameTime;
  state.lastFrameTime = timestamp;

  // FPS tracking
  state.frameCount++;
  if (timestamp - state.lastFpsUpdate >= 1000) {
    state.currentFps = state.frameCount;
    state.frameCount = 0;
    state.lastFpsUpdate = timestamp;
    if (fpsDisplay) {
      fpsDisplay.textContent = state.currentFps;
    }
  }

  if (state.gameState === 'playing') {
    update(timestamp, deltaTime);
  }

  render(deltaTime);
  requestAnimationFrame(gameLoop);
}

function update(timestamp, deltaTime) {
  const gameTime = timestamp - state.gameStartTime;

  // Update score (time-based)
  state.score += CONFIG.SCORE_PER_SECOND * (deltaTime / 1000);

  // Decay momentum
  state.momentum -= state.currentMomentumDecay;
  if (state.momentum <= 0) {
    state.momentum = 0;
    endGame('momentum');
    return;
  }

  // Spawn chaos blocks
  if (gameTime - state.lastChaosSpawn > state.currentChaosInterval) {
    spawnChaos();
    state.lastChaosSpawn = gameTime;
  }

  // Spawn trainers
  if (gameTime - state.lastTrainerSpawn > CONFIG.TRAINER_SPAWN_INTERVAL) {
    spawnTrainer();
    state.lastTrainerSpawn = gameTime;
  }

  // Increase difficulty
  if (gameTime - state.lastDifficultyIncrease > CONFIG.DIFFICULTY_INCREASE_INTERVAL) {
    increaseDifficulty();
    state.lastDifficultyIncrease = gameTime;
  }

  // Update chaos blocks
  updateChaosBlocks();

  // Update trainers
  updateTrainers();

  // Check collisions
  checkCollisions();

  // Update particles and popups
  updateParticles();
  updateScorePopups();

  // Update HUD
  updateHUD();
}

// ===== SPAWNING =====
function spawnChaos() {
  // Pick a random lane
  const lane = Math.floor(Math.random() * CONFIG.LANE_COUNT);

  state.chaosBlocks.push({
    lane: lane,
    y: -CONFIG.CHAOS_SIZE,
    speed: state.currentChaosSpeed
  });
}

function spawnTrainer() {
  // Pick a random lane (try to avoid recent chaos)
  let lane = Math.floor(Math.random() * CONFIG.LANE_COUNT);

  // Check if a chaos block is in this lane near top
  const chaosInLane = state.chaosBlocks.some(
    c => c.lane === lane && c.y < CONFIG.CANVAS_HEIGHT / 3
  );

  if (chaosInLane && Math.random() > 0.5) {
    // Try another lane
    lane = (lane + 1) % CONFIG.LANE_COUNT;
  }

  state.trainers.push({
    lane: lane,
    y: -CONFIG.TRAINER_SIZE,
    speed: CONFIG.TRAINER_SPEED * state.speedMultiplier
  });
}

// ===== ENTITY UPDATES =====
function updateChaosBlocks() {
  for (let i = state.chaosBlocks.length - 1; i >= 0; i--) {
    const chaos = state.chaosBlocks[i];
    chaos.y += chaos.speed;

    // Remove if off screen
    if (chaos.y > CONFIG.CANVAS_HEIGHT) {
      state.chaosBlocks.splice(i, 1);
    }
  }
}

function updateTrainers() {
  for (let i = state.trainers.length - 1; i >= 0; i--) {
    const trainer = state.trainers[i];
    trainer.y += trainer.speed;

    // Remove if off screen
    if (trainer.y > CONFIG.CANVAS_HEIGHT) {
      state.trainers.splice(i, 1);
    }
  }
}

// ===== COLLISION DETECTION =====
function checkCollisions() {
  const playerX = getPlayerX();
  const playerRect = {
    x: playerX,
    y: state.playerY,
    w: CONFIG.PLAYER_SIZE,
    h: CONFIG.PLAYER_SIZE
  };

  // Check chaos collisions
  for (const chaos of state.chaosBlocks) {
    const chaosX = getLaneX(chaos.lane) + (CONFIG.LANE_WIDTH - CONFIG.CHAOS_SIZE) / 2;
    const chaosRect = {
      x: chaosX,
      y: chaos.y,
      w: CONFIG.CHAOS_SIZE,
      h: CONFIG.CHAOS_SIZE
    };

    if (rectsIntersect(playerRect, chaosRect)) {
      endGame();
      return;
    }
  }

  // Check trainer collisions
  for (let i = state.trainers.length - 1; i >= 0; i--) {
    const trainer = state.trainers[i];
    const trainerX = getLaneX(trainer.lane) + (CONFIG.LANE_WIDTH - CONFIG.TRAINER_SIZE) / 2;
    const trainerRect = {
      x: trainerX,
      y: trainer.y,
      w: CONFIG.TRAINER_SIZE,
      h: CONFIG.TRAINER_SIZE
    };

    if (rectsIntersect(playerRect, trainerRect)) {
      // Collect trainer
      state.score += CONFIG.TRAINER_SCORE_BONUS;
      state.momentum = Math.min(CONFIG.MOMENTUM_MAX, state.momentum + CONFIG.TRAINER_MOMENTUM_BONUS);
      state.momentumWarned = false; // Reset warning

      // Play collect sound
      if (typeof Audio !== 'undefined') Audio.collect();

      // Spawn particles and score popup
      const cx = trainerX + CONFIG.TRAINER_SIZE / 2;
      const cy = trainer.y + CONFIG.TRAINER_SIZE / 2;
      spawnParticles(cx, cy);
      spawnScorePopup(cx, cy - 10, '+' + CONFIG.TRAINER_SCORE_BONUS);

      state.trainers.splice(i, 1);
    }
  }
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// ===== PARTICLES =====
function spawnParticles(x, y) {
  // Don't spawn particles if reduced motion
  if (state.reducedMotion) return;

  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    state.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      life: 20,
      maxLife: 20
    });
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `rgba(255, 176, 0, ${alpha})`;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
}

// ===== SCORE POPUPS =====
function spawnScorePopup(x, y, text) {
  state.scorePopups.push({
    x: x,
    y: y,
    text: text,
    life: 30,
    maxLife: 30
  });
}

function updateScorePopups() {
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    const popup = state.scorePopups[i];
    popup.y -= 1;
    popup.life--;

    if (popup.life <= 0) {
      state.scorePopups.splice(i, 1);
    }
  }
}

function drawScorePopups() {
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  for (const popup of state.scorePopups) {
    const alpha = popup.life / popup.maxLife;
    ctx.fillStyle = `rgba(255, 204, 68, ${alpha})`;
    ctx.fillText(popup.text, popup.x, popup.y);
  }

  ctx.textAlign = 'left';
}

// ===== DIFFICULTY =====
function increaseDifficulty() {
  // Increase wave number
  state.waveNumber++;

  // Increase chaos speed
  state.currentChaosSpeed = Math.min(
    CONFIG.CHAOS_MAX_SPEED,
    state.currentChaosSpeed * CONFIG.DIFFICULTY_MULTIPLIER
  );

  // Decrease spawn interval
  state.currentChaosInterval = Math.max(
    CONFIG.CHAOS_MIN_INTERVAL,
    state.currentChaosInterval / CONFIG.DIFFICULTY_MULTIPLIER
  );

  // Increase momentum decay
  state.currentMomentumDecay = Math.min(
    CONFIG.MOMENTUM_MIN_DECAY,
    state.currentMomentumDecay * CONFIG.DIFFICULTY_MULTIPLIER
  );

  // Update speed multiplier for display
  state.speedMultiplier *= CONFIG.DIFFICULTY_MULTIPLIER;
}

// ===== RENDERING =====
function render(deltaTime = 16) {
  // Update screen shake
  updateScreenShake(deltaTime);

  // Apply screen shake offset
  ctx.save();
  if (state.shakeIntensity > 0) {
    const shakeX = (Math.random() - 0.5) * state.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * state.shakeIntensity;
    ctx.translate(shakeX, shakeY);
  }

  // Clear canvas
  ctx.fillStyle = COLORS.BG;
  ctx.fillRect(-10, -10, CONFIG.CANVAS_WIDTH + 20, CONFIG.CANVAS_HEIGHT + 20);

  // Draw lane dividers
  drawLanes();

  // Draw entities
  drawTrainers(deltaTime);
  drawChaosBlocks();
  drawPlayer(deltaTime);
  drawParticles();
  drawScorePopups();

  // Draw flash effect
  if (state.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 100, 0, ${state.flashAlpha})`;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    state.flashAlpha -= 0.05; // Fade out
    if (state.flashAlpha < 0) state.flashAlpha = 0;
  }

  // Restore canvas state (after shake)
  ctx.restore();
}

function drawLanes() {
  // Lane backgrounds (subtle)
  ctx.fillStyle = '#080808';
  ctx.fillRect(CONFIG.LANE_WIDTH, 0, CONFIG.LANE_WIDTH, CONFIG.CANVAS_HEIGHT);

  ctx.strokeStyle = COLORS.LANE_LINE;
  ctx.lineWidth = 1;

  // Vertical lane dividers
  for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
    const x = i * CONFIG.LANE_WIDTH;
    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Player zone indicator
  ctx.strokeStyle = COLORS.ORANGE_DIM;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(4, state.playerY - 8, CONFIG.CANVAS_WIDTH - 8, CONFIG.PLAYER_SIZE + 16);
  ctx.setLineDash([]);

  // Top and bottom edge markers
  ctx.fillStyle = COLORS.ORANGE_DIM;
  for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
    const lx = i * CONFIG.LANE_WIDTH + CONFIG.LANE_WIDTH / 2 - 2;
    ctx.fillRect(lx, 2, 4, 4);
    ctx.fillRect(lx, CONFIG.CANVAS_HEIGHT - 6, 4, 4);
  }
}

function drawPlayer(deltaTime) {
  const x = getPlayerX();
  const y = state.playerY;
  const size = CONFIG.PLAYER_SIZE;

  // Determine animation: run while playing, idle otherwise
  let animation = 'idle';
  if (state.gameState === 'playing') {
    animation = 'run';
  }

  // Use sprites if loaded
  if (typeof Sprites !== 'undefined' && Sprites.loaded) {
    Sprites.drawNisha(ctx, x, y, size, size, animation, deltaTime);
  } else {
    // Fallback: simple rectangle
    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.strokeStyle = COLORS.PLAYER_OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  }
}

function drawChaosBlocks() {
  for (const chaos of state.chaosBlocks) {
    const size = CONFIG.CHAOS_SIZE;
    const x = getLaneX(chaos.lane) + (CONFIG.LANE_WIDTH - size) / 2;
    const y = chaos.y;

    if (typeof Sprites !== 'undefined' && Sprites.loaded) {
      Sprites.drawChaos(ctx, x, y, size);
    } else {
      ctx.fillStyle = COLORS.CHAOS_FILL;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = COLORS.CHAOS_OUTLINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
    }
  }
}

function drawTrainers(deltaTime) {
  for (const trainer of state.trainers) {
    const size = CONFIG.TRAINER_SIZE;
    const x = getLaneX(trainer.lane) + (CONFIG.LANE_WIDTH - size) / 2;
    const y = trainer.y;

    if (typeof Sprites !== 'undefined' && Sprites.loaded) {
      Sprites.drawTrainer(ctx, x, y, size, deltaTime);
    } else {
      const cx = x + size / 2;
      const cy = y + size / 2;
      ctx.fillStyle = COLORS.TRAINER;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + size, cy);
      ctx.lineTo(cx, y + size);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ===== UTILITY FUNCTIONS =====
function getLaneX(lane) {
  return lane * CONFIG.LANE_WIDTH;
}

function getPlayerX() {
  return getLaneX(state.playerLane) + (CONFIG.LANE_WIDTH - CONFIG.PLAYER_SIZE) / 2;
}

function formatScore(score) {
  return Math.floor(score).toString().padStart(5, '0');
}

// ===== HUD UPDATES =====
function updateHUD() {
  scoreDisplay.textContent = formatScore(state.score);
  highscoreDisplay.textContent = formatScore(state.highScore);

  const momentumPercent = Math.max(0, Math.min(100, state.momentum));
  momentumFill.style.width = momentumPercent + '%';
  momentumValue.textContent = Math.floor(momentumPercent) + '%';

  // Color momentum bar based on level
  if (momentumPercent < 25) {
    momentumFill.style.background = '#FF3300';
    // Warning sound when low
    if (!state.momentumWarned && typeof Audio !== 'undefined') {
      Audio.momentumLow();
      state.momentumWarned = true;
    }
  } else if (momentumPercent < 50) {
    momentumFill.style.background = COLORS.ORANGE_BRIGHT;
  } else {
    momentumFill.style.background = COLORS.ORANGE_GLOW;
  }

  speedDisplay.textContent = state.speedMultiplier.toFixed(1) + 'x';

  // Lane display (L/C/R)
  const laneNames = ['L', 'C', 'R'];
  laneDisplay.textContent = laneNames[state.playerLane];

  // Wave display
  waveDisplay.textContent = state.waveNumber.toString().padStart(2, '0');

  // Update mini-grid radar
  if (typeof UIElements !== 'undefined' && UIElements.updateMiniGrid) {
    UIElements.updateMiniGrid(state.playerLane, state.chaosBlocks, state.trainers);
  }
}

function updateHighScoreDisplay() {
  highscoreDisplay.textContent = formatScore(state.highScore);
}

function updateModeDisplay(mode) {
  modeDisplay.textContent = mode;
}

function updateGameStateDisplay(newState) {
  gameStateDisplay.textContent = newState;
}

function updateSysIndicators(running) {
  if (running) {
    sysRun.classList.add('active');
  } else {
    sysRun.classList.remove('active');
  }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
