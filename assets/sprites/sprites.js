/**
 * NISHA GO! - Sprite Loader
 * Loads individual sprite frames for animation
 */

const Sprites = {
  // Loaded images
  images: {},

  // Loading state
  loaded: false,
  loadCount: 0,
  totalSprites: 0,

  // Sprite definitions
  SPRITE_LIST: [
    'nisha_idle_01',
    'nisha_idle_02',
    'nisha_run_01',
    'nisha_run_02',
    'chaos',
    'trainer'
  ],

  // Animation definitions
  ANIMATIONS: {
    nisha_idle: ['nisha_idle_01', 'nisha_idle_02'],
    nisha_run: ['nisha_run_01', 'nisha_run_02']
  },

  // Animation state
  animState: {
    nisha: { frame: 0, timer: 0, delay: 250 }
  },

  init() {
    this.totalSprites = this.SPRITE_LIST.length;

    for (const name of this.SPRITE_LIST) {
      this.loadImage(name);
    }
  },

  loadImage(name) {
    const img = new Image();
    img.onload = () => {
      this.images[name] = img;
      this.loadCount++;
      console.log(`Loaded: ${name} (${this.loadCount}/${this.totalSprites})`);

      if (this.loadCount >= this.totalSprites) {
        this.loaded = true;
        console.log('All sprites loaded!');
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load: ${name}`);
      this.loadCount++;
      if (this.loadCount >= this.totalSprites) {
        this.loaded = true;
      }
    };
    img.src = `assets/sprites/${name}.png`;
  },

  // Get current frame for an animation
  getFrame(animName, deltaTime = 16) {
    const anim = this.ANIMATIONS[animName];
    if (!anim || anim.length === 0) return null;

    // Get or create animation state
    const stateKey = animName.split('_')[0]; // 'nisha' from 'nisha_idle'
    let state = this.animState[stateKey];
    if (!state) {
      state = { frame: 0, timer: 0, delay: 200 };
      this.animState[stateKey] = state;
    }

    // Update timer
    state.timer += deltaTime;
    if (state.timer >= state.delay) {
      state.timer = 0;
      state.frame = (state.frame + 1) % anim.length;
    }

    const frameName = anim[state.frame];
    return this.images[frameName] || null;
  },

  // Draw Nisha with animation
  drawNisha(ctx, x, y, width, height, animation = 'idle', deltaTime = 16) {
    const animKey = `nisha_${animation}`;
    const frame = this.getFrame(animKey, deltaTime);

    if (frame) {
      ctx.drawImage(frame, x, y, width, height);
    } else {
      // Fallback
      ctx.fillStyle = '#FF8A00';
      ctx.fillRect(x, y, width, height);
    }
  },

  // Draw chaos block
  drawChaos(ctx, x, y, size) {
    const img = this.images['chaos'];
    if (img) {
      ctx.drawImage(img, x, y, size, size);
    } else {
      ctx.fillStyle = '#663300';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#FF5500';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
    }
  },

  // Draw trainer (static)
  drawTrainer(ctx, x, y, size) {
    const img = this.images['trainer'];
    if (img) {
      ctx.drawImage(img, x, y, size, size);
    } else {
      ctx.fillStyle = '#FFAA00';
      const cx = x + size / 2;
      const cy = y + size / 2;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + size, cy);
      ctx.lineTo(cx, y + size);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Sprites.init());
} else {
  Sprites.init();
}
