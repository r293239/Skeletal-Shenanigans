// SKELETAL SHENANIGANS GAME SCRIPT
console.log('Game.js loading...');

// Debug function
function updateDebugInfo() {
    const ua = navigator.userAgent;
    document.getElementById('debugUA').textContent = 
        ua.includes('iPad') ? 'iPad' : 
        ua.includes('iPhone') ? 'iPhone' : 
        ua.includes('Mobile') ? 'Mobile' : 'Desktop';
}

// Initialize debug info immediately
updateDebugInfo();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready, initializing game...');
    initGame();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame(); // DOM already loaded
}

function initGame() {
    console.log('Initializing game...');
    
    // Get canvas elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const particleCanvas = document.getElementById('particles');
    const particleCtx = particleCanvas.getContext('2d');
    const tapZone = document.getElementById('tapZone');

    if (!canvas || !ctx) {
        console.error('Canvas not found!');
        document.getElementById('debugStatus').textContent = 'Canvas Error';
        return;
    }

    console.log('Canvas found:', canvas);
    document.getElementById('debugStatus').textContent = 'Canvas Ready';

    // Game state
    let gameState = 'menu';
    let gameSpeed = 5;
    let scrollOffset = 0;
    let attempts = 1;
    let bestProgress = 0;
    let currentProgress = 0;
    let levelLength = 8000;
    let currentSection = 'Forest Chase';

    // Level sections
    const sections = [
        { name: 'Forest Chase', start: 0, end: 2000, mode: 'cube', theme: 'forest' },
        { name: 'Cave Spider', start: 2000, end: 4000, mode: 'spider', theme: 'cave' },
        { name: 'Castle Interior', start: 4000, end: 6500, mode: 'cube', theme: 'castle' },
        { name: 'Boss Fight', start: 6500, end: 8000, mode: 'ship', theme: 'tower' }
    ];

    // Player object
    const player = {
        x: 150,
        y: 300,
        width: 28,
        height: 28,
        velocityY: 0,
        onGround: false,
        rotation: 0,
        mode: 'cube',
        gravity: 0.7,
        jumpPower: -14,
        color: '#ff6b47',
        trail: []
    };

    // Game objects
    let obstacles = [];
    let decorations = [];
    let particles = [];
    let backgroundElements = [];
    let jewel = { x: 300, y: 300, collected: false, glow: 0 };
    let giantSkeleton = { x: 0, y: 0, visible: false, phase: 0 };
    let boss = { 
        x: 0, y: 0, active: false, health: 100, fireballs: [], 
        crystal: { x: 0, y: 0, glow: 0, rotation: 0 }, 
        attackTimer: 0, maxHealth: 100 
    };

    // Input handling
    let keys = {};
    let mouseDown = false;
    let touchCount = 0;

    // Initialize canvas size
    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
        
        // Update player starting position
        player.y = canvas.height - 100;
        jewel.y = canvas.height - 150;
        
        // Update debug info
        document.getElementById('debugCanvas').textContent = canvas.width + 'x' + canvas.height;
        
        console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
        return true;
    }

    // Input handling function
    function handleInput() {
        touchCount++;
        console.log('Input detected! Touch #' + touchCount + ', Game state:', gameState);
        document.getElementById('debugTouches').textContent = touchCount;
        document.getElementById('debugGameState').textContent = gameState;
        
        if (gameState === 'menu') {
            console.log('Starting game...');
            startGame();
        } else if (gameState === 'playing') {
            jump();
        } else if (gameState === 'dead') {
            restart();
        }
    }

    // Generate level content
    function generateLevel() {
        obstacles = [];
        decorations = [];
        backgroundElements = [];
        console.log('Generating level...');

        // Add immediate obstacles near start
        obstacles.push({
            x: 400,
            y: canvas.height - 50,
            width: 35,
            height: 50,
            type: 'tree_spike',
            deadly: true,
            section: 'forest'
        });

        obstacles.push({
            x: 600,
            y: canvas.height - 50,
            width: 35,
            height: 50,
            type: 'tree_spike',
            deadly: true,
            section: 'forest'
        });

        // Forest section obstacles
        for (let i = 800; i < 2000; i += 120) {
            if (Math.random() < 0.7) {
                obstacles.push({
                    x: i + Math.random() * 80,
                    y: canvas.height - 50,
                    width: 35,
                    height: 50,
                    type: 'tree_spike',
                    deadly: true,
                    section: 'forest'
                });
            }
        }

        // Cave section obstacles
        for (let i = 2000; i < 4000; i += 80) {
            if (Math.random() < 0.8) {
                obstacles.push({
                    x: i + Math.random() * 40,
                    y: canvas.height - 45,
                    width: 30,
                    height: 45,
                    type: 'cave_spike_up',
                    deadly: true,
                    section: 'cave'
                });
            }
        }

        // Castle section obstacles
        for (let i = 4000; i < 6500; i += 100) {
            if (Math.random() < 0.6) {
                obstacles.push({
                    x: i + Math.random() * 60,
                    y: canvas.height - 60,
                    width: 40,
                    height: 60,
                    type: 'castle_spike',
                    deadly: true,
                    section: 'castle'
                });
            }
        }

        console.log('Generated', obstacles.length, 'obstacles');
    }

    // Game functions
    function jump() {
        const section = getCurrentSection();
        
        if (section.mode === 'cube' && player.onGround) {
            player.velocityY = player.jumpPower;
            player.onGround = false;
            createJumpParticles();
        } else if (section.mode === 'ship') {
            player.velocityY -= 1.5;
            createThrustParticles();
        } else if (section.mode === 'spider') {
            if (player.onGround) {
                player.velocityY = player.jumpPower * 0.8;
                player.onGround = false;
            }
        }
    }

    function getCurrentSection() {
        for (let section of sections) {
            if (scrollOffset >= section.start && scrollOffset < section.end) {
                currentSection = section.name;
                player.mode = section.mode;
                return section;
            }
        }
        return sections[0];
    }

    function updatePlayer() {
        const section = getCurrentSection();
        
        if (section.mode === 'ship') {
            if (mouseDown || keys['Space']) {
                player.velocityY -= 1.2;
            } else {
                player.velocityY += 0.5;
            }
            player.velocityY *= 0.95;
        } else {
            player.velocityY += player.gravity;
        }

        player.y += player.velocityY;

        // Ground collision
        const groundY = canvas.height - 50;
        if (player.y + player.height > groundY) {
            player.y = groundY - player.height;
            if (section.mode !== 'ship') {
                player.velocityY = 0;
                player.onGround = true;
            }
        } else {
            player.onGround = false;
        }

        // Ceiling collision
        if (player.y < 0) {
            player.y = 0;
            if (section.mode !== 'ship') {
                player.velocityY = 0;
            }
        }

        // Update rotation
        if (section.mode === 'cube') {
            player.rotation = (scrollOffset * 0.02) % (Math.PI * 2);
        } else if (section.mode === 'ship') {
            player.rotation = player.velocityY * 0.05;
        }

        // Update trail
        player.trail.unshift({ x: player.x + player.width/2, y: player.y + player.height/2 });
        if (player.trail.length > 8) player.trail.pop();

        // Check jewel collection
        if (!jewel.collected && scrollOffset < 500) {
            const dist = Math.sqrt(Math.pow(player.x - (jewel.x - scrollOffset), 2) + Math.pow(player.y - jewel.y, 2));
            if (dist < 40) {
                jewel.collected = true;
                createCollectEffect();
            }
        }

        checkCollisions();
    }

    function checkCollisions() {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };

        for (let obstacle of obstacles) {
            const obstacleRect = {
                x: obstacle.x - scrollOffset,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
            };

            if (collision(playerRect, obstacleRect) && obstacle.deadly) {
                die();
                return;
            }
        }
    }

    function collision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function die() {
        gameState = 'dead';
        createDeathEffect();
        document.body.classList.add('death-effect');
        setTimeout(() => {
            document.body.classList.remove('death-effect');
            setTimeout(() => {
                if (gameState === 'dead') {
                    restart();
                }
            }, 1000);
        }, 400);
    }

    function restart() {
        gameState = 'playing';
        player.x = 150;
        player.y = canvas.height - 100;
        player.velocityY = 0;
        player.onGround = true;
        player.rotation = 0;
        player.trail = [];
        scrollOffset = 0;
        attempts++;
        currentProgress = 0;
        jewel.collected = false;
        boss.active = false;
        boss.fireballs = [];
        document.getElementById('attempts').textContent = attempts;
        hideMenuElements();
    }

    function startGame() {
        console.log('startGame() called');
        gameState = 'playing';
        generateLevel();
        hideMenuElements();
        
        // Reset everything
        player.x = 150;
        player.y = canvas.height - 100;
        player.velocityY = 0;
        player.onGround = true;
        player.rotation = 0;
        player.trail = [];
        scrollOffset = 0;
        currentProgress = 0;
        jewel.collected = false;
        boss.active = false;
        boss.fireballs = [];
        
        document.getElementById('debugStatus').textContent = 'Playing';
        console.log('Game started! Player at:', player.x, player.y);
    }

    function goToMenu() {
        gameState = 'menu';
        scrollOffset = 0;
        currentProgress = 0;
        currentSection = 'Menu';
        showMenuElements();
        document.getElementById('debugStatus').textContent = 'Menu';
    }

    function hideMenuElements() {
        document.getElementById('title').style.display = 'none';
        document.getElementById('subtitle').style.display = 'none';
        document.getElementById('levelInfo').style.display = 'none';
    }

    function showMenuElements() {
        document.getElementById('title').style.display = 'block';
        document.getElementById('subtitle').style.display = 'block';
        document.getElementById('levelInfo').style.display = 'block';
    }

    // Particle functions
    function createJumpParticles() {
        for (let i = 0; i < 6; i++) {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 3 + 1,
                life: 25,
                maxLife: 25,
                color: '#ff6b47',
                size: 4
            });
        }
    }

    function createThrustParticles() {
        for (let i = 0; i < 4; i++) {
            particles.push({
                x: player.x - 5,
                y: player.y + player.height / 2,
                vx: -Math.random() * 4 - 3,
                vy: (Math.random() - 0.5) * 3,
                life: 20,
                maxLife: 20,
                color: '#ffaa00',
                size: 5
            });
        }
    }

    function createDeathEffect() {
        for (let i = 0; i < 25; i++) {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 40,
                maxLife: 40,
                color: '#ff3333',
                size: 8
            });
        }
    }

    function createCollectEffect() {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: jewel.x - scrollOffset,
                y: jewel.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                color: '#ffdd00',
                size: 6
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            p.size *= 0.98;

            if (p.life <= 0 || p.size < 0.5) {
                particles.splice(i, 1);
            }
        }
    }

    // Drawing functions
    function drawBackground() {
        const section = getCurrentSection();
        const time = Date.now() * 0.001;

        if (section.theme === 'forest') {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a2a1a');
            gradient.addColorStop(0.5, '#0f1f0f');
            gradient.addColorStop(1, '#051005');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (section.theme === 'cave') {
            ctx.fillStyle = '#0a0505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#1a0f0f';
            ctx.fillRect(0, 0, canvas.width, 60);
            ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
        } else if (section.theme === 'castle') {
            ctx.fillStyle = '#1a1010';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#2a1a1a';
            for (let i = 0; i < canvas.width; i += 60) {
                ctx.fillRect(i, 0, 40, canvas.height);
            }
        } else if (section.theme === 'tower') {
            ctx.fillStyle = '#0f0505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#1f0a0a';
            ctx.fillRect(0, 0, 50, canvas.height);
            ctx.fillRect(canvas.width - 50, 0, 50, canvas.height);
        }

        // Draw ground
        ctx.fillStyle = section.theme === 'cave' ? '#2a1010' : '#1a0a0a';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    }

    function drawPlayer() {
        const section = getCurrentSection();
        
        // Draw trail
        for (let i = 0; i < player.trail.length; i++) {
            const alpha = (player.trail.length - i) / player.trail.length * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = player.color;
            ctx.fillRect(player.trail[i].x - 2, player.trail[i].y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.rotate(player.rotation);

        if (section.mode === 'cube') {
            // Skeletal cube
            ctx.fillStyle = player.color;
            ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
            
            // Skull face
            ctx.fillStyle = '#000';
            ctx.fillRect(-8, -12, 4, 4);
            ctx.fillRect(4, -12, 4, 4);
            ctx.fillRect(-6, -4, 12, 2);
            ctx.fillRect(-2, -2, 4, 4);
            
            // Bone pattern
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.moveTo(0, -10);
            ctx.lineTo(0, 10);
            ctx.stroke();
        } else if (section.mode === 'ship') {
            // Skeletal ship
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-15, -8);
            ctx.lineTo(-10, 0);
            ctx.lineTo(-15, 8);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.fillRect(-8, -3, 8, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(-6, -2, 2, 2);
            ctx.fillRect(-3, -2, 2, 2);
        } else if (section.mode === 'spider') {
            // Skeletal spider
            ctx.fillStyle = player.color;
            ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
            
            // Spider legs
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) + player.rotation;
                const legX = Math.cos(angle) * 15;
                const legY = Math.sin(angle) * 15;
                ctx.strokeStyle = player.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(legX, legY);
                ctx.stroke();
            }
            
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -6, 2, 2);
            ctx.fillRect(2, -6, 2, 2);
        }

        ctx.restore();
    }

    function drawObstacles() {
        for (let obstacle of obstacles) {
            const x = obstacle.x - scrollOffset;
            
            if (x < -obstacle.width || x > canvas.width + 50) continue;

            if (obstacle.type === 'tree_spike') {
                ctx.fillStyle = '#2a1a0a';
                ctx.fillRect(x, obstacle.y, obstacle.width, obstacle.height);
                
                ctx.fillStyle = '#4a3a1a';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x + i * 12, obstacle.y + i * 15, 8, 4);
                }
            } else if (obstacle.type === 'cave_spike_up') {
                ctx.fillStyle = '#3a2020';
                ctx.beginPath();
                ctx.moveTo(x, obstacle.y + obstacle.height);
                ctx.lineTo(x + obstacle.width / 2, obstacle.y);
                ctx.lineTo(x + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
            } else if (obstacle.type === 'castle_spike') {
                ctx.fillStyle = '#4a3a3a';
                ctx.beginPath();
                ctx.moveTo(x, obstacle.y + obstacle.height);
                ctx.lineTo(x + obstacle.width / 2, obstacle.y);
                ctx.lineTo(x + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = obstacle.deadly ? '#cc3333' : '#666';
                ctx.fillRect(x, obstacle.y, obstacle.width, obstacle.height);
            }

            if (obstacle.deadly) {
                ctx.shadowColor = '#ff3333';
                ctx.shadowBlur = 8;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, obstacle.y, obstacle.width, obstacle.height);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawJewel() {
        if (jewel.collected || scrollOffset > 1000) return;
        
        const time = Date.now() * 0.001;
        const x = jewel.x - scrollOffset;
        const y = jewel.y + Math.sin(time * 2) * 5;
        
        if (x < -50 || x > canvas.width + 50) return;
        
        jewel.glow = Math.sin(time * 4) * 0.3 + 0.7;
        
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = jewel.glow;
        
        ctx.fillStyle = '#ffdd00';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time);
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    function drawParticles() {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        for (let particle of particles) {
            const alpha = particle.life / particle.maxLife;
            particleCtx.globalAlpha = alpha;
            particleCtx.fillStyle = particle.color;
            particleCtx.beginPath();
            particleCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            particleCtx.fill();
        }
        
        particleCtx.globalAlpha = 1;
    }

    function updateProgress() {
        currentProgress = Math.min(100, (scrollOffset / levelLength) * 100);
        document.getElementById('progress').textContent = Math.floor(currentProgress) + '%';
        document.getElementById('section').textContent = currentSection;
        
        if (currentProgress > bestProgress) {
            bestProgress = currentProgress;
            document.getElementById('best').textContent = Math.floor(bestProgress) + '%';
        }
    }

    // Main game loop
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (gameState === 'playing') {
            scrollOffset += gameSpeed;
            updatePlayer();
            updateParticles();
            updateProgress();

            if (scrollOffset >= levelLength) {
                goToMenu();
            }
        }

        drawBackground();
        drawObstacles();
        drawJewel();
        
        if (gameState === 'playing' || gameState === 'dead') {
            drawPlayer();
        }
        
        drawParticles();

        requestAnimationFrame(gameLoop);
    }

    // Event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' && gameState === 'playing') {
            e.preventDefault();
            jump();
        }
        if (e.code === 'KeyR') restart();
        if (e.code === 'Escape') goToMenu();
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Mouse events on tap zone
    if (tapZone) {
        tapZone.addEventListener('mousedown', (e) => {
            e.preventDefault();
            mouseDown = true;
            handleInput();
        });

        document.addEventListener('mouseup', (e) => {
            e.preventDefault();
            mouseDown = false;
        });

        // Touch events on tap zone
        tapZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mouseDown = true;
            handleInput();
        });

        tapZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            mouseDown = false;
        });
    }

    // Prevent scrolling on mobile
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Window resize handler
    window.addEventListener('resize', () => {
        initCanvas();
    });

    // Initialize and start
    if (initCanvas()) {
        document.getElementById('debugStatus').textContent = 'Ready';
        console.log('Game initialized successfully!');
        gameLoop();
    } else {
        document.getElementById('debugStatus').textContent = 'Init Failed';
        console.error('Game initialization failed!');
    }
}
