/**
 * NISHA GO! - Simplified Game Engine
 */

// ===== CONFIG =====
const CONFIG = {
  CANVAS_WIDTH: 144,
  CANVAS_HEIGHT: 256,
  LANE_COUNT: 3,
  LANE_WIDTH: 48,
  PLAYER_SIZE: 32,
  PLAYER_START_LANE: 1,
  CHAOS_SIZE: 24,
  CHAOS_SPAWN_INTERVAL: 1800,
  CHAOS_MIN_INTERVAL: 600,
  CHAOS_SPEED: 1.2,
  CHAOS_MAX_SPEED: 4,
  TRAINER_SIZE: 20,
  TRAINER_SPAWN_INTERVAL: 3000,
  TRAINER_SPEED: 1,
  TRAINER_SCORE_BONUS: 100,
  TRAINER_MOMENTUM_BONUS: 20,
  MOMENTUM_MAX: 100,
  MOMENTUM_DECAY: 0.02,
  MOMENTUM_MIN_DECAY: 0.05,
  SCORE_PER_SECOND: 10,
  DIFFICULTY_INCREASE_INTERVAL: 8000,
  DIFFICULTY_MULTIPLIER: 1.08
};

const COLORS = {
  BG: '#050505',
  ORANGE: '#FF8A00',
  ORANGE_GLOW: '#FFB000',
  ORANGE_DIM: '#663700',
  LANE_LINE: '#1a1a1a',
  MOMENTUM_LOW: '#FF3300'
};

// ===== STATE =====
const state = {
  gameState: 'start',
  playerLane: CONFIG.PLAYER_START_LANE,
  playerY: 0,
  chaosBlocks: [],
  trainers: [],
  particles: [],
  scorePopups: [],
  score: 0,
  highScore: 0,
  momentum: CONFIG.MOMENTUM_MAX,
  lastFrameTime: 0,
  lastChaosSpawn: 0,
  lastTrainerSpawn: 0,
  lastDifficultyIncrease: 0,
  gameStartTime: 0,
  currentChaosInterval: CONFIG.CHAOS_SPAWN_INTERVAL,
  currentChaosSpeed: CONFIG.CHAOS_SPEED,
  currentMomentumDecay: CONFIG.MOMENTUM_DECAY,
  speedMultiplier: 1.0,
  waveNumber: 1,
  reducedMotion: false,
  shakeIntensity: 0,
  shakeDuration: 0,
  flashAlpha: 0,
  touchStartX: 0,
  touchStartY: 0,
  momentumWarned: false
};

// ===== DOM =====
let canvas, ctx;
let startScreen, pauseScreen, gameoverScreen;
let finalScore, finalHighscore, deathReasonDisplay;
let isMobile = false;

// Desktop HUD elements
let scoreDisplay, highscoreDisplay, momentumFill, momentumValue;
let gameStateDisplay, waveDisplay, modeDisplay;

// ===== INIT =====
function init() {
  state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect mobile
  isMobile = window.matchMedia('(max-width: 600px), (hover: none) and (pointer: coarse)').matches;

  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  startScreen = document.getElementById('start-screen');
  pauseScreen = document.getElementById('pause-screen');
  gameoverScreen = document.getElementById('gameover-screen');
  finalScore = document.getElementById('final-score');
  finalHighscore = document.getElementById('final-highscore');
  deathReasonDisplay = document.getElementById('death-reason');

  // Desktop HUD elements
  scoreDisplay = document.getElementById('score-display');
  highscoreDisplay = document.getElementById('highscore-display');
  momentumFill = document.getElementById('momentum-fill');
  momentumValue = document.getElementById('momentum-value');
  gameStateDisplay = document.getElementById('game-state');
  waveDisplay = document.getElementById('wave-display');
  modeDisplay = document.getElementById('mode-display');

  setupCanvas();
  loadHighScore();
  setupInput();
  setupButtons();

  // Initialize desktop HUD with high score
  updateDesktopHUD();

  requestAnimationFrame(gameLoop);
}

function setupCanvas() {
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  ctx.imageSmoothingEnabled = false;
  state.playerY = CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_SIZE - 24;
}

function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper) return;

  const maxWidth = wrapper.clientWidth - 20;
  const maxHeight = wrapper.clientHeight - 20;

  const scaleX = maxWidth / CONFIG.CANVAS_WIDTH;
  const scaleY = maxHeight / CONFIG.CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const finalScale = scale >= 2 ? Math.floor(scale) : scale;

  canvas.style.width = Math.floor(CONFIG.CANVAS_WIDTH * finalScale) + 'px';
  canvas.style.height = Math.floor(CONFIG.CANVAS_HEIGHT * finalScale) + 'px';
}

function loadHighScore() {
  const saved = localStorage.getItem('nisha-go-highscore');
  if (saved) state.highScore = parseInt(saved, 10);
}

function saveHighScore() {
  localStorage.setItem('nisha-go-highscore', state.highScore.toString());
}

// ===== INPUT =====
function setupInput() {
  document.addEventListener('keydown', handleKeyDown);

  const container = document.getElementById('game-container');
  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });

  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');

  if (btnLeft) {
    btnLeft.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.gameState === 'playing') movePlayer(-1);
    }, { passive: false });
  }

  if (btnRight) {
    btnRight.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.gameState === 'playing') movePlayer(1);
    }, { passive: false });
  }
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();

  if (key === 'escape') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (key === 'r' && (state.gameState === 'gameover' || state.gameState === 'paused')) {
    e.preventDefault();
    restartGame();
    return;
  }

  if (state.gameState === 'playing') {
    if (key === 'a' || key === 'arrowleft') {
      e.preventDefault();
      movePlayer(-1);
    } else if (key === 'd' || key === 'arrowright') {
      e.preventDefault();
      movePlayer(1);
    }
  }

  if (state.gameState === 'start' && (key === ' ' || key === 'enter')) {
    e.preventDefault();
    startGame();
  }
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
  if (!e.changedTouches[0]) return;

  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - state.touchStartX;
  const deltaY = touch.clientY - state.touchStartY;
  const minSwipe = 30;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
    if (state.gameState === 'playing') {
      movePlayer(deltaX > 0 ? 1 : -1);
    }
  } else if (Math.abs(deltaY) < minSwipe && Math.abs(deltaX) < minSwipe) {
    if (state.gameState === 'start') startGame();
    else if (state.gameState === 'gameover') restartGame();
    else if (state.gameState === 'paused') togglePause();
  }
}

function movePlayer(direction) {
  const newLane = state.playerLane + direction;
  if (newLane >= 0 && newLane < CONFIG.LANE_COUNT) {
    state.playerLane = newLane;
    if (typeof Audio !== 'undefined') Audio.move();
  }
}

// ===== BUTTONS =====
function setupButtons() {
  const startBtn = document.getElementById('start-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');

  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startGame();
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      togglePause();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      restartGame();
    });
  }
}

// ===== GAME STATE =====
function startGame() {
  state.gameState = 'playing';
  state.momentumWarned = false;
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

  if (typeof Audio !== 'undefined') Audio.start();

  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');

  updateDesktopHUD();
}

function togglePause() {
  if (state.gameState === 'playing') {
    state.gameState = 'paused';
    pauseScreen.classList.remove('hidden');
    document.getElementById('resume-btn').focus();
  } else if (state.gameState === 'paused') {
    state.gameState = 'playing';
    pauseScreen.classList.add('hidden');
  }
  updateDesktopHUD();
}

function endGame(reason = 'collision') {
  state.gameState = 'gameover';

  if (typeof Audio !== 'undefined') {
    Audio.hit();
    setTimeout(() => Audio.gameOver(), 200);
  }
  triggerScreenShake(8, 300);
  if (!state.reducedMotion) state.flashAlpha = 0.8;

  const isNewRecord = state.score > state.highScore;
  if (isNewRecord) {
    state.highScore = state.score;
    saveHighScore();
  }

  finalScore.textContent = formatScore(state.score);
  finalHighscore.textContent = formatScore(state.highScore);
  deathReasonDisplay.textContent = reason === 'momentum' ? 'NO MOMENTUM' : 'COLLISION';

  const newRecordEl = document.getElementById('new-record');
  newRecordEl.classList.toggle('hidden', !isNewRecord);

  gameoverScreen.classList.remove('hidden');
  document.getElementById('restart-btn').focus();

  updateDesktopHUD();
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

  if (state.gameState === 'playing') {
    update(timestamp, deltaTime);
  }

  render(deltaTime);
  requestAnimationFrame(gameLoop);
}

function update(timestamp, deltaTime) {
  const gameTime = timestamp - state.gameStartTime;

  state.score += CONFIG.SCORE_PER_SECOND * (deltaTime / 1000);

  state.momentum -= state.currentMomentumDecay;
  if (state.momentum <= 0) {
    state.momentum = 0;
    endGame('momentum');
    return;
  }

  if (state.momentum < 25 && !state.momentumWarned) {
    if (typeof Audio !== 'undefined') Audio.momentumLow();
    state.momentumWarned = true;
  }

  if (gameTime - state.lastChaosSpawn > state.currentChaosInterval) {
    spawnChaos();
    state.lastChaosSpawn = gameTime;
  }

  if (gameTime - state.lastTrainerSpawn > CONFIG.TRAINER_SPAWN_INTERVAL) {
    spawnTrainer();
    state.lastTrainerSpawn = gameTime;
  }

  if (gameTime - state.lastDifficultyIncrease > CONFIG.DIFFICULTY_INCREASE_INTERVAL) {
    increaseDifficulty();
    state.lastDifficultyIncrease = gameTime;
  }

  updateChaosBlocks();
  updateTrainers();
  checkCollisions();
  updateParticles();
  updateScorePopups();

  // Update desktop HUD
  updateDesktopHUD();
}

// ===== SPAWNING =====
function spawnChaos() {
  state.chaosBlocks.push({
    lane: Math.floor(Math.random() * CONFIG.LANE_COUNT),
    y: -CONFIG.CHAOS_SIZE,
    speed: state.currentChaosSpeed
  });
}

function spawnTrainer() {
  let lane = Math.floor(Math.random() * CONFIG.LANE_COUNT);
  const chaosInLane = state.chaosBlocks.some(c => c.lane === lane && c.y < CONFIG.CANVAS_HEIGHT / 3);
  if (chaosInLane && Math.random() > 0.5) lane = (lane + 1) % CONFIG.LANE_COUNT;

  state.trainers.push({
    lane: lane,
    y: -CONFIG.TRAINER_SIZE,
    speed: CONFIG.TRAINER_SPEED * state.speedMultiplier
  });
}

// ===== UPDATES =====
function updateChaosBlocks() {
  for (let i = state.chaosBlocks.length - 1; i >= 0; i--) {
    state.chaosBlocks[i].y += state.chaosBlocks[i].speed;
    if (state.chaosBlocks[i].y > CONFIG.CANVAS_HEIGHT) {
      state.chaosBlocks.splice(i, 1);
    }
  }
}

function updateTrainers() {
  for (let i = state.trainers.length - 1; i >= 0; i--) {
    state.trainers[i].y += state.trainers[i].speed;
    if (state.trainers[i].y > CONFIG.CANVAS_HEIGHT) {
      state.trainers.splice(i, 1);
    }
  }
}

function checkCollisions() {
  const playerX = getPlayerX();
  const playerRect = { x: playerX, y: state.playerY, w: CONFIG.PLAYER_SIZE, h: CONFIG.PLAYER_SIZE };

  for (const chaos of state.chaosBlocks) {
    const chaosX = getLaneX(chaos.lane) + (CONFIG.LANE_WIDTH - CONFIG.CHAOS_SIZE) / 2;
    if (rectsIntersect(playerRect, { x: chaosX, y: chaos.y, w: CONFIG.CHAOS_SIZE, h: CONFIG.CHAOS_SIZE })) {
      endGame('collision');
      return;
    }
  }

  for (let i = state.trainers.length - 1; i >= 0; i--) {
    const trainer = state.trainers[i];
    const trainerX = getLaneX(trainer.lane) + (CONFIG.LANE_WIDTH - CONFIG.TRAINER_SIZE) / 2;
    if (rectsIntersect(playerRect, { x: trainerX, y: trainer.y, w: CONFIG.TRAINER_SIZE, h: CONFIG.TRAINER_SIZE })) {
      state.score += CONFIG.TRAINER_SCORE_BONUS;
      state.momentum = Math.min(CONFIG.MOMENTUM_MAX, state.momentum + CONFIG.TRAINER_MOMENTUM_BONUS);
      state.momentumWarned = false;

      if (typeof Audio !== 'undefined') Audio.collect();

      spawnParticles(trainerX + CONFIG.TRAINER_SIZE / 2, trainer.y + CONFIG.TRAINER_SIZE / 2);
      spawnScorePopup(trainerX + CONFIG.TRAINER_SIZE / 2, trainer.y, '+' + CONFIG.TRAINER_SCORE_BONUS);

      state.trainers.splice(i, 1);
    }
  }
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== PARTICLES =====
function spawnParticles(x, y) {
  if (state.reducedMotion) return;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    state.particles.push({ x, y, vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, life: 20, maxLife: 20 });
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (--p.life <= 0) state.particles.splice(i, 1);
  }
}

// ===== SCORE POPUPS =====
function spawnScorePopup(x, y, text) {
  state.scorePopups.push({ x, y, text, life: 30, maxLife: 30 });
}

function updateScorePopups() {
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    state.scorePopups[i].y -= 1;
    if (--state.scorePopups[i].life <= 0) state.scorePopups.splice(i, 1);
  }
}

// ===== DIFFICULTY =====
function increaseDifficulty() {
  state.waveNumber++;
  state.currentChaosSpeed = Math.min(CONFIG.CHAOS_MAX_SPEED, state.currentChaosSpeed * CONFIG.DIFFICULTY_MULTIPLIER);
  state.currentChaosInterval = Math.max(CONFIG.CHAOS_MIN_INTERVAL, state.currentChaosInterval / CONFIG.DIFFICULTY_MULTIPLIER);
  state.currentMomentumDecay = Math.min(CONFIG.MOMENTUM_MIN_DECAY, state.currentMomentumDecay * CONFIG.DIFFICULTY_MULTIPLIER);
  state.speedMultiplier *= CONFIG.DIFFICULTY_MULTIPLIER;
}

// ===== SCREEN EFFECTS =====
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

// ===== RENDER =====
function render(deltaTime = 16) {
  updateScreenShake(deltaTime);

  ctx.save();
  if (state.shakeIntensity > 0) {
    ctx.translate((Math.random() - 0.5) * state.shakeIntensity, (Math.random() - 0.5) * state.shakeIntensity);
  }

  // Background
  ctx.fillStyle = COLORS.BG;
  ctx.fillRect(-10, -10, CONFIG.CANVAS_WIDTH + 20, CONFIG.CANVAS_HEIGHT + 20);

  // Lanes
  drawLanes();

  // Entities
  drawTrainers(deltaTime);
  drawChaosBlocks();
  drawPlayer(deltaTime);
  drawParticles();
  drawScorePopups();

  // HUD on canvas
  drawHUD();

  // Flash
  if (state.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 100, 0, ${state.flashAlpha})`;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    state.flashAlpha -= 0.05;
  }

  ctx.restore();
}

function drawLanes() {
  ctx.fillStyle = '#080808';
  ctx.fillRect(CONFIG.LANE_WIDTH, 0, CONFIG.LANE_WIDTH, CONFIG.CANVAS_HEIGHT);

  ctx.strokeStyle = COLORS.LANE_LINE;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CONFIG.LANE_WIDTH, 0);
    ctx.lineTo(i * CONFIG.LANE_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawPlayer(deltaTime) {
  const x = getPlayerX();
  const y = state.playerY;
  const size = CONFIG.PLAYER_SIZE;

  let animation = state.gameState === 'playing' ? 'run' : 'idle';

  if (typeof Sprites !== 'undefined' && Sprites.loaded) {
    Sprites.drawNisha(ctx, x, y, size, size, animation, deltaTime);
  } else {
    ctx.fillStyle = COLORS.ORANGE;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  }
}

function drawChaosBlocks() {
  for (const chaos of state.chaosBlocks) {
    const size = CONFIG.CHAOS_SIZE;
    const x = getLaneX(chaos.lane) + (CONFIG.LANE_WIDTH - size) / 2;

    if (typeof Sprites !== 'undefined' && Sprites.loaded) {
      Sprites.drawChaos(ctx, x, chaos.y, size);
    } else {
      ctx.fillStyle = COLORS.ORANGE_DIM;
      ctx.fillRect(x, chaos.y, size, size);
    }
  }
}

function drawTrainers(deltaTime) {
  for (const trainer of state.trainers) {
    const size = CONFIG.TRAINER_SIZE;
    const x = getLaneX(trainer.lane) + (CONFIG.LANE_WIDTH - size) / 2;

    if (typeof Sprites !== 'undefined' && Sprites.loaded) {
      Sprites.drawTrainer(ctx, x, trainer.y, size);
    } else {
      ctx.fillStyle = COLORS.ORANGE_GLOW;
      ctx.fillRect(x, trainer.y, size, size);
    }
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = `rgba(255, 176, 0, ${p.life / p.maxLife})`;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
}

function drawScorePopups() {
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  for (const popup of state.scorePopups) {
    ctx.fillStyle = `rgba(255, 204, 68, ${popup.life / popup.maxLife})`;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.textAlign = 'left';
}

function drawHUD() {
  // Only draw canvas HUD on mobile (desktop has HTML HUD panels)
  if (!isMobile) return;

  // Score (top right)
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ORANGE_GLOW;
  ctx.fillText(formatScore(state.score), CONFIG.CANVAS_WIDTH - 6, 14);

  // Momentum bar (top left)
  const barWidth = 50;
  const barHeight = 6;
  const barX = 6;
  const barY = 6;
  const momentumPercent = state.momentum / CONFIG.MOMENTUM_MAX;

  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = momentumPercent < 0.25 ? COLORS.MOMENTUM_LOW : COLORS.ORANGE;
  ctx.fillRect(barX, barY, barWidth * momentumPercent, barHeight);

  ctx.strokeStyle = COLORS.ORANGE_DIM;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.textAlign = 'left';
}

// ===== DESKTOP HUD =====
function updateDesktopHUD() {
  if (isMobile) return;

  if (scoreDisplay) scoreDisplay.textContent = formatScore(state.score);
  if (highscoreDisplay) highscoreDisplay.textContent = formatScore(state.highScore);

  if (momentumFill) {
    const percent = (state.momentum / CONFIG.MOMENTUM_MAX) * 100;
    momentumFill.style.width = percent + '%';
    momentumFill.style.background = percent < 25 ? COLORS.MOMENTUM_LOW : COLORS.ORANGE;
  }

  if (momentumValue) {
    momentumValue.textContent = Math.floor(state.momentum) + '%';
  }

  if (gameStateDisplay) {
    const stateText = state.gameState === 'playing' ? 'ACTIVE' :
                      state.gameState === 'paused' ? 'PAUSED' :
                      state.gameState === 'gameover' ? 'ENDED' : 'IDLE';
    gameStateDisplay.textContent = stateText;
  }

  if (waveDisplay) {
    waveDisplay.textContent = state.waveNumber.toString().padStart(2, '0');
  }

  if (modeDisplay) {
    modeDisplay.textContent = state.gameState === 'playing' ? 'RUNNING' : 'STANDBY';
  }
}

// ===== UTILS =====
function getLaneX(lane) {
  return lane * CONFIG.LANE_WIDTH;
}

function getPlayerX() {
  return getLaneX(state.playerLane) + (CONFIG.LANE_WIDTH - CONFIG.PLAYER_SIZE) / 2;
}

function formatScore(score) {
  return Math.floor(score).toString().padStart(5, '0');
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
