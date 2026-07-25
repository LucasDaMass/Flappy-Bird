const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");

const GRAVITY = 0.38;
const FLAP_STRENGTH = -6.8;
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const GROUND_HEIGHT = 80;
const BIRD_RADIUS = 18;

let gameState = "ready";
let bird;
let pipes;
let score;
let animationFrameId;

function resetGame() {
  bird = {
    x: 120,
    y: canvas.height / 2,
    velocity: 0,
    radius: BIRD_RADIUS,
  };
  pipes = [];
  score = 0;
  scoreEl.textContent = "0";
  addPipe();
}

function startGame() {
  resetGame();
  gameState = "playing";
  overlay.classList.remove("active");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  loop();
}

function endGame() {
  gameState = "over";
  overlayTitle.textContent = "Game Over";
  overlayText.textContent = `You scored ${score}. Press restart to try again.`;
  startButton.textContent = "Play Again";
  overlay.classList.add("active");
}

function addPipe() {
  const minHeight = 80;
  const maxHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - minHeight;
  const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
  pipes.push({
    x: canvas.width + 20,
    topHeight,
    bottomY: topHeight + PIPE_GAP,
    width: PIPE_WIDTH,
    passed: false,
  });
}

function flap() {
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

  bird.velocity += GRAVITY;
  bird.y += bird.velocity;

  if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= canvas.height - GROUND_HEIGHT) {
    endGame();
    return;
  }

  for (let i = pipes.length - 1; i >= 0; i -= 1) {
    const pipe = pipes[i];
    pipe.x -= 3;

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = score;
    }

    const birdBox = {
      left: bird.x - bird.radius,
      right: bird.x + bird.radius,
      top: bird.y - bird.radius,
      bottom: bird.y + bird.radius,
    };

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
      endGame();
      return;
    }

    if (pipe.x + pipe.width < -20) {
      pipes.splice(i, 1);
    }
  }

  if (pipes[pipes.length - 1].x < canvas.width - 220) {
    addPipe();
  }
}

function drawBackground() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#6ec5ff");
  skyGradient.addColorStop(1, "#d8f4ff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(360, 110, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(90, 100, 22, 0, Math.PI * 2);
  ctx.arc(118, 85, 30, 0, Math.PI * 2);
  ctx.arc(150, 100, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#7ed957";
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  ctx.fillStyle = "#4b7c2e";
  for (let i = 0; i < canvas.width; i += 24) {
    ctx.fillRect(i, canvas.height - GROUND_HEIGHT + 10, 12, 6);
  }
}

function drawPipes() {
  pipes.forEach((pipe) => {
    ctx.fillStyle = "#2ec76b";
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
    ctx.fillRect(pipe.x - 8, pipe.topHeight - 16, pipe.width + 16, 16);

    ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - GROUND_HEIGHT - pipe.bottomY);
    ctx.fillRect(pipe.x - 8, pipe.bottomY, pipe.width + 16, 16);
  });
}

function drawBird() {
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
  drawBackground();
  drawPipes();
  drawBird();
  drawGround();
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
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

resetGame();
draw();
overlayTitle.textContent = "Ready to fly?";
overlayText.textContent = "Press Space, click, or tap to flap.";
startButton.textContent = "Start Game";
overlay.classList.add("active");
