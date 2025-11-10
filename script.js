const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let g = 9.8;
let l1= 1;
let l2= 1;
let m1= 1;
let m2= 1;

let a1 = Math.PI / 2;
let a2 = Math.PI / 2;
let a1_v = 0;
let a2_v = 0;

const scale = 200; // pixels per meter

function updatePhysics(dt) {
    const num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    const num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    const num3 = -2 * Math.sin(a1 - a2) * m2 * (a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2));
    const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a1_a = (num1 + num2 + num3) / den;

    const num4 = 2 * Math.sin(a1 - a2) * (a1_v * a1_v * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(a1) + a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2));
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a2_a = num4 / den2;

    a1_v += a1_a * dt;
    a2_v += a2_a * dt;

    a1 += a1_v * dt;
    a2 += a2_v * dt;
}

function drawPendulum() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const originX = canvas.width / 2;
    const originY = canvas.height / 3;

    const x1 = originX + l1 * scale * Math.sin(a1);
    const y1 = originY + l1 * scale * Math.cos(a1);
    const x2 = x1 + l2 * scale * Math.sin(a2);
    const y2 = y1 + l2 * scale * Math.cos(a2);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "bbb8bb";
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = "#e5cab7";
    ctx.beginPath();
    ctx.arc(x1, y1, m1 * 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9bb0cd";
    ctx.beginPath();
    ctx.arc(x2, y2, m2 * 8, 0, Math.PI * 2);
    ctx.fill();
}

function loop() {
    updatePhysics(0.016);
    drawPendulum();
    requestAnimationFrame(loop);    
}
loop();

// Controls
const sliders = {
    gravity: document.getElementById("gravity"),
    l1: document.getElementById("l1"),
    l2: document.getElementById("l2"),
    m1: document.getElementById("m1"),
    m2: document.getElementById("m2"),
};

const vals = {
    gVal: document.getElementById("gVal"),
    l1Val: document.getElementById("l1Val"),
    l2Val: document.getElementById("l2Val"),
    m1Val: document.getElementById("m1Val"),
    m2Val: document.getElementById("m2Val"),
};


for (let key in sliders) {
    sliders[key].oninput = () => {
        window[key] = parseFloat(sliders[key].value);
        vals[key + "Val"].textContent = sliders[key].value;
    };
}

document.getElementById("reset").onclick = () => {
    a1 = Math.PI / 2;
    a2 = Math.PI / 2;
    a1_v = 0;
    a2_v = 0;
};

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});