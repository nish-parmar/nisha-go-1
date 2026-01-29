/**
 * NISHA GO! - UI Elements Generator
 * Creates decorative UI elements for the terminal HUD
 */

const UIElements = {
  // Generate decorative corner brackets for panels
  initCornerDecorations() {
    const panels = document.querySelectorAll('.panel-box');
    panels.forEach(panel => {
      panel.classList.add('decorated');
    });
  },

  // Add blinking cursor to active elements
  initCursors() {
    const activeValues = document.querySelectorAll('#game-state, #mode-display');
    activeValues.forEach(el => {
      el.classList.add('has-cursor');
    });
  },

  // Initialize mini-grid with animated cells
  initMiniGrid() {
    const grid = document.getElementById('mini-grid');
    if (!grid) return;

    // Clear existing
    grid.innerHTML = '';

    // Create 12 cells (3x4)
    for (let i = 0; i < 12; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.index = i;
      grid.appendChild(cell);
    }
  },

  // Update mini-grid to show player position
  updateMiniGrid(playerLane, chaosBlocks, trainers) {
    const cells = document.querySelectorAll('.grid-cell');
    if (cells.length === 0) return;

    // Reset all cells
    cells.forEach(cell => {
      cell.className = 'grid-cell';
    });

    // Show player in bottom row
    const playerCell = 9 + playerLane; // Bottom row: indices 9, 10, 11
    if (cells[playerCell]) {
      cells[playerCell].classList.add('player');
    }

    // Show chaos in approximate positions (map Y to rows 0-2)
    chaosBlocks.forEach(chaos => {
      const row = Math.floor(chaos.y / 107); // 320/3 ≈ 107
      if (row >= 0 && row < 3) {
        const cellIndex = row * 3 + chaos.lane;
        if (cells[cellIndex]) {
          cells[cellIndex].classList.add('chaos');
        }
      }
    });

    // Show trainers
    trainers.forEach(trainer => {
      const row = Math.floor(trainer.y / 107);
      if (row >= 0 && row < 3) {
        const cellIndex = row * 3 + trainer.lane;
        if (cells[cellIndex] && !cells[cellIndex].classList.contains('chaos')) {
          cells[cellIndex].classList.add('trainer');
        }
      }
    });
  },

  init() {
    this.initCornerDecorations();
    this.initCursors();
    this.initMiniGrid();
    console.log('UI Elements initialized');
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UIElements.init());
} else {
  UIElements.init();
}
