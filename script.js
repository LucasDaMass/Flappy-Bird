const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const coinsEl = document.getElementById("coins");
const shopCoinsEl = document.getElementById("shopCoins");
const missionLabel = document.getElementById("missionLabel");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const bossHealthLabel = document.getElementById("bossHealthLabel");
const skinMenuToggle = document.getElementById("skinMenuToggle");
const skinPanel = document.getElementById("skinPanel");

const GRAVITY = 0.38;
const FLAP_STRENGTH = -6.8;
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const GROUND_HEIGHT = 80;
const BIRD_RADIUS = 18;

const skinPalette = {
  green: { label: "Green", color: [70, 185, 95] },
  yellow: { label: "Yellow", color: [240, 210, 60] },
  red: { label: "Red", color: [220, 70, 70] },
  purple: { label: "Purple", color: [150, 90, 240] },
  rainbow: { label: "Rainbow", color: [255, 255, 255] },
  blue: { label: "Blue", color: [70, 120, 255] },
  ghost: { label: "Ghost", color: [220, 220, 255] },
  neon: { label: "Neon", color: [0, 255, 255] },
  sunset: { label: "Sunset", color: [255, 130, 80] },
  midnight: { label: "Midnight", color: [30, 30, 80] },
  coral: { label: "Coral", color: [255, 110, 120] },
  mint: { label: "Mint", color: [90, 220, 160] },
  aurora: { label: "Aurora", color: [120, 95, 255] },
  candy: { label: "Candy", color: [255, 90, 180] },
};
const skinCosts = { green: 0, yellow: 5, red: 8, purple: 12, rainbow: 20, blue: 15, ghost: 18, neon: 22, sunset: 16, midnight: 24, coral: 18, mint: 16, aurora: 20, candy: 18 };
const powerupCosts = { shield: 18, magnet: 15, slow: 12 };
const powerupLabels = { shield: "Shield", magnet: "Magnet", slow: "Slow Mo" };
const backgroundCosts = { sky: 0, "aurora-bg": 12, "midnight-bg": 18 };
const backgroundLabels = { sky: "Sky", "aurora-bg": "Aurora", "midnight-bg": "Midnight" };
const cosmeticCosts = { trail: 10, glow: 14 };
const cosmeticLabels = { trail: "Trail", glow: "Glow" };
const unlockedSkins = new Set(["green"]);
const unlockedPowerups = new Set();
const unlockedBackgrounds = new Set(["sky"]);
const unlockedCosmetics = new Set();

const birdSprite = new Image();
birdSprite.src = "Flappy Bird.png";
birdSprite.onload = () => prepareBirdSprites();
let birdSpriteCanvases = {};
let birdSpriteReady = false;
let currentSkin = "green";
let currentPowerup = null;
let currentBackground = "sky";
let currentCosmetic = null;
const storeButtons = Array.from(document.querySelectorAll(".store-button"));

let gameState = "ready";
let bird;
let pipes;
let score;
let highScore = 0;
let coins = 0;
let animationFrameId;
let shieldCharges = 0;
let slowTimer = 0;
let comboCount = 0;
let playerHealth = 5;
let bossActive = false;
let bossLevel = 0;
let bossTransitionState = "idle";
let bossTransitionProgress = 0;
let bossTransitionFrames = 70;
let cameraOffsetY = 0;
let bossHealth = 0;
let bossLaserWidth = 20;
let bossShootTimer = 0;
let bossLasers = [];
let bossShipY = 220;
let bossHitCooldown = 0;
let jumpCount = 0;
let missionGoal = 5;
let missionProgress = 0;
let missionType = "score";
let pipesSinceBoss = 0;
let activeEnemies = [];
let cosmeticParticles = [];

try {
  const savedCoins = Number(localStorage.getItem("flappyCoins") || 0);
  coins = Number.isFinite(savedCoins) ? savedCoins : 0;
  const savedHighScore = Number(localStorage.getItem("flappyHighScore") || 0);
  highScore = Number.isFinite(savedHighScore) ? savedHighScore : 0;
} catch (error) {
  coins = 0;
  highScore = 0;
}

function saveCoins() {
  try {
    localStorage.setItem("flappyCoins", String(coins));
  } catch (error) {
    // Ignore storage errors and keep the run in memory.
  }
}

function saveHighScore() {
  try {
    localStorage.setItem("flappyHighScore", String(highScore));
  } catch (error) {
    // Ignore storage errors and keep the run in memory.
  }
}

function updateHud() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  coinsEl.textContent = coins;
  shopCoinsEl.textContent = `Coins: ${coins}`;
  missionLabel.textContent = `Mission: ${missionType === "score" ? `${missionProgress}/${missionGoal} score` : `${missionProgress}/${missionGoal} coins`}`;
  bossHealthLabel.textContent = bossActive ? `HP: ${playerHealth} | Boss: ${bossHealth}` : `HP: ${playerHealth}`;

  storeButtons.forEach((button) => {
    if (button.dataset.skin) {
      const skinName = button.dataset.skin;
      const cost = skinCosts[skinName] || 0;
      const unlocked = unlockedSkins.has(skinName);
      const isCurrent = currentSkin === skinName;
      const label = skinPalette[skinName]?.label || skinName;

      button.innerHTML = `<span>${label}</span><span class="skin-cost">${unlocked ? "Owned" : `${cost} coins`}</span>`;
      button.classList.toggle("active", isCurrent);
      button.disabled = !unlocked && skinName !== "green" && coins < cost;
    } else if (button.dataset.powerup) {
      const powerupName = button.dataset.powerup;
      const cost = powerupCosts[powerupName] || 0;
      const unlocked = unlockedPowerups.has(powerupName);
      const isCurrent = currentPowerup === powerupName;
      const label = powerupLabels[powerupName] || powerupName;

      button.innerHTML = `<span>${label}</span><span class="skin-cost">${unlocked ? (isCurrent ? "Equipped" : "Owned") : `${cost} coins`}</span>`;
      button.classList.toggle("active", isCurrent);
      button.disabled = !unlocked && coins < cost;
    } else if (button.dataset.background) {
      const backgroundName = button.dataset.background;
      const cost = backgroundCosts[backgroundName] || 0;
      const unlocked = unlockedBackgrounds.has(backgroundName);
      const isCurrent = currentBackground === backgroundName;
      const label = backgroundLabels[backgroundName] || backgroundName;

      button.innerHTML = `<span>${label}</span><span class="skin-cost">${unlocked ? (isCurrent ? "Equipped" : "Owned") : `${cost} coins`}</span>`;
      button.classList.toggle("active", isCurrent);
      button.disabled = !unlocked && coins < cost;
    } else if (button.dataset.cosmetic) {
      const cosmeticName = button.dataset.cosmetic;
      const cost = cosmeticCosts[cosmeticName] || 0;
      const unlocked = unlockedCosmetics.has(cosmeticName);
      const isCurrent = currentCosmetic === cosmeticName;
      const label = cosmeticLabels[cosmeticName] || cosmeticName;

      button.innerHTML = `<span>${label}</span><span class="skin-cost">${unlocked ? (isCurrent ? "Equipped" : "Owned") : `${cost} coins`}</span>`;
      button.classList.toggle("active", isCurrent);
      button.disabled = !unlocked && coins < cost;
    }
  });
}

function setSkin(skinName) {
  if (!skinPalette[skinName]) return;

  if (skinName !== "green" && !unlockedSkins.has(skinName)) {
    const cost = skinCosts[skinName] || 0;
    if (coins < cost) return;

    coins -= cost;
    unlockedSkins.add(skinName);
    saveCoins();
  }

  currentSkin = skinName;
  updateHud();
}

function setPowerup(powerupName) {
  if (!powerupCosts[powerupName]) return;

  if (!unlockedPowerups.has(powerupName)) {
    const cost = powerupCosts[powerupName] || 0;
    if (coins < cost) return;

    coins -= cost;
    unlockedPowerups.add(powerupName);
    saveCoins();
  }

  currentPowerup = currentPowerup === powerupName ? null : powerupName;
  updateHud();
}

function setBackground(backgroundName) {
  if (!backgroundCosts[backgroundName]) return;

  if (!unlockedBackgrounds.has(backgroundName)) {
    const cost = backgroundCosts[backgroundName] || 0;
    if (coins < cost) return;

    coins -= cost;
    unlockedBackgrounds.add(backgroundName);
    saveCoins();
  }

  currentBackground = backgroundName;
  updateHud();
}

function setCosmetic(cosmeticName) {
  if (!cosmeticCosts[cosmeticName]) return;

  if (!unlockedCosmetics.has(cosmeticName)) {
    const cost = cosmeticCosts[cosmeticName] || 0;
    if (coins < cost) return;

    coins -= cost;
    unlockedCosmetics.add(cosmeticName);
    saveCoins();
  }

  currentCosmetic = currentCosmetic === cosmeticName ? null : cosmeticName;
  updateHud();
}

function resetGame() {
  bird = {
    x: 120,
    y: canvas.height / 2,
    velocity: 0,
    radius: BIRD_RADIUS,
  };
  pipes = [];
  score = 0;
  shieldCharges = 0;
  slowTimer = 0;
  comboCount = 0;
  playerHealth = 5;
  bossActive = false;
  bossLevel = 0;
  bossTransitionState = "idle";
  bossTransitionProgress = 0;
  cameraOffsetY = 0;
  bossHealth = 0;
  bossLaserWidth = 20;
  bossShootTimer = 0;
  bossLasers = [];
  bossShipY = 220;
  bossHitCooldown = 0;
  jumpCount = 0;
  missionGoal = 5 + Math.floor(score / 10) + Math.floor(highScore / 10);
  missionProgress = 0;
  missionType = Math.random() < 0.5 ? "score" : "coins";
  pipesSinceBoss = 0;
  activeEnemies = [];
  cosmeticParticles = [];
  updateHud();
  addPipe();
}

function startGame() {
  resetGame();
  gameState = "playing";
  overlayTitle.textContent = "Flappy Bird";
  overlayText.textContent = "";
  startButton.textContent = "Play";
  overlay.classList.remove("active");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  loop();
}

function endGame() {
  gameState = "over";
  overlayTitle.textContent = "Game Over";
  overlayText.textContent = `You scored ${score}. Press play to try again.`;
  startButton.textContent = "Play Again";
  overlay.classList.add("active");
}

function addPipe() {
  const minHeight = 80;
  const maxHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - minHeight;
  const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
  const pipeColors = ["#f2d64b", "#3fb34f", "#2f7dff"];
  const pipeColor = pipeColors[Math.floor(Math.random() * pipeColors.length)];
  const hasCoin = Math.random() < 0.45;
  const hasEnemy = !bossActive && Math.random() < 0.22;

  pipes.push({
    x: canvas.width + 20,
    topHeight,
    bottomY: topHeight + PIPE_GAP,
    width: PIPE_WIDTH,
    color: pipeColor,
    passed: false,
    enemy: hasEnemy
      ? {
          x: canvas.width + 20 + PIPE_WIDTH / 2,
          y: topHeight + 24,
          radius: 10,
          alive: true,
        }
      : null,
    coin: hasCoin
      ? {
          x: canvas.width + 20 + PIPE_WIDTH / 2,
          y: topHeight + PIPE_GAP / 2,
          radius: 12,
          collected: false,
        }
      : null,
  });
}

function flap() {
  if (gameState === "ready") {
    startGame();
    return;
  }

  if (gameState === "playing") {
    jumpCount += 1;
    if (bossActive && jumpCount % 5 === 0) {
      bossHealth = Math.max(0, bossHealth - 5);
      bossHitCooldown = 8;
      updateHud();
    }
    bird.velocity = FLAP_STRENGTH;
  } else if (gameState === "over") {
    startGame();
  }
}

function beginBossEncounter() {
  if (bossActive || bossTransitionState !== "idle") return;

  bossLevel += 1;
  bossTransitionState = "entering";
  bossTransitionProgress = 0;
  bossActive = false;
  bossHealth = 15 + bossLevel * 2;
  bossLaserWidth = 18 + bossLevel * 4;
  bossShootTimer = 0;
  bossLasers = [];
  bossShipY = 180 + (bossLevel % 3) * 60;
  bossHitCooldown = 0;
  pipes = [];
  pipesSinceBoss = 0;
  gameState = "transitioning";
  cameraOffsetY = 0;
  updateHud();
}

function update() {
  if (gameState !== "playing" && gameState !== "transitioning") return;

  if (gameState === "transitioning") {
    if (bossTransitionState === "entering") {
      bossTransitionProgress += 1;
      cameraOffsetY = -Math.round((bossTransitionProgress / bossTransitionFrames) * 140);
      if (bossTransitionProgress >= bossTransitionFrames) {
        bossTransitionProgress = 0;
        bossTransitionState = "fighting";
        bossActive = true;
        bossShootTimer = 0;
        gameState = "playing";
        updateHud();
      }
      return;
    }

    if (bossTransitionState === "exiting") {
      bossTransitionProgress += 1;
      cameraOffsetY = -Math.round((1 - bossTransitionProgress / bossTransitionFrames) * 140);
      if (bossTransitionProgress >= bossTransitionFrames) {
        bossTransitionProgress = 0;
        bossTransitionState = "idle";
        bossActive = false;
        bossLasers = [];
        cameraOffsetY = 0;
        gameState = "playing";
        updateHud();
      }
      return;
    }
  }

  if (slowTimer > 0) {
    slowTimer -= 1;
  }

  const movementSpeed = slowTimer > 0 ? 1.8 : 3;
  bird.velocity += GRAVITY;
  bird.y += bird.velocity;

  if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= canvas.height - GROUND_HEIGHT) {
    endGame();
    return;
  }

  if (bossHitCooldown > 0) {
    bossHitCooldown -= 1;
  }

  const birdBox = {
    left: bird.x - bird.radius,
    right: bird.x + bird.radius,
    top: bird.y - bird.radius,
    bottom: bird.y + bird.radius,
  };

  if (bossActive) {
    bossShootTimer -= 1;
    bossShipY = 180 + Math.sin((bossLevel + bossShootTimer) / 26) * (80 + bossLevel * 4);

    if (bossShootTimer <= 0) {
      bossShootTimer = Math.max(20, 42 - bossLevel * 3);
      const targetY = bird.y + Math.sin(bossLevel) * 12;
      const shotY = Math.max(80, Math.min(canvas.height - GROUND_HEIGHT - 50, targetY));
      bossLasers.push({
        x: canvas.width - 110,
        y: shotY,
        width: bossLaserWidth + 8,
        height: 12 + bossLevel,
        speed: 6 + bossLevel * 0.9,
        hit: false,
      });
    }

    bossLasers = bossLasers.filter((laser) => laser.x + laser.width > -20);
    bossLasers.forEach((laser) => {
      laser.x -= laser.speed;
    });
  }

  for (let i = pipes.length - 1; i >= 0; i -= 1) {
    const pipe = pipes[i];
    pipe.x -= movementSpeed;

    if (pipe.coin) {
      pipe.coin.x = pipe.x + pipe.width / 2;
    }

    if (pipe.enemy) {
      pipe.enemy.x = pipe.x + pipe.width / 2;
    }

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score += 1;
      comboCount += 1;
      if (comboCount >= 3) {
        score += 1;
        coins += 1;
        saveCoins();
        comboCount = 0;
      }
      missionProgress += 1;
      pipesSinceBoss += 1;
      if (pipesSinceBoss >= 10) {
        beginBossEncounter();
        return;
      }
      if (missionType === "score") {
        if (missionProgress >= missionGoal) {
          coins += 2;
          missionProgress = 0;
          missionGoal = 6 + Math.floor(score / 8);
          missionType = Math.random() < 0.5 ? "score" : "coins";
          updateHud();
        }
      }
      if (score > highScore) {
        highScore = score;
        saveHighScore();
      }
      updateHud();
    }

    if (pipe.enemy && pipe.enemy.alive) {
      const enemyBox = {
        left: pipe.enemy.x - pipe.enemy.radius,
        right: pipe.enemy.x + pipe.enemy.radius,
        top: pipe.enemy.y - pipe.enemy.radius,
        bottom: pipe.enemy.y + pipe.enemy.radius,
      };

      const enemyHit =
        birdBox.right > enemyBox.left &&
        birdBox.left < enemyBox.right &&
        birdBox.bottom > enemyBox.top &&
        birdBox.top < enemyBox.bottom;

      if (enemyHit) {
        pipe.enemy.alive = false;
        endGame();
        return;
      }
    }

    if (pipe.coin && !pipe.coin.collected) {
      const coinBox = {
        left: pipe.coin.x - pipe.coin.radius,
        right: pipe.coin.x + pipe.coin.radius,
        top: pipe.coin.y - pipe.coin.radius,
        bottom: pipe.coin.y + pipe.coin.radius,
      };

      const coinHit =
        birdBox.right > coinBox.left &&
        birdBox.left < coinBox.right &&
        birdBox.bottom > coinBox.top &&
        birdBox.top < coinBox.bottom;

      const magnetHit = currentPowerup === "magnet" && Math.hypot(bird.x - pipe.coin.x, bird.y - pipe.coin.y) < 140;

      if (coinHit || magnetHit) {
        pipe.coin.collected = true;
        coins += 1;
        missionProgress += 1;
        if (missionType === "coins" && missionProgress >= missionGoal) {
          coins += 2;
          missionProgress = 0;
          missionGoal = 6 + Math.floor(score / 8);
          missionType = Math.random() < 0.5 ? "score" : "coins";
          updateHud();
        }
        saveCoins();
        updateHud();
      }
    }

    bossLasers.forEach((laser) => {
      const laserBox = {
        left: laser.x,
        right: laser.x + laser.width,
        top: laser.y,
        bottom: laser.y + laser.height,
      };

      const laserHit =
        birdBox.right > laserBox.left &&
        birdBox.left < laserBox.right &&
        birdBox.bottom > laserBox.top &&
        birdBox.top < laserBox.bottom;

      if (laserHit && !laser.hit) {
        laser.hit = true;
        playerHealth -= 1;
        if (playerHealth <= 0) {
          endGame();
          return;
        }
        updateHud();
      }
    });

    bossLasers = bossLasers.filter((laser) => !laser.hit || laser.x + laser.width > -20);

    const pipeTopBox = {
      left: pipe.x,
      right: pipe.x + pipe.width,
      top: 0,
      bottom: pipe.topHeight,
    };
    const pipeBottomBox = {
      left: pipe.x,
      right: pipe.x + pipe.width,
      top: pipe.bottomY,
      bottom: canvas.height - GROUND_HEIGHT,
    };

    const collision =
      birdBox.right > pipeTopBox.left &&
      birdBox.left < pipeTopBox.right &&
      birdBox.bottom > pipeTopBox.top &&
      birdBox.top < pipeTopBox.bottom;

    const bottomCollision =
      birdBox.right > pipeBottomBox.left &&
      birdBox.left < pipeBottomBox.right &&
      birdBox.bottom > pipeBottomBox.top &&
      birdBox.top < pipeBottomBox.bottom;

    if (collision || bottomCollision) {
      if (currentPowerup === "shield" && shieldCharges === 0) {
        shieldCharges = 1;
        bird.velocity = -4;
        bird.y = Math.max(bird.radius + 8, bird.y - 48);
      } else if (currentPowerup === "shield" && shieldCharges > 0) {
        shieldCharges = 0;
        currentPowerup = null;
        bird.velocity = -4;
        bird.y = Math.max(bird.radius + 8, bird.y - 48);
      } else {
        endGame();
        return;
      }
    }

    if (pipe.x + pipe.width < -20) {
      pipes.splice(i, 1);
    }
  }

  if (!bossActive && (!pipes.length || pipes[pipes.length - 1].x < canvas.width - 220)) {
    addPipe();
  }

  if (bossActive) {
    if (bossHealth <= 0) {
      coins += 3;
      saveCoins();
      bossActive = false;
      bossHitCooldown = 0;
      jumpCount = 0;
      bossTransitionState = "exiting";
      bossTransitionProgress = 0;
      gameState = "transitioning";
      bossLasers = [];
      updateHud();
      return;
    }
  }
}

const backgroundThemes = {
  sky: { skyTop: "#6ec5ff", skyBottom: "#d8f4ff", sun: "#ffd166", cloud: "rgba(255,255,255,0.8)", ground: "#7ed957", groundAccent: "#4b7c2e" },
  "aurora-bg": { skyTop: "#7d7cff", skyBottom: "#f0d7ff", sun: "#ffcf6d", cloud: "rgba(255,255,255,0.75)", ground: "#49c2a7", groundAccent: "#26755c" },
  "midnight-bg": { skyTop: "#1f2041", skyBottom: "#4f5d75", sun: "#f4a261", cloud: "rgba(255,255,255,0.65)", ground: "#2f7f7f", groundAccent: "#1c4b4b" },
};

function getBackgroundTheme() {
  return backgroundThemes[currentBackground] || backgroundThemes.sky;
}

function drawBackground(theme) {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, theme.skyTop);
  skyGradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = theme.sun;
  ctx.beginPath();
  ctx.arc(360, 110, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.cloud;
  ctx.beginPath();
  ctx.arc(90, 100, 22, 0, Math.PI * 2);
  ctx.arc(118, 85, 30, 0, Math.PI * 2);
  ctx.arc(150, 100, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(theme) {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  ctx.fillStyle = theme.groundAccent;
  for (let i = 0; i < canvas.width; i += 24) {
    ctx.fillRect(i, canvas.height - GROUND_HEIGHT + 10, 12, 6);
  }
}

function drawPipes() {
  if (bossActive || bossTransitionState !== "idle") return;

  pipes.forEach((pipe) => {
    ctx.fillStyle = pipe.color;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
    ctx.fillRect(pipe.x - 8, pipe.topHeight - 16, pipe.width + 16, 16);

    ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - GROUND_HEIGHT - pipe.bottomY);
    ctx.fillRect(pipe.x - 8, pipe.bottomY, pipe.width + 16, 16);
  });
}

function drawCoins() {
  pipes.forEach((pipe) => {
    if (!pipe.coin || pipe.coin.collected) return;

    ctx.save();
    ctx.translate(pipe.coin.x, pipe.coin.y);
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 0, pipe.coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    ctx.arc(0, 0, pipe.coin.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawEnemies() {
  pipes.forEach((pipe) => {
    if (!pipe.enemy || !pipe.enemy.alive) return;

    ctx.save();
    ctx.translate(pipe.enemy.x, pipe.enemy.y);
    ctx.fillStyle = "#ff4d4d";
    ctx.beginPath();
    ctx.arc(0, 0, pipe.enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  });
}

function drawBossLasers() {
  if (!bossActive) return;

  bossLasers.forEach((laser) => {
    ctx.save();
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(laser.x + 4, laser.y + 2, laser.width - 8, laser.height - 4);
    ctx.restore();
  });
}

function drawBossShip() {
  if (!bossActive && bossTransitionState === "idle") return;

  const bossColor = bossLevel % 2 === 0 ? "#7dd3fc" : "#f472b6";
  const bossAccent = bossLevel % 3 === 0 ? "#facc15" : "#ffffff";
  const variant = bossLevel % 4;

  ctx.save();
  ctx.translate(canvas.width - 106, bossShipY);
  ctx.fillStyle = bossColor;

  if (variant === 0) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(60, 12);
    ctx.lineTo(54, 32);
    ctx.lineTo(20, 30);
    ctx.lineTo(0, 56);
    ctx.lineTo(-20, 30);
    ctx.lineTo(-56, 32);
    ctx.lineTo(-60, 12);
    ctx.closePath();
    ctx.fill();
  } else if (variant === 1) {
    ctx.fillRect(-36, -8, 72, 24);
    ctx.fillRect(-18, 16, 36, 28);
    ctx.fillRect(-44, 10, 16, 10);
    ctx.fillRect(28, 10, 16, 10);
  } else if (variant === 2) {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(54, 8);
    ctx.lineTo(44, 34);
    ctx.lineTo(12, 28);
    ctx.lineTo(0, 54);
    ctx.lineTo(-12, 28);
    ctx.lineTo(-44, 34);
    ctx.lineTo(-54, 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(54, 0);
    ctx.lineTo(66, 18);
    ctx.lineTo(28, 28);
    ctx.lineTo(0, 56);
    ctx.lineTo(-28, 28);
    ctx.lineTo(-66, 18);
    ctx.lineTo(-54, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = bossAccent;
  ctx.fillRect(-12, 12, 24, 16);
  ctx.fillRect(-34, 18, 16, 8);
  ctx.fillRect(20, 18, 16, 8);
  ctx.fillRect(-16, -10, 32, 10);
  ctx.restore();
}

function drawCosmetics() {
  if (currentCosmetic === "trail") {
    const trail = { x: bird.x - 16, y: bird.y };
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (currentCosmetic === "glow") {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue + 1 / 3;
  const g = hue;
  const b = hue - 1 / 3;
  const hueToChannel = (value) => {
    let temp = value;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  return [Math.round(hueToChannel(r) * 255), Math.round(hueToChannel(g) * 255), Math.round(hueToChannel(b) * 255)];
}

function isBirdBodyPixel(r, g, b, a) {
  if (a <= 0) return false;

  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  if (saturation < 0.12 || lightness < 0.28 || lightness > 0.9) return false;
  if (r < 90 || g < 90 || b > 200) return false;
  if (Math.abs(r - g) > 60) return false;
  if (r > 220 && g > 220 && b > 220) return false;

  return true;
}

function createSkinSprite(skinName) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = birdSprite.width;
  tempCanvas.height = birdSprite.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(birdSprite, 0, 0);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  for (let y = 0; y < tempCanvas.height; y += 1) {
    for (let x = 0; x < tempCanvas.width; x += 1) {
      const index = (y * tempCanvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a <= 0) continue;

      const isOrangeTrim = r > 180 && g > 80 && g < 180 && b < 140 && r >= g && r >= b;
      if (r > 220 && g > 220 && b > 220) {
        data[index + 3] = 0;
        continue;
      }

      if (isBirdBodyPixel(r, g, b, a)) {
        const tint = skinName === "rainbow"
          ? hslToRgb((x / tempCanvas.width) * 360 + (y / tempCanvas.height) * 80 + (x + y) * 0.6, 0.95, 0.58)
          : skinPalette[skinName].color;

        data[index] = tint[0];
        data[index + 1] = tint[1];
        data[index + 2] = tint[2];
      } else if (isOrangeTrim) {
        const tint = skinName === "rainbow"
          ? hslToRgb((x / tempCanvas.width) * 360 + (y / tempCanvas.height) * 80 + (x + y) * 0.6, 0.95, 0.58)
          : skinPalette[skinName].color;

        data[index] = tint[0];
        data[index + 1] = tint[1];
        data[index + 2] = tint[2];
      }
    }
  }

  tempCtx.putImageData(imageData, 0, 0);
  return tempCanvas;
}

function prepareBirdSprites() {
  if (birdSpriteReady || !birdSprite.complete || !birdSprite.naturalWidth) return;

  Object.keys(skinPalette).forEach((skinName) => {
    birdSpriteCanvases[skinName] = createSkinSprite(skinName);
  });

  birdSpriteReady = true;
}

function drawBird() {
  prepareBirdSprites();

  const activeBirdSprite = birdSpriteCanvases[currentSkin] || birdSpriteCanvases.green;

  if (birdSpriteReady && activeBirdSprite) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(Math.max(-0.6, Math.min(0.6, bird.velocity / 10)));
    ctx.drawImage(activeBirdSprite, -bird.radius - 8, -bird.radius - 8, bird.radius * 2 + 16, bird.radius * 2 + 16);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(Math.max(-0.6, Math.min(0.6, bird.velocity / 10)));

  ctx.fillStyle = "#ffcf33";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff8f1f";
  ctx.beginPath();
  ctx.arc(10, -5, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(5, -2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(8, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff4d4d";
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-2, 4);
  ctx.lineTo(-10, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  const theme = getBackgroundTheme();

  ctx.save();
  ctx.translate(0, cameraOffsetY);
  drawBackground(theme);
  drawPipes();
  drawCoins();
  drawEnemies();
  drawBossLasers();
  drawBossShip();
  drawBird();
  drawCosmetics();
  drawGround(theme);
  ctx.restore();
}

function loop() {
  update();
  draw();
  if (gameState === "playing" || gameState === "transitioning") {
    animationFrameId = requestAnimationFrame(loop);
  }
}

canvas.addEventListener("click", flap);
startButton.addEventListener("click", startGame);
skinMenuToggle.addEventListener("click", () => {
  skinPanel.classList.toggle("open");
});
storeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.skin) {
      setSkin(button.dataset.skin);
    } else if (button.dataset.powerup) {
      setPowerup(button.dataset.powerup);
    } else if (button.dataset.background) {
      setBackground(button.dataset.background);
    } else if (button.dataset.cosmetic) {
      setCosmetic(button.dataset.cosmetic);
    }
  });
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

resetGame();
draw();
updateHud();
overlayTitle.textContent = "Flappy Bird";
overlayText.textContent = "";
startButton.textContent = "Play";
overlay.classList.add("active");
