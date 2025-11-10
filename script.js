// script.js

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let state = {
    g: 9.8,
    l1: 1,
    l2: 1,
    m1: 1,
    m2: 1,
    a1: Math.PI / 2,
    a2: Math.PI / 2,
    a1_v: 0,
    a2_v: 0,
    damping: 0.0,
    dampingEnabled: false
};

const scale = 200;
const trailPoints = [];
const maxTrailLength = 150;

const energyValue = document.getElementById('energyValue');
const energyValueInline = document.getElementById('energyValueInline');
const headerStats = document.getElementById('headerStats');
const dampingControls = document.getElementById('dampingControls');
const dampingToggle = document.getElementById('dampingToggle');

let cursorBlock = {
    x: 0,
    y: 0,
    size: 40,
    active: false,
    material: 'off',
    lastCollision: 0
};

let mouseX = 0;
let mouseY = 0;

// New variables for drag and drop
let isDragging = false;
let draggedMass = null; // 'mass1' or 'mass2'
let dragStartX = 0;
let dragStartY = 0;

function calculateEnergy() {
    const { g, l1, l2, m1, m2, a1, a2, a1_v, a2_v } = state;
    
    const y1 = -l1 * Math.cos(a1);
    const y2 = y1 - l2 * Math.cos(a2);
    
    const pe1 = m1 * g * (l1 + y1);
    const pe2 = m2 * g * (l1 + l2 + y2);
    const totalPE = pe1 + pe2;
    
    const v1x = l1 * a1_v * Math.cos(a1);
    const v1y = l1 * a1_v * Math.sin(a1);
    const v2x = v1x + l2 * a2_v * Math.cos(a2);
    const v2y = v1y + l2 * a2_v * Math.sin(a2);
    
    const ke1 = 0.5 * m1 * (v1x * v1x + v1y * v1y);
    const ke2 = 0.5 * m2 * (v2x * v2x + v2y * v2y);
    const totalKE = ke1 + ke2;
    
    return totalKE + totalPE;
}

function checkCollision(p1x, p1y, p2x, p2y) {
    const blockX = cursorBlock.x;
    const blockY = cursorBlock.y;
    const blockSize = cursorBlock.size;
    const now = Date.now();
    
    if (!cursorBlock.active || cursorBlock.material === 'off' || now - cursorBlock.lastCollision < 100) {
        return false;
    }
    
    const masses = [
        { x: p1x, y: p1y, radius: state.m1 * 15, velocity: state.a1_v },
        { x: p2x, y: p2y, radius: state.m2 * 15, velocity: state.a2_v }
    ];
    
    let collisionOccurred = false;
    
    masses.forEach((mass, index) => {
        const dx = mass.x - blockX;
        const dy = mass.y - blockY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = mass.radius + blockSize / 2;
        
        if (distance < minDistance) {
            collisionOccurred = true;
            cursorBlock.lastCollision = now;
            
            const collisionAngle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;
            
            const moveX = (overlap * Math.cos(collisionAngle)) * 0.5;
            const moveY = (overlap * Math.sin(collisionAngle)) * 0.5;
            
            if (index === 0) {
                state.a1 += moveX / (state.l1 * scale);
                state.a1_v = handleCollisionResponse(state.a1_v, collisionAngle, cursorBlock.material);
            } else {
                state.a2 += moveX / (state.l2 * scale);
                state.a2_v = handleCollisionResponse(state.a2_v, collisionAngle, cursorBlock.material);
            }
        }
    });
    
    return collisionOccurred;
}

function handleCollisionResponse(velocity, collisionAngle, material) {
    let restitution = 0.3;
    
    switch(material) {
        case 'concrete':
            restitution = 0.1;
            break;
        case 'rubber':
            restitution = 0.8;
            break;
    }
    
    const newVelocity = -velocity * restitution;
    return newVelocity;
}

// function to handle dragging physics
function handleDragPhysics() {
    if (!isDragging || !draggedMass) return;
    
    const originX = canvas.width / 1.75;
    const originY = canvas.height / 3;
    
    if (draggedMass === 'mass1') {
        // Calculate angle from origin to mouse position for mass1
        const dx = mouseX - originX;
        const dy = mouseY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit distance to rod length
        const limitedDistance = Math.min(distance, state.l1 * scale);
        
        // Calculate new angle
        state.a1 = Math.atan2(dx, dy);
        
        // Reset velocity when dragging
        state.a1_v = 0;
        state.a2_v = 0;
    } else if (draggedMass === 'mass2') {
        // Calculate position of mass1
        const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
        const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
        
        // Calculate angle from mass1 to mouse position for mass2
        const dx = mouseX - p1x;
        const dy = mouseY - p1y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit distance to rod length
        const limitedDistance = Math.min(distance, state.l2 * scale);
        
        // Calculate new angle
        state.a2 = Math.atan2(dx, dy);
        
        // Reset velocity when dragging
        state.a2_v = 0;
    }
}

function updatePhysics(dt) {
    // If dragging, handle drag physics instead of normal physics
    if (isDragging) {
        handleDragPhysics();
        return;
    }
    
    const { g, l1, l2, m1, m2, a1, a2, a1_v, a2_v, damping, dampingEnabled } = state;
    
    const originX = canvas.width / 1.75;
    const originY = canvas.height / 3;
    
    const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
    const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
    const p2x = p1x + (state.l2 * scale) * Math.sin(state.a2);
    const p2y = p1y + (state.l2 * scale) * Math.cos(state.a2);
    
    checkCollision(p1x, p1y, p2x, p2y);
    
    const num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    const num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    const num3 = -2 * Math.sin(a1 - a2) * m2 * (a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2));
    const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a1_a = (num1 + num2 + num3) / den;

    const num4 = 2 * Math.sin(a1 - a2) * (a1_v * a1_v * l1 * (m1 + m2)
        + g * (m1 + m2) * Math.cos(a1)
        + a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2));
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a2_a = num4 / den2;

    let damped_a1_a = a1_a;
    let damped_a2_a = a2_a;
    
    if (dampingEnabled && damping > 0) {
        damped_a1_a = a1_a - damping * a1_v;
        damped_a2_a = a2_a - damping * a2_v;
    }

    state.a1_v += damped_a1_a * dt;
    state.a2_v += damped_a2_a * dt;

    state.a1 += state.a1_v * dt;
    state.a2 += state.a2_v * dt;
}

function getColorIntensity(mass, baseColor) {
    const rgb = parseInt(baseColor.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    const factor = 0.5 + (mass - 0.5) / 1.5;
    return `rgb(${Math.min(255, Math.round(r * factor))}, ${Math.min(255, Math.round(g * factor))}, ${Math.min(255, Math.round(b * factor))})`;
}

function drawCursorBlock() {
    if (!cursorBlock.active || cursorBlock.material === 'off') return;
    
    ctx.save();
    
    let blockColor;
    switch(cursorBlock.material) {
        case 'concrete':
            blockColor = '#8c8c8c';
            ctx.shadowColor = 'rgba(140, 140, 140, 0.5)';
            break;
        case 'rubber':
            blockColor = '#ff6b6b';
            ctx.shadowColor = 'rgba(255, 107, 107, 0.5)';
            break;
        default:
            blockColor = '#dcb8b0';
    }
    
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = blockColor;
    ctx.fillRect(
        cursorBlock.x - cursorBlock.size / 2,
        cursorBlock.y - cursorBlock.size / 2,
        cursorBlock.size,
        cursorBlock.size
    );
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        cursorBlock.x - cursorBlock.size / 2,
        cursorBlock.y - cursorBlock.size / 2,
        cursorBlock.size,
        cursorBlock.size
    );
    
    ctx.restore();
}

function drawPendulum() {
    ctx.fillStyle = '#120F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const originX = canvas.width / 1.75;
    const originY = canvas.height / 3;

    const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
    const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
    const p2x = p1x + (state.l2 * scale) * Math.sin(state.a2);
    const p2y = p1y + (state.l2 * scale) * Math.cos(state.a2);

    // Only add trail points when not dragging
    if (!isDragging) {
        trailPoints.push({ x: p2x, y: p2y });
        if (trailPoints.length > maxTrailLength) trailPoints.shift();
    }

    for (let i = 1; i < trailPoints.length; i++) {
        const alpha = (i / trailPoints.length) * 0.6;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
        ctx.stroke();
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bbb8bb';

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw mass1 with highlight if being dragged
    ctx.fillStyle = isDragging && draggedMass === 'mass1' ? '#ffeb3b' : getColorIntensity(state.m1, '#e5cab7');
    ctx.beginPath();
    ctx.arc(p1x, p1y, state.m1 * 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw mass2 with highlight if being dragged
    ctx.fillStyle = isDragging && draggedMass === 'mass2' ? '#ffeb3b' : getColorIntensity(state.m2, '#9bb0cd');
    ctx.beginPath();
    ctx.arc(p2x, p2y, state.m2 * 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    drawCursorBlock();
}

function loop() {
    updatePhysics(0.016);
    drawPendulum();
    
    if (state.dampingEnabled) {
        const energy = calculateEnergy();
        energyValue.textContent = `${energy.toFixed(2)} J`;
        energyValueInline.textContent = `${energy.toFixed(2)} J`;
    }
    
    requestAnimationFrame(loop);
}

const sliders = {
    g: document.getElementById("gravity"),
    l1: document.getElementById("l1"),
    l2: document.getElementById("l2"),
    m1: document.getElementById("m1"),
    m2: document.getElementById("m2"),
    damping: document.getElementById("damping"),
    blockSize: document.getElementById("blockSize")
};

const vals = {
    g: document.getElementById("gVal"),
    l1: document.getElementById("l1Val"),
    l2: document.getElementById("l2Val"),
    m1: document.getElementById("m1Val"),
    m2: document.getElementById("m2Val"),
    damping: document.getElementById("dampingVal"),
    cursorMode: document.getElementById("cursorModeVal"),
    blockSize: document.getElementById("blockSizeVal")
};

function formatValue(key, value) {
    if (key === 'g') return parseFloat(value).toFixed(2);
    if (key === 'l1' || key === 'l2') return parseFloat(value).toFixed(2);
    if (key === 'm1' || key === 'm2') return parseFloat(value).toFixed(1);
    if (key === 'damping') return parseFloat(value).toFixed(3);
    if (key === 'blockSize') return parseInt(value);
    return value;
}

function initSliders() {
    for (let key in sliders) {
        if (!sliders[key]) continue;
        sliders[key].value = state[key] || cursorBlock.size;
        if (vals[key]) {
            vals[key].textContent = formatValue(key, state[key] || cursorBlock.size);
        }
    }
}

function resetPendulum() {
    state.a1 = Math.PI / 2;
    state.a2 = Math.PI / 2;
    state.a1_v = 0;
    state.a2_v = 0;
    trailPoints.length = 0;
    isDragging = false;
    draggedMass = null;
}

for (let key in sliders) {
    if (!sliders[key]) continue;
    
    sliders[key].addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        
        if (key === 'blockSize') {
            cursorBlock.size = value;
        } else {
            state[key] = value;
        }
        
        if (vals[key]) {
            vals[key].textContent = formatValue(key, value);
        }

        if (key === 'l1' || key === 'l2' || key === 'm1' || key === 'm2') {
            state.a1_v = 0;
            state.a2_v = 0;
        }

        if (key === 'l1' || key === 'l2') {
            trailPoints.length = 0;
        }
    });
}

dampingToggle.addEventListener('change', (e) => {
    state.dampingEnabled = e.target.checked;
    
    if (state.dampingEnabled) {
        dampingControls.style.display = 'block';
        headerStats.style.display = 'flex';
    } else {
        dampingControls.style.display = 'none';
        headerStats.style.display = 'none';
        state.damping = 0;
        sliders.damping.value = 0;
        vals.damping.textContent = '0.000';
    }
});

function setCursorMode(mode) {
    cursorBlock.material = mode;
    cursorBlock.active = mode !== 'off';
    
    document.querySelectorAll('.cursor-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`cursor${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
    
    vals.cursorMode.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
}

// New function to check if mouse is over a mass
function isMouseOverMass(mouseX, mouseY, massX, massY, radius) {
    const dx = mouseX - massX;
    const dy = mouseY - massY;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
}

// Mouse event handlers for drag and drop
canvas.addEventListener('mousedown', (e) => {
    // Only allow dragging when cursor mode is 'off'
    if (cursorBlock.material !== 'off') return;
    
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    const originX = canvas.width / 1.75;
    const originY = canvas.height / 3;
    const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
    const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
    const p2x = p1x + (state.l2 * scale) * Math.sin(state.a2);
    const p2y = p1y + (state.l2 * scale) * Math.cos(state.a2);
    
    // Check if mouse is over mass1
    if (isMouseOverMass(mouseX, mouseY, p1x, p1y, state.m1 * 15)) {
        isDragging = true;
        draggedMass = 'mass1';
        dragStartX = mouseX;
        dragStartY = mouseY;
    }
    // Check if mouse is over mass2
    else if (isMouseOverMass(mouseX, mouseY, p2x, p2y, state.m2 * 15)) {
        isDragging = true;
        draggedMass = 'mass2';
        dragStartX = mouseX;
        dragStartY = mouseY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Update cursor block position only when not in 'off' mode
    if (cursorBlock.material !== 'off') {
        cursorBlock.x = mouseX;
        cursorBlock.y = mouseY;
    }
    
    // If dragging, update the pendulum position
    if (isDragging) {
        handleDragPhysics();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        draggedMass = null;
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        draggedMass = null;
    }
});

document.getElementById('cursorOff').addEventListener('click', () => setCursorMode('off'));
document.getElementById('cursorConcrete').addEventListener('click', () => setCursorMode('concrete'));
document.getElementById('cursorRubber').addEventListener('click', () => setCursorMode('rubber'));

initSliders();
document.getElementById("reset").addEventListener('click', resetPendulum);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

const collapseBtn = document.getElementById('collapseBtn');
const ui = document.querySelector('.ui');
const header = document.querySelector('.header');

function toggleCollapse() {
    ui.classList.toggle('collapsed');
    collapseBtn.classList.toggle('rotated');
    
    const expandText = document.querySelector('.expand-text');
    if (ui.classList.contains('collapsed')) {
        expandText.textContent = 'Settings (click to expand)';
    } else {
        expandText.textContent = 'Settings (click to collapse)';
    }
}

collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCollapse();
});

header.addEventListener('click', () => {
    toggleCollapse();
});

ui.classList.remove('collapsed');
setCursorMode('off');

loop();

// Welcome Popup Functionality
const welcomePopup = document.getElementById('welcomePopup');
const closePopup = document.getElementById('closePopup');

// Show popup on first visit
//if (!localStorage.getItem('pendulumPopupSeen')) {
    welcomePopup.style.display = 'flex';
   // localStorage.setItem('pendulumPopupSeen', 'true');
//}

closePopup.addEventListener('click', () => {
    welcomePopup.style.display = 'none';
});

// Close popup when clicking outside content
welcomePopup.addEventListener('click', (e) => {
    if (e.target === welcomePopup) {
        welcomePopup.style.display = 'none';
    }
});

// Start the animation loop
loop();