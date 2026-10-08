// ==========================================
// CHAMPIONS CUP - 2D FOOTBALL ENGINE
// ==========================================

const TEAMS_CONFIG = {
  real: { name: "Real Madrid", emblem: "👑", color: "#f8fafc", secondary: "#fbbf24", numberColor: "#0f172a" },
  barca: { name: "Barcelona", emblem: "🔵🔴", color: "#1e3a8a", secondary: "#dc2626", numberColor: "#facc15" },
  city: { name: "Man City", emblem: "🦅", color: "#38bdf8", secondary: "#ffffff", numberColor: "#0f172a" },
  arsenal: { name: "Arsenal", emblem: "🔴", color: "#dc2626", secondary: "#ffffff", numberColor: "#ffffff" },
  uzbekistan: { name: "O'zbekiston", emblem: "🇺🇿", color: "#0284c7", secondary: "#ffffff", numberColor: "#ffffff" },
  nasaf: { name: "Nasaf", emblem: "🐉", color: "#b91c1c", secondary: "#ffffff", numberColor: "#ffffff" },
  pakhtakor: { name: "Paxtakor", emblem: "🦁", color: "#eab308", secondary: "#1d4ed8", numberColor: "#1d4ed8" },
  inter: { name: "Inter Milan", emblem: "🐍", color: "#1e40af", secondary: "#000000", numberColor: "#ffffff" }
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playKick() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playPostHit() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  playWhistle() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
      osc.frequency.setValueAtTime(2600, this.ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(2400, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playGoalCheer() {
    if (!this.enabled) return;
    try {
      this.init();
      // Roar simulation via noise buffer
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.8));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }
}

const sounds = new SoundManager();

// ==========================================
// GAME STATE & OBJECTS
// ==========================================

const canvas = document.getElementById('footballCanvas');
const ctx = canvas.getContext('2d');

const PITCH = {
  x: 60,
  y: 40,
  width: 1080,
  height: 640,
  goalWidth: 35,
  goalHeight: 160,
  goalTop: 280,
  goalBottom: 440
};

let gameState = {
  running: false,
  paused: false,
  matchTime: 0, // in seconds
  totalDuration: 300,
  half: 1,
  homeScore: 0,
  awayScore: 0,
  homeShots: 0,
  awayShots: 0,
  homePossessionTime: 0,
  awayPossessionTime: 0,
  homeConfig: TEAMS_CONFIG.real,
  awayConfig: TEAMS_CONFIG.city,
  difficulty: 'medium',
  showRadar: true,
  cameraShake: 0
};

// Controls tracking
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  space: false,
  shift: false,
  j: false, x: false,
  e: false, c: false
};

let shotPower = 0;
let isChargingShot = false;

// Ball definition
const ball = {
  x: 600,
  y: 360,
  vx: 0,
  vy: 0,
  radius: 8,
  z: 0, // height above ground
  vz: 0,
  friction: 0.98,
  gravity: 0.45,
  owner: null,
  lastOwnerTeam: 'home'
};

// Players definitions
let players = [];
let userControlledPlayer = null;

class Player {
  constructor(team, role, defaultX, defaultY, number, name) {
    this.team = team; // 'home' or 'away'
    this.role = role; // 'GK', 'DEF', 'MID_UP', 'MID_DOWN', 'FWD'
    this.x = defaultX;
    this.y = defaultY;
    this.homeX = defaultX;
    this.homeY = defaultY;
    this.vx = 0;
    this.vy = 0;
    this.radius = 16;
    this.speed = 1.4;
    this.sprintSpeed = 2.1;
    this.stamina = 100;
    this.number = number;
    this.name = name;
    this.facingAngle = team === 'home' ? 0 : Math.PI;
    this.tackleCooldown = 0;
    this.kickAnim = 0;
  }

  reset() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0;
    this.vy = 0;
    this.stamina = 100;
  }
}

// Particle system for celebration / turf kicks
let particles = [];
function addParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 40 + Math.random() * 30,
      color: color || '#00ff87',
      size: 3 + Math.random() * 4
    });
  }
}

// Initialize Players for 5v5
function initPlayers() {
  players = [
    // HOME TEAM (Attacking Right, Defending Left)
    new Player('home', 'GK', 100, 360, 1, 'Courtois (Darvozabon)'),
    new Player('home', 'DEF', 320, 360, 4, 'Alaba (Himoyachi)'),
    new Player('home', 'MID_UP', 480, 220, 8, 'Valverde (Yarim himoya)'),
    new Player('home', 'MID_DOWN', 480, 500, 5, 'Bellingham (Yarim himoya)'),
    new Player('home', 'FWD', 580, 360, 9, 'Mbappé (Hujumchi)'),

    // AWAY TEAM (Attacking Left, Defending Right)
    new Player('away', 'GK', 1100, 360, 31, 'Ederson (Darvozabon)'),
    new Player('away', 'DEF', 880, 360, 3, 'Dias (Himoyachi)'),
    new Player('away', 'MID_UP', 720, 220, 17, 'De Bruyne (Yarim himoya)'),
    new Player('away', 'MID_DOWN', 720, 500, 20, 'Bernardo (Yarim himoya)'),
    new Player('away', 'FWD', 620, 360, 9, 'Haaland (Hujumchi)')
  ];

  userControlledPlayer = players.find(p => p.team === 'home' && p.role === 'FWD');
  updateHud();
}

// ==========================================
// GAME LOOP & PHYSICS
// ==========================================

function updateGame() {
  if (!gameState.running || gameState.paused) return;

  // Update Match Timer
  gameState.matchTime += 1 / 60;
  updateTimerDisplay();

  // Halftime / Fulltime check
  if (gameState.matchTime >= gameState.totalDuration) {
    endMatch();
    return;
  }

  // Possession stats tracking
  if (ball.owner) {
    if (ball.owner.team === 'home') gameState.homePossessionTime++;
    else gameState.awayPossessionTime++;
  }

  // Camera Shake Decay
  if (gameState.cameraShake > 0) gameState.cameraShake -= 0.5;

  // Handle User Input for Controlled Player
  handleUserPlayerInput();

  // Handle AI for Teammates & Opponents
  updateAI();

  // Update Players Physics
  players.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.82;
    p.vy *= 0.82;

    // Pitch bounds constraint
    const minX = p.role === 'GK' ? (p.team === 'home' ? PITCH.x + 10 : PITCH.x + PITCH.width - 150) : PITCH.x + 15;
    const maxX = p.role === 'GK' ? (p.team === 'home' ? PITCH.x + 150 : PITCH.x + PITCH.width - 10) : PITCH.x + PITCH.width - 15;

    p.x = Math.max(minX, Math.min(maxX, p.x));
    p.y = Math.max(PITCH.y + 15, Math.min(PITCH.y + PITCH.height - 15, p.y));

    // Stamina recovery
    if (p.stamina < 100) p.stamina += 0.15;
    if (p.kickAnim > 0) p.kickAnim--;
  });

  // Update Ball Physics
  updateBallPhysics();

  // Particle updates
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  // Check Goal scoring
  checkGoal();
}

// User Controlled Player Logic
function handleUserPlayerInput() {
  if (!userControlledPlayer) return;

  const p = userControlledPlayer;
  let moveX = 0;
  let moveY = 0;

  if (keys.w || keys.ArrowUp) moveY -= 1;
  if (keys.s || keys.ArrowDown) moveY += 1;
  if (keys.a || keys.ArrowLeft) moveX -= 1;
  if (keys.d || keys.ArrowRight) moveX += 1;

  // Normalize diagonal
  if (moveX !== 0 && moveY !== 0) {
    moveX *= 0.7071;
    moveY *= 0.7071;
  }

  const isSprinting = keys.shift && p.stamina > 10;
  const currentSpeed = isSprinting ? p.sprintSpeed : p.speed;

  if (isSprinting && (moveX !== 0 || moveY !== 0)) {
    p.stamina = Math.max(0, p.stamina - 0.4);
  }

  p.vx += moveX * currentSpeed * 0.3;
  p.vy += moveY * currentSpeed * 0.3;

  if (moveX !== 0 || moveY !== 0) {
    p.facingAngle = Math.atan2(moveY, moveX);
  }

  // Handle Shot Charging
  if (keys.space) {
    if (ball.owner === p) {
      isChargingShot = true;
      shotPower = Math.min(100, shotPower + 2.5);
      document.getElementById('powerMeterBar').style.width = `${shotPower}%`;
    }
  } else if (isChargingShot) {
    // Release Shot
    executeShoot(p, shotPower);
    isChargingShot = false;
    shotPower = 0;
    document.getElementById('powerMeterBar').style.width = '0%';
  }

  // Handle Pass
  if (keys.j || keys.x) {
    if (ball.owner === p) {
      executePass(p);
      keys.j = false;
      keys.x = false;
    }
  }

  // Switch player manually
  if (keys.e || keys.c) {
    switchActivePlayer();
    keys.e = false;
    keys.c = false;
  }

  // Update Stamina Bar HUD
  document.getElementById('staminaBar').style.width = `${p.stamina}%`;
}

// Switch active player to the teammate closest to the ball
function switchActivePlayer() {
  const homeFieldPlayers = players.filter(pl => pl.team === 'home' && pl.role !== 'GK');
  let best = homeFieldPlayers[0];
  let bestDist = 999999;

  homeFieldPlayers.forEach(pl => {
    if (pl !== userControlledPlayer) {
      const d = Math.hypot(pl.x - ball.x, pl.y - ball.y);
      if (d < bestDist) {
        bestDist = d;
        best = pl;
      }
    }
  });

  if (best) {
    userControlledPlayer = best;
    updateHud();
  }
}

function updateHud() {
  if (userControlledPlayer) {
    document.getElementById('hudPlayerName').textContent = `${userControlledPlayer.number}. ${userControlledPlayer.name}`;
  }
}

// Shooting mechanic
function executeShoot(player, powerPercent) {
  if (ball.owner !== player) return;
  sounds.playKick();
  addParticles(ball.x, ball.y, 10, '#ffffff');
  player.kickAnim = 12;

  // Aim towards opponent goal
  const targetX = player.team === 'home' ? PITCH.x + PITCH.width : PITCH.x;
  // slight random or aim deviation depending on player facing
  const targetY = 360 + (Math.sin(player.facingAngle) * 50);

  const angle = Math.atan2(targetY - player.y, targetX - player.x);
  const power = 10 + (powerPercent / 100) * 16;

  ball.owner = null;
  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
  ball.vz = 2.5 + (powerPercent / 100) * 4;

  if (player.team === 'home') gameState.homeShots++;
  else gameState.awayShots++;
}

// Passing mechanic
function executePass(player) {
  if (ball.owner !== player) return;
  sounds.playKick();
  player.kickAnim = 10;

  // Find best teammate in front of player
  const teammates = players.filter(pl => pl.team === player.team && pl !== player);
  let bestMate = null;
  let bestScore = -9999;

  teammates.forEach(tm => {
    const dx = tm.x - player.x;
    const dy = tm.y - player.y;
    const dist = Math.hypot(dx, dy);
    // Prefer forward passes
    const forwardBonus = player.team === 'home' ? dx * 0.8 : -dx * 0.8;
    const score = forwardBonus - dist * 0.4;
    if (score > bestScore) {
      bestScore = score;
      bestMate = tm;
    }
  });

  if (bestMate) {
    const angle = Math.atan2(bestMate.y - player.y, bestMate.x - player.x);
    const dist = Math.hypot(bestMate.x - player.x, bestMate.y - player.y);
    const speed = Math.min(18, Math.max(9, dist * 0.055));

    ball.owner = null;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.2;

    // Auto-switch to receiving teammate if user is passing
    if (player.team === 'home') {
      setTimeout(() => {
        userControlledPlayer = bestMate;
        updateHud();
      }, 150);
    }
  }
}

// ==========================================
// AI LOGIC FOR TEAMMATES & OPPONENTS
// ==========================================

function updateAI() {
  const diffMultiplier = gameState.difficulty === 'hard' ? 1.25 : gameState.difficulty === 'easy' ? 0.75 : 1.0;

  players.forEach(p => {
    if (p === userControlledPlayer) return; // Skip user-controlled player

    const isHome = p.team === 'home';
    const distToBall = Math.hypot(p.x - ball.x, p.y - ball.y);
    const ballInOurHalf = isHome ? ball.x < 600 : ball.x > 600;

    // GOALKEEPER AI
    if (p.role === 'GK') {
      const goalCenterX = isHome ? PITCH.x + 40 : PITCH.x + PITCH.width - 40;
      const targetY = Math.max(PITCH.goalTop + 25, Math.min(PITCH.goalBottom - 25, ball.y));
      p.vx += (goalCenterX - p.x) * 0.08;
      p.vy += (targetY - p.y) * 0.07 * diffMultiplier;

      // GK Save / Tackle if close
      if (distToBall < 30 && !ball.owner) {
        ball.owner = p;
        setTimeout(() => {
          if (ball.owner === p) executePass(p);
        }, 600);
      }
      return;
    }

    // If this AI player HAS THE BALL
    if (ball.owner === p) {
      const oppGoalX = isHome ? PITCH.x + PITCH.width : PITCH.x;
      const distToGoal = Math.abs(oppGoalX - p.x);

      // In shooting range?
      if (distToGoal < 300) {
        if (Math.random() < 0.04 * diffMultiplier) {
          executeShoot(p, 70 + Math.random() * 25);
          return;
        }
      }

      // Check if should pass
      if (Math.random() < 0.02 * diffMultiplier) {
        executePass(p);
        return;
      }

      // Otherwise dribble towards goal
      const targetY = 360 + Math.sin(gameState.matchTime * 2 + p.number) * 100;
      const angle = Math.atan2(targetY - p.y, oppGoalX - p.x);
      p.vx += Math.cos(angle) * (p.speed * 0.8);
      p.vy += Math.sin(angle) * (p.speed * 0.8);
      p.facingAngle = angle;
      return;
    }

    // If opponent has ball, press/defend
    const oppTeam = isHome ? 'away' : 'home';
    const isClosestToBall = getClosestTeammateToBall(p.team) === p;

    if (ball.owner && ball.owner.team === oppTeam) {
      if (isClosestToBall) {
        // Press the ball carrier
        const angle = Math.atan2(ball.y - p.y, ball.x - p.x);
        p.vx += Math.cos(angle) * p.speed * 0.85 * diffMultiplier;
        p.vy += Math.sin(angle) * p.speed * 0.85 * diffMultiplier;
        p.facingAngle = angle;
      } else {
        // Fall back to defensive structure
        const defTargetX = p.homeX + (ball.x - 600) * 0.4;
        const defTargetY = p.homeY + (ball.y - 360) * 0.3;
        p.vx += (defTargetX - p.x) * 0.04;
        p.vy += (defTargetY - p.y) * 0.04;
      }
      return;
    }

    // Loose ball: closest player chases
    if (!ball.owner && isClosestToBall) {
      const angle = Math.atan2(ball.y - p.y, ball.x - p.x);
      p.vx += Math.cos(angle) * p.speed * 0.9 * diffMultiplier;
      p.vy += Math.sin(angle) * p.speed * 0.9 * diffMultiplier;
      p.facingAngle = angle;
    } else {
      // Reposition dynamically based on ball
      const attackShift = (ball.x - 600) * 0.55;
      const targetX = p.homeX + attackShift;
      const targetY = p.homeY + (ball.y - 360) * 0.3;
      p.vx += (targetX - p.x) * 0.035;
      p.vy += (targetY - p.y) * 0.035;
    }
  });
}

function getClosestTeammateToBall(team) {
  const teamPlayers = players.filter(pl => pl.team === team && pl.role !== 'GK');
  let closest = teamPlayers[0];
  let minDist = 999999;
  teamPlayers.forEach(pl => {
    const d = Math.hypot(pl.x - ball.x, pl.y - ball.y);
    if (d < minDist) {
      minDist = d;
      closest = pl;
    }
  });
  return closest;
}

// ==========================================
// BALL PHYSICS
// ==========================================

function updateBallPhysics() {
  if (ball.owner) {
    // Ball follows player dribbling
    const p = ball.owner;
    const dribbleDist = 18;
    ball.x = p.x + Math.cos(p.facingAngle) * dribbleDist;
    ball.y = p.y + Math.sin(p.facingAngle) * dribbleDist;
    ball.vx = p.vx;
    ball.vy = p.vy;
    ball.z = 0;
    ball.lastOwnerTeam = p.team;

    // Check tackling by opponent
    players.forEach(opp => {
      if (opp.team !== p.team && opp.role !== 'GK') {
        const d = Math.hypot(opp.x - ball.x, opp.y - ball.y);
        if (d < opp.radius + ball.radius + 6) {
          // Tackle success chance
          if (Math.random() < 0.25) {
            ball.owner = opp;
            sounds.playKick();
            addParticles(ball.x, ball.y, 6, '#fbbf24');
          }
        }
      }
    });

    return;
  }

  // Free Ball Movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= ball.friction;
  ball.vy *= ball.friction;

  // Vertical trajectory (z-axis)
  if (ball.z > 0 || ball.vz > 0) {
    ball.z += ball.vz;
    ball.vz -= ball.gravity;
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = -ball.vz * 0.45; // Bounce
      if (Math.abs(ball.vz) < 0.5) ball.vz = 0;
    }
  }

  // Check ball pickup by players
  players.forEach(p => {
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < p.radius + ball.radius + 6 && ball.z < 12) {
      ball.owner = p;
      ball.lastOwnerTeam = p.team;

      // Auto switch user controlled player if home team gets ball
      if (p.team === 'home' && p !== userControlledPlayer && p.role !== 'GK') {
        userControlledPlayer = p;
        updateHud();
      }
    }
  });

  // Pitch Boundary Bounces (top & bottom)
  if (ball.y < PITCH.y + ball.radius) {
    ball.y = PITCH.y + ball.radius;
    ball.vy = -ball.vy * 0.7;
    sounds.playKick();
  }
  if (ball.y > PITCH.y + PITCH.height - ball.radius) {
    ball.y = PITCH.y + PITCH.height - ball.radius;
    ball.vy = -ball.vy * 0.7;
    sounds.playKick();
  }

  // Side boundaries (except goal openings)
  const isInsideGoalY = ball.y >= PITCH.goalTop && ball.y <= PITCH.goalBottom;

  if (!isInsideGoalY) {
    if (ball.x < PITCH.x + ball.radius) {
      ball.x = PITCH.x + ball.radius;
      ball.vx = -ball.vx * 0.7;
      sounds.playKick();
    }
    if (ball.x > PITCH.x + PITCH.width - ball.radius) {
      ball.x = PITCH.x + PITCH.width - ball.radius;
      ball.vx = -ball.vx * 0.7;
      sounds.playKick();
    }
  }

  // Goalposts Collision
  checkGoalPostCollision(PITCH.x, PITCH.goalTop);
  checkGoalPostCollision(PITCH.x, PITCH.goalBottom);
  checkGoalPostCollision(PITCH.x + PITCH.width, PITCH.goalTop);
  checkGoalPostCollision(PITCH.x + PITCH.width, PITCH.goalBottom);
}

function checkGoalPostCollision(postX, postY) {
  const d = Math.hypot(ball.x - postX, ball.y - postY);
  if (d < ball.radius + 7) {
    const angle = Math.atan2(ball.y - postY, ball.x - postX);
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = Math.cos(angle) * Math.max(speed, 6);
    ball.vy = Math.sin(angle) * Math.max(speed, 6);
    sounds.playPostHit();
    gameState.cameraShake = 6;
  }
}

// ==========================================
// GOAL DETECTION & KICKOFF
// ==========================================

let isGoalScored = false;

function checkGoal() {
  if (isGoalScored) return;

  const isInsideGoalY = ball.y > PITCH.goalTop + 5 && ball.y < PITCH.goalBottom - 5;

  // Away Goal (Left net)
  if (ball.x < PITCH.x - 10 && isInsideGoalY) {
    triggerGoal('away');
  }
  // Home Goal (Right net)
  else if (ball.x > PITCH.x + PITCH.width + 10 && isInsideGoalY) {
    triggerGoal('home');
  }
}

function triggerGoal(scoringTeam) {
  isGoalScored = true;
  gameState.cameraShake = 12;
  sounds.playGoalCheer();
  sounds.playWhistle();

  const isHome = scoringTeam === 'home';
  if (isHome) gameState.homeScore++;
  else gameState.awayScore++;

  document.getElementById('homeGoalsDisplay').textContent = gameState.homeScore;
  document.getElementById('awayGoalsDisplay').textContent = gameState.awayScore;

  // Show Goal Banner
  const banner = document.getElementById('goalBanner');
  const subtext = document.getElementById('goalSubtext');
  const teamScored = isHome ? gameState.homeConfig.name : gameState.awayConfig.name;
  subtext.textContent = `⚽ ${teamScored} gol kiritdi! 🔥`;
  banner.classList.add('show');

  addParticles(ball.x, ball.y, 60, isHome ? '#00ff87' : '#0ea5e9');

  setTimeout(() => {
    banner.classList.remove('show');
    resetKickoff(scoringTeam === 'home' ? 'away' : 'home');
    isGoalScored = false;
  }, 2200);
}

function resetKickoff(teamToKick) {
  ball.x = 600;
  ball.y = 360;
  ball.vx = 0;
  ball.vy = 0;
  ball.z = 0;
  ball.vz = 0;
  ball.owner = null;

  players.forEach(p => p.reset());

  // Give ball to kicking team's forward
  const kicker = players.find(p => p.team === teamToKick && p.role === 'FWD');
  if (kicker) {
    kicker.x = 600;
    kicker.y = 360;
    ball.owner = kicker;
    if (kicker.team === 'home') userControlledPlayer = kicker;
  }
  updateHud();
}

// ==========================================
// RENDER ENGINE (CANVAS 60 FPS)
// ==========================================

function draw() {
  ctx.save();

  // Apply Camera Shake if active
  if (gameState.cameraShake > 0) {
    const shakeX = (Math.random() - 0.5) * gameState.cameraShake;
    const shakeY = (Math.random() - 0.5) * gameState.cameraShake;
    ctx.translate(shakeX, shakeY);
  }

  // Clear Canvas
  ctx.fillStyle = '#10391b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Pitch Turf & Lines
  drawPitch();

  // Draw Particles
  particles.forEach(pt => {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Players
  players.forEach(p => drawPlayer(p));

  // Draw Ball
  drawBall();

  // Draw Mini Radar Map
  if (gameState.showRadar) {
    drawRadar();
  }

  ctx.restore();
  requestAnimationFrame(draw);
}

function drawPitch() {
  // Turf pattern stripes
  const stripeWidth = 60;
  for (let x = PITCH.x; x < PITCH.x + PITCH.width; x += stripeWidth * 2) {
    ctx.fillStyle = '#195a2b';
    ctx.fillRect(x, PITCH.y, stripeWidth, PITCH.height);
    ctx.fillStyle = '#165026';
    ctx.fillRect(x + stripeWidth, PITCH.y, stripeWidth, PITCH.height);
  }

  // Pitch white line markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;

  // Boundary box
  ctx.strokeRect(PITCH.x, PITCH.y, PITCH.width, PITCH.height);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(600, PITCH.y);
  ctx.lineTo(600, PITCH.y + PITCH.height);
  ctx.stroke();

  // Center Circle
  ctx.beginPath();
  ctx.arc(600, 360, 75, 0, Math.PI * 2);
  ctx.stroke();

  // Center Spot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(600, 360, 4, 0, Math.PI * 2);
  ctx.fill();

  // Left Penalty Box & Goal Box
  ctx.strokeRect(PITCH.x, 210, 160, 300);
  ctx.strokeRect(PITCH.x, 280, 60, 160);
  ctx.beginPath();
  ctx.arc(PITCH.x + 160, 360, 50, -Math.PI / 2.7, Math.PI / 2.7);
  ctx.stroke();

  // Right Penalty Box & Goal Box
  ctx.strokeRect(PITCH.x + PITCH.width - 160, 210, 160, 300);
  ctx.strokeRect(PITCH.x + PITCH.width - 60, 280, 60, 160);
  ctx.beginPath();
  ctx.arc(PITCH.x + PITCH.width - 160, 360, 50, Math.PI - Math.PI / 2.7, Math.PI + Math.PI / 2.7);
  ctx.stroke();

  // Left Goal Net
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(PITCH.x - 30, PITCH.goalTop, 30, PITCH.goalHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(PITCH.x - 30, PITCH.goalTop, 30, PITCH.goalHeight);

  // Right Goal Net
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(PITCH.x + PITCH.width, PITCH.goalTop, 30, PITCH.goalHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(PITCH.x + PITCH.width, PITCH.goalTop, 30, PITCH.goalHeight);
}

function drawPlayer(p) {
  const config = p.team === 'home' ? gameState.homeConfig : gameState.awayConfig;
  const isSelected = p === userControlledPlayer;

  // Selected player indicator ring & arrow
  if (isSelected) {
    ctx.strokeStyle = '#00ff87';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
    ctx.stroke();

    // Direction arrow above player
    ctx.fillStyle = '#00ff87';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 28);
    ctx.lineTo(p.x - 6, p.y - 36);
    ctx.lineTo(p.x + 6, p.y - 36);
    ctx.closePath();
    ctx.fill();
  }

  // Player Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, p.radius * 0.8, p.radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player Body (Jersey circle)
  ctx.fillStyle = p.role === 'GK' ? '#f59e0b' : config.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = config.secondary;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Facing Nose/Direction pip
  const dirX = p.x + Math.cos(p.facingAngle) * (p.radius - 2);
  const dirY = p.y + Math.sin(p.facingAngle) * (p.radius - 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dirX, dirY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Jersey Number
  ctx.fillStyle = p.role === 'GK' ? '#000000' : config.numberColor;
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.number, p.x, p.y);
}

function drawBall() {
  // Ball Shadow
  const shadowOffset = ball.z * 0.6 + 6;
  const shadowScale = Math.max(0.4, 1 - ball.z * 0.02);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + shadowOffset, ball.radius * shadowScale, ball.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball Sphere
  const renderY = ball.y - ball.z;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ball.x, renderY, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Ball Leather Pattern (Black pentagon spots)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(ball.x - 2, renderY - 2, ball.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawRadar() {
  const rw = 160;
  const rh = 96;
  const rx = canvas.width - rw - 20;
  const ry = 20;

  // Radar background
  ctx.fillStyle = 'rgba(7, 10, 15, 0.75)';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rx, ry, rw, rh);

  // Radar Center line
  ctx.beginPath();
  ctx.moveTo(rx + rw / 2, ry);
  ctx.lineTo(rx + rw / 2, ry + rh);
  ctx.stroke();

  // Scale factors
  const sx = rw / PITCH.width;
  const sy = rh / PITCH.height;

  // Draw Players on Radar
  players.forEach(p => {
    const px = rx + (p.x - PITCH.x) * sx;
    const py = ry + (p.y - PITCH.y) * sy;
    ctx.fillStyle = p.team === 'home' ? '#00ff87' : '#ff385c';
    ctx.beginPath();
    ctx.arc(px, py, p === userControlledPlayer ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Ball on Radar
  const bx = rx + (ball.x - PITCH.x) * sx;
  const by = ry + (ball.y - PITCH.y) * sy;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(bx, by, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ==========================================
// MATCH MANAGEMENT & UI EVENTS
// ==========================================

function updateTimerDisplay() {
  const mins = Math.floor(gameState.matchTime / 60);
  const secs = Math.floor(gameState.matchTime % 60);
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('gameTimerDisplay').textContent = formatted;

  // Check halftime transition
  if (gameState.matchTime >= gameState.totalDuration / 2 && gameState.half === 1) {
    gameState.half = 2;
    document.getElementById('matchHalfDisplay').textContent = "2-BO'LIM";
    sounds.playWhistle();
  }
}

function startMatch() {
  const homeSelect = document.getElementById('selectHomeTeam').value;
  const awaySelect = document.getElementById('selectAwayTeam').value;
  const durationSelect = parseInt(document.getElementById('selectDuration').value);
  const diffSelect = document.getElementById('selectDifficulty').value;

  gameState.homeConfig = TEAMS_CONFIG[homeSelect] || TEAMS_CONFIG.real;
  gameState.awayConfig = TEAMS_CONFIG[awaySelect] || TEAMS_CONFIG.city;
  gameState.totalDuration = durationSelect;
  gameState.difficulty = diffSelect;
  gameState.matchTime = 0;
  gameState.half = 1;
  gameState.homeScore = 0;
  gameState.awayScore = 0;
  gameState.homeShots = 0;
  gameState.awayShots = 0;
  gameState.homePossessionTime = 0;
  gameState.awayPossessionTime = 0;
  gameState.running = true;
  gameState.paused = false;

  // Update Scoreboard headers
  document.getElementById('homeTeamName').textContent = gameState.homeConfig.name;
  document.getElementById('homeEmblem').textContent = gameState.homeConfig.emblem;
  document.getElementById('awayTeamName').textContent = gameState.awayConfig.name;
  document.getElementById('awayEmblem').textContent = gameState.awayConfig.emblem;
  document.getElementById('homeGoalsDisplay').textContent = '0';
  document.getElementById('awayGoalsDisplay').textContent = '0';
  document.getElementById('matchHalfDisplay').textContent = "1-BO'LIM";

  // Hide Overlays
  document.getElementById('menuOverlay').style.display = 'none';
  document.getElementById('gameOverOverlay').style.display = 'none';

  initPlayers();
  resetKickoff('home');
  sounds.playWhistle();
}

function endMatch() {
  gameState.running = false;
  sounds.playWhistle();

  const totalTime = Math.max(1, gameState.homePossessionTime + gameState.awayPossessionTime);
  const homePoss = Math.round((gameState.homePossessionTime / totalTime) * 100);
  const awayPoss = 100 - homePoss;

  const resultTitle = document.getElementById('matchResultTitle');
  if (gameState.homeScore > gameState.awayScore) {
    resultTitle.textContent = "G'ALABA QOZONDINGIZ! 🏆🎉";
    resultTitle.style.color = '#00ff87';
  } else if (gameState.homeScore < gameState.awayScore) {
    resultTitle.textContent = "MAG'LUBIYAT! KEYINGI SAFAR OMAD! ⚽";
    resultTitle.style.color = '#ff385c';
  } else {
    resultTitle.textContent = "DURANG NATIJA! 🤝";
    resultTitle.style.color = '#fbbf24';
  }

  document.getElementById('finalScoreDisplay').textContent = `${gameState.homeScore} - ${gameState.awayScore}`;

  document.getElementById('endStatsBox').innerHTML = `
    <div style="display: flex; justify-content: space-between;">
      <span>${gameState.homeConfig.name}</span>
      <strong>KO'RSATKICHLAR</strong>
      <span>${gameState.awayConfig.name}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>${homePoss}%</span>
      <span style="color: #fff;">To'p nazorati</span>
      <span>${awayPoss}%</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>${gameState.homeShots}</span>
      <span style="color: #fff;">Zarbalar</span>
      <span>${gameState.awayShots}</span>
    </div>
  `;

  document.getElementById('gameOverOverlay').style.display = 'flex';
}

window.restartMatch = function() {
  startMatch();
};

window.openMainMenu = function() {
  gameState.running = false;
  document.getElementById('gameOverOverlay').style.display = 'none';
  document.getElementById('menuOverlay').style.display = 'flex';
};

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    keys.space = true;
  }
  if (e.key in keys) keys[e.key] = true;
  if (e.code in keys) keys[e.code] = true;

  // Toggle Pause on 'P'
  if (e.key === 'p' || e.key === 'P') {
    togglePause();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    keys.space = false;
  }
  if (e.key in keys) keys[e.key] = false;
  if (e.code in keys) keys[e.code] = false;
});

function togglePause() {
  if (!gameState.running) return;
  gameState.paused = !gameState.paused;
  const btn = document.getElementById('pauseMatchBtn');
  btn.textContent = gameState.paused ? '▶️ Davom ettirish' : '⏸️ To\'xtatish';
}

// UI Buttons Setup
document.getElementById('startGameBtn').addEventListener('click', startMatch);
document.getElementById('pauseMatchBtn').addEventListener('click', togglePause);

document.getElementById('soundToggleBtn').addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  document.getElementById('soundToggleBtn').textContent = sounds.enabled ? '🔊 Ovoz: Yoqilgan' : '🔇 Ovoz: O\'chirilgan';
});

document.getElementById('radarToggleBtn').addEventListener('click', () => {
  gameState.showRadar = !gameState.showRadar;
  document.getElementById('radarToggleBtn').textContent = gameState.showRadar ? '🗺️ Radar: Yoqilgan' : '🗺️ Radar: O\'chirilgan';
});

// Start physics loop & render loop
setInterval(updateGame, 1000 / 60);
requestAnimationFrame(draw);
