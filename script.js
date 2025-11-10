const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Pendulum state
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

// Energy display elements
const energyValue = document.getElementById('energyValue');
const energyValueInline = document.getElementById('energyValueInline');
const headerStats = document.getElementById('headerStats');
const dampingControls = document.getElementById('dampingControls');
const dampingToggle = document.getElementById('dampingToggle');

function calculateEnergy() {
    const { g, l1, l2, m1, m2, a1, a2, a1_v, a2_v } = state;
    
    // Calculate heights (y positions relative to origin)
    const y1 = -l1 * Math.cos(a1); 
    const y2 = y1 - l2 * Math.cos(a2);
    
    // Potential Energy (PE = m*g*h)
    const pe1 = m1 * g * (l1 + y1); // l1 is added so PE is zero at bottom
    const pe2 = m2 * g * (l1 + l2 + y2);
    const totalPE = pe1 + pe2;
    
    // Kinetic Energy (KE = 0.5*m*v^2)
    // Velocities in cartesian coordinates (I don't think I completely understand this part)
    const v1x = l1 * a1_v * Math.cos(a1);
    const v1y = l1 * a1_v * Math.sin(a1);
    const v2x = v1x + l2 * a2_v * Math.cos(a2);
    const v2y = v1y + l2 * a2_v * Math.sin(a2);
    
    const ke1 = 0.5 * m1 * (v1x * v1x + v1y * v1y);
    const ke2 = 0.5 * m2 * (v2x * v2x + v2y * v2y);
    const totalKE = ke1 + ke2;
    
    // Total mechanical energy
    return totalKE + totalPE;
}

function updatePhysics(dt) {
    const { g, l1, l2, m1, m2, a1, a2, a1_v, a2_v, damping, dampingEnabled } = state;
    
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

    // Apply damping only if enabled
    let damped_a1_a = a1_a;
    let damped_a2_a = a2_a;
    
    if (dampingEnabled && damping > 0) {
        damped_a1_a = a1_a - damping * a1_v;
        damped_a2_a = a2_a - damping * a2_v;
    }

    // Update velocities and positions
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

function drawPendulum() {
    // Clear canvas
    ctx.fillStyle = '#120F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Origin
    const originX = canvas.width / 1.75;
    const originY = canvas.height / 3;

    // Positions using current rod lengths
    const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
    const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
    const p2x = p1x + (state.l2 * scale) * Math.sin(state.a2);
    const p2y = p1y + (state.l2 * scale) * Math.cos(state.a2);

    // Update trail
    trailPoints.push({ x: p2x, y: p2y });
    if (trailPoints.length > maxTrailLength) trailPoints.shift();

    // Draw trail
    for (let i = 1; i < trailPoints.length; i++) {
        const alpha = (i / trailPoints.length) * 0.6;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
        ctx.stroke();
    }

    // Draw rods
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bbb8bb';

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Draw masses with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = getColorIntensity(state.m1, '#e5cab7');
    ctx.beginPath();
    ctx.arc(p1x, p1y, state.m1 * 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = getColorIntensity(state.m2, '#9bb0cd');
    ctx.beginPath();
    ctx.arc(p2x, p2y, state.m2 * 15, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function loop() {
    updatePhysics(0.016);
    drawPendulum();
    
    // Update energy display only if damping is enabled
    if (state.dampingEnabled) {
        const energy = calculateEnergy();
        energyValue.textContent = `${energy.toFixed(2)} J`;
        energyValueInline.textContent = `${energy.toFixed(2)} J`;
    }
    
    requestAnimationFrame(loop);
}

// UI 
const sliders = {
    g: document.getElementById("gravity"),
    l1: document.getElementById("l1"),
    l2: document.getElementById("l2"),
    m1: document.getElementById("m1"),
    m2: document.getElementById("m2"),
    damping: document.getElementById("damping")
};

const vals = {
    g: document.getElementById("gVal"),
    l1: document.getElementById("l1Val"),
    l2: document.getElementById("l2Val"),
    m1: document.getElementById("m1Val"),
    m2: document.getElementById("m2Val"),
    damping: document.getElementById("dampingVal")
};

// format value for display
function formatValue(key, value) {
    if (key === 'g') return parseFloat(value).toFixed(2);
    if (key === 'l1' || key === 'l2') return parseFloat(value).toFixed(2);
    if (key === 'm1' || key === 'm2') return parseFloat(value).toFixed(1);
    if (key === 'damping') return parseFloat(value).toFixed(3);
    return value;
}

// Initialize slider values and labels
function initSliders() {
    for (let key in sliders) {
        if (!sliders[key]) continue;
        sliders[key].value = state[key];
        if (vals[key]) {
            vals[key].textContent = formatValue(key, state[key]);
        }
    }
}

function resetPendulum() {
    state.a1 = Math.PI / 2;
    state.a2 = Math.PI / 2;
    state.a1_v = 0;
    state.a2_v = 0;
    trailPoints.length = 0;
}

// Add event listeners to all sliders
for (let key in sliders) {
    if (!sliders[key]) continue;
    
    sliders[key].addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state[key] = value;
        
        if (vals[key]) {
            vals[key].textContent = formatValue(key, value);
        }

        // Reset physics when changing parameters
        if (key === 'l1' || key === 'l2' || key === 'm1' || key === 'm2') {
            state.a1_v = 0;
            state.a2_v = 0;
        }

        // Clear trail when rod length changes
        if (key === 'l1' || key === 'l2') {
            trailPoints.length = 0;
        }
    });
}

// Damping toggle functionality
dampingToggle.addEventListener('change', (e) => {
    state.dampingEnabled = e.target.checked;
    
    if (state.dampingEnabled) {
        dampingControls.style.display = 'block';
        headerStats.style.display = 'flex';
    } else {
        dampingControls.style.display = 'none';
        headerStats.style.display = 'none';
        // Reset damping to 0 when disabled
        state.damping = 0;
        sliders.damping.value = 0;
        vals.damping.textContent = '0.000';
    }
});

initSliders();
document.getElementById("reset").addEventListener('click', resetPendulum);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Collapsible UI functionality
const collapseBtn = document.getElementById('collapseBtn');
const ui = document.querySelector('.ui');
const header = document.querySelector('.header');

function toggleCollapse() {
    ui.classList.toggle('collapsed');
    collapseBtn.classList.toggle('rotated');
    
    // Update the expand text based on state
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

// ui expanded by default
ui.classList.remove('collapsed');

loop();