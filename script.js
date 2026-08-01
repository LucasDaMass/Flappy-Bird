const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const coinsEl = document.getElementById("coins");
const shopCoinsEl = document.getElementById("shopCoins");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
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
const unlockedSkins = new Set(["green"]);
const unlockedPowerups = new Set();
const unlockedBackgrounds = new Set(["sky"]);

const birdSprite = new Image();
birdSprite.src = "Flappy Bird.png";
birdSprite.onload = () => prepareBirdSprites();
let birdSpriteCanvases = {};
let birdSpriteReady = false;
let currentSkin = "green";
let currentPowerup = null;
let currentBackground = "sky";
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
  updateHud();
  addPipe();
}

function startGame() {
  resetGame();
  gameState = "playing";
  overlayTitle.textContent = "Flappy Bird";
  overlayText.textContent = "Press play to start your run.";
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

  pipes.push({
    x: canvas.width + 20,
    topHeight,
    bottomY: topHeight + PIPE_GAP,
    width: PIPE_WIDTH,
    color: pipeColor,
    passed: false,
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
  if (overlay.classList.contains("active") && gameState !== "playing") {
    return;
  }

  if (gameState === "ready") {
    startGame();
    return;
  }

  if (gameState === "playing") {
    bird.velocity = FLAP_STRENGTH;
  } else if (gameState === "over") {
    startGame();
  }
}

function update() {
  if (gameState !== "playing") return;

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

  for (let i = pipes.length - 1; i >= 0; i -= 1) {
    const pipe = pipes[i];
    pipe.x -= movementSpeed;

    if (pipe.coin) {
      pipe.coin.x = pipe.x + pipe.width / 2;
    }

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score += 1;
      if (score > highScore) {
        highScore = score;
        saveHighScore();
      }
      updateHud();
    }

    const birdBox = {
      left: bird.x - bird.radius,
      right: bird.x + bird.radius,
      top: bird.y - bird.radius,
      bottom: bird.y + bird.radius,
    };

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
        saveCoins();
        updateHud();
      }
    }

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

  if (pipes[pipes.length - 1].x < canvas.width - 220) {
    addPipe();
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
  drawBackground(theme);
  drawPipes();
  drawCoins();
  drawBird();
  drawGround(theme);
}

function loop() {
  update();
  draw();
  if (gameState === "playing") {
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
overlayTitle.textContent = "Shop";
overlayText.textContent = "Collect coins, unlock skins, and press Play.";
startButton.textContent = "Play";
overlay.classList.add("active");
