const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// pendulum state
let state = {
    g: 9.8,
    l1: 1,
    l2: 1,
    m1: 1,
    m2: 1,
    a1: Math.PI / 2,
    a2: Math.PI / 2,
    a1_v: 0,
    a2_v: 0
};

const scale = 200;
const trailPoints = [];
const maxTrailLength = 150;

function updatePhysics(dt) {
    const { g, l1, l2, m1, m2, a1, a2, a1_v, a2_v } = state;
    
    // update angles based on the double pendulum equations of motion
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

    // update velocities and positions
    state.a1_v += a1_a * dt;
    state.a2_v += a2_a * dt;

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
    // clear canvas
    ctx.fillStyle = '#120F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // origin
    const originX = canvas.width / 2;
    const originY = canvas.height / 3;

    // positions using current rod lengths
    const p1x = originX + (state.l1 * scale) * Math.sin(state.a1);
    const p1y = originY + (state.l1 * scale) * Math.cos(state.a1);
    const p2x = p1x + (state.l2 * scale) * Math.sin(state.a2);
    const p2y = p1y + (state.l2 * scale) * Math.cos(state.a2);

    // update trail
    trailPoints.push({ x: p2x, y: p2y });
    if (trailPoints.length > maxTrailLength) trailPoints.shift();

    // draw trail
    for (let i = 1; i < trailPoints.length; i++) {
        const alpha = (i / trailPoints.length) * 0.6;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
        ctx.stroke();
    }

    // rods
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bbb8bb';

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // draw masses with shadow
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

    // reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function loop() {
    updatePhysics(0.016);
    drawPendulum();
    requestAnimationFrame(loop);
}

// UI
const sliders = {
    g: document.getElementById("gravity"),
    l1: document.getElementById("l1"),
    l2: document.getElementById("l2"),
    m1: document.getElementById("m1"),
    m2: document.getElementById("m2"),
};

const vals = {
    g: document.getElementById("gVal"),
    l1: document.getElementById("l1Val"),
    l2: document.getElementById("l2Val"),
    m1: document.getElementById("m1Val"),
    m2: document.getElementById("m2Val"),
};

// format value for display
function formatValue(key, value) {
    if (key === 'g') return parseFloat(value).toFixed(2);
    if (key === 'l1' || key === 'l2') return parseFloat(value).toFixed(2);
    if (key === 'm1' || key === 'm2') return parseFloat(value).toFixed(1);
    return value;
}


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

for (let key in sliders) {
    if (!sliders[key]) continue;
    
    sliders[key].addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state[key] = value;
        
        if (vals[key]) {
            vals[key].textContent = formatValue(key, value);
        }

        // reset physics when changing parameters
        if (key === 'l1' || key === 'l2' || key === 'm1' || key === 'm2') {
            state.a1_v = 0;
            state.a2_v = 0;
        }

        // clear trail when rod length changes
        if (key === 'l1' || key === 'l2') {
            trailPoints.length = 0;
        }
    });
}


initSliders();
document.getElementById("reset").addEventListener('click', resetPendulum);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

loop();