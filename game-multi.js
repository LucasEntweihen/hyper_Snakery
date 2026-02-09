const C = { tile: 32, w: 0, h: 0 };
const cvs = document.getElementById('gameCanvas');
const ctx = cvs.getContext('2d');

let p1 = { body:[{x:5,y:5}], dir:{x:0,y:1}, next:{x:0,y:1}, score:0, col:'#0ff' };
let p2 = { body:[{x:20,y:20}], dir:{x:0,y:1}, next:{x:0,y:1}, score:0, col:'#f05' };
let foods = [];
let particles = [];
let running = true;

function resize() {
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
    C.w = Math.floor(cvs.width/C.tile)*2;
    C.h = Math.floor(cvs.height/C.tile)*2;
}
window.onresize = resize;
resize();

// Spawn inicial
p2.body[0].x = C.w - 5; 
p2.body[0].y = C.h - 5;
for(let i=0;i<15;i++) spawnFood();

document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    // P1
    if(k==='w' && p1.dir.y===0) p1.next = {x:0,y:-1};
    if(k==='s' && p1.dir.y===0) p1.next = {x:0,y:1};
    if(k==='a' && p1.dir.x===0) p1.next = {x:-1,y:0};
    if(k==='d' && p1.dir.x===0) p1.next = {x:1,y:0};
    if(e.code==='Space') dash(p1);

    // P2
    if(e.key==='ArrowUp' && p2.dir.y===0) p2.next = {x:0,y:-1};
    if(e.key==='ArrowDown' && p2.dir.y===0) p2.next = {x:0,y:1};
    if(e.key==='ArrowLeft' && p2.dir.x===0) p2.next = {x:-1,y:0};
    if(e.key==='ArrowRight' && p2.dir.x===0) p2.next = {x:1,y:0};
    if(e.key==='Enter') dash(p2);
});

function dash(p) {
    p.score = Math.max(0, p.score - 50);
    spawnPart(p.body[0].x, p.body[0].y, p.col);
    moveSnake(p); // Extra move
}

function spawnFood() {
    foods.push({ x:Math.floor(Math.random()*C.w), y:Math.floor(Math.random()*C.h) });
}

function spawnPart(x, y, col) {
    particles.push({ x:x*C.tile, y:y*C.tile, vx:(Math.random()-.5)*15, vy:(Math.random()-.5)*15, life:1, col });
}

function moveSnake(p) {
    p.dir = p.next;
    let head = {x: p.body[0].x + p.dir.x, y: p.body[0].y + p.dir.y};
    
    if(head.x < 0) head.x = C.w-1; if(head.x >= C.w) head.x = 0;
    if(head.y < 0) head.y = C.h-1; if(head.y >= C.h) head.y = 0;
    
    p.body.unshift(head);
    
    let ate = -1;
    foods.forEach((f,i) => { if(f.x===head.x && f.y===head.y) ate=i; });
    
    if(ate !== -1) {
        foods.splice(ate, 1);
        spawnFood();
        p.score += 100;
        spawnPart(head.x, head.y, '#fd0');
    } else {
        p.body.pop();
    }
}

function update() {
    if(!running) return;
    moveSnake(p1);
    moveSnake(p2);
    
    // Colisões
    const h1 = p1.body[0];
    const h2 = p2.body[0];
    
    if(h1.x===h2.x && h1.y===h2.y) gameOver("EMPATE");
    
    // P1 bate em P2
    if(p2.body.some(b => b.x===h1.x && b.y===h1.y)) gameOver("P2 VENCEU!");
    // P2 bate em P1
    if(p1.body.some(b => b.x===h2.x && b.y===h2.y)) gameOver("P1 VENCEU!");
    
    // Auto colisão
    if(p1.body.slice(1).some(b=>b.x===h1.x && b.y===h1.y)) gameOver("P2 VENCEU!");
    if(p2.body.slice(1).some(b=>b.x===h2.x && b.y===h2.y)) gameOver("P1 VENCEU!");

    document.getElementById('s1').innerText = p1.score;
    document.getElementById('s2').innerText = p2.score;
}

function gameOver(msg) {
    running = false;
    document.getElementById('modal-gameover').classList.remove('hidden');
    document.getElementById('winnerText').innerText = msg;
}

function renderView(p, x, y, w, h) {
    const head = p.body[0];
    const cx = x + w/2; 
    const cy = y + h/2;
    
    ctx.save();
    ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    
    // Draw Grid
    const cols = Math.ceil(w/C.tile)+2;
    const rows = Math.ceil(h/C.tile)+2;
    
    for(let r=-rows/2; r<rows/2; r++) {
        for(let c=-cols/2; c<cols/2; c++) {
            let wx = Math.floor(head.x + c); let wy = Math.floor(head.y + r);
            if((Math.abs(wx)+Math.abs(wy))%2===0) {
                ctx.fillStyle = '#111';
                ctx.fillRect(cx+c*C.tile, cy+r*C.tile, C.tile, C.tile);
            }
        }
    }

    const drawRel = (ox, oy, col) => {
        let dx = ox - head.x; let dy = oy - head.y;
        if(dx < -C.w/2) dx += C.w; if(dx > C.w/2) dx -= C.w;
        if(dy < -C.h/2) dy += C.h; if(dy > C.h/2) dy -= C.h;
        
        const sx = cx + dx*C.tile;
        const sy = cy + dy*C.tile;
        ctx.fillStyle = col;
        ctx.fillRect(sx+1, sy+1, C.tile-2, C.tile-2);
    };

    foods.forEach(f => drawRel(f.x, f.y, '#fd0'));
    p1.body.forEach(b => drawRel(b.x, b.y, p1.col));
    p2.body.forEach(b => drawRel(b.x, b.y, p2.col));
    
    // Particles
    particles.forEach((pt, i) => {
        ctx.fillStyle = pt.col; ctx.globalAlpha = pt.life;
        ctx.fillRect(cx + (pt.x/C.tile - head.x)*C.tile, cy + (pt.y/C.tile - head.y)*C.tile, 4, 4);
        pt.x+=pt.vx; pt.y+=pt.vy; pt.life-=0.05;
        if(pt.life<=0) particles.splice(i,1);
        ctx.globalAlpha = 1;
    });

    // Seta Inimigo
    let enemy = (p === p1) ? p2 : p1;
    let dx = enemy.body[0].x - head.x;
    let dy = enemy.body[0].y - head.y;
    if(dx < -C.w/2) dx += C.w; if(dx > C.w/2) dx -= C.w;
    if(dy < -C.h/2) dy += C.h; if(dy > C.h/2) dy -= C.h;
    let ang = Math.atan2(dy, dx);
    
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = enemy.col;
    ctx.beginPath(); ctx.moveTo(50,0); ctx.lineTo(40,5); ctx.lineTo(40,-5); ctx.fill();
    
    ctx.restore();
}

function loop() {
    if(running) {
        ctx.clearRect(0,0,cvs.width,cvs.height);
        renderView(p1, 0, 0, cvs.width/2, cvs.height);
        renderView(p2, cvs.width/2, 0, cvs.width/2, cvs.height);
    }
    requestAnimationFrame(loop);
}

setInterval(update, 100);
requestAnimationFrame(loop);