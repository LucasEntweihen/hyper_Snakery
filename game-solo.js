const C = { tile: 32, w: 0, h: 0 };
const cvs = document.getElementById('gameCanvas');
const ctx = cvs.getContext('2d');

// Dados RPG
const CLASSES = [
    { name:'TITAN', icon:'🛡️', hp:6, str:5, dex:1, int:1 },
    { name:'NINJA', icon:'🗡️', hp:4, str:2, dex:5, int:2 },
    { name:'MAGE', icon:'🔮', hp:3, str:1, dex:2, int:6 }
];
const POWERS = [
    { name:'Força', icon:'💪', stat:'str', val:3 },
    { name:'Agilidade', icon:'⚡', stat:'dex', val:3 },
    { name:'Sabedoria', icon:'🧠', stat:'int', val:3 },
    { name:'Ímã', icon:'🧲', id:'magnet' },
    { name:'Fantasma', icon:'👻', id:'ghost' },
    { name:'Midas', icon:'👑', id:'midas' }
];

// Estado do Jogo
let state = {
    mode: 'MENU', // MENU, PLAY, PAUSE, OVER
    snake: [], dir: {x:0,y:-1}, nextDir: {x:0,y:-1},
    foods: [], particles: [], items: [],
    rpg: { hp:0, maxHp:0, mana:100, xp:0, lvl:1, str:0, dex:0, int:0 },
    score: 0, combo: 1.0, comboTime: 0
};

// Inicialização
function resize() {
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
    C.w = Math.floor(cvs.width/C.tile)*2; // Mapa 2x a tela
    C.h = Math.floor(cvs.height/C.tile)*2;
}
window.onresize = resize;
resize();

// Renderiza Menu de Classes
const cList = document.getElementById('class-list');
CLASSES.forEach(c => {
    const div = document.createElement('div');
    div.className = 'game-card';
    div.innerHTML = `<div style="font-size:40px">${c.icon}</div><h3>${c.name}</h3>`;
    div.onclick = () => startGame(c);
    cList.appendChild(div);
});

function startGame(cls) {
    document.getElementById('modal-class').classList.add('hidden');
    state.mode = 'PLAY';
    state.rpg = { hp:cls.hp, maxHp:cls.hp, mana:100, xp:0, lvl:1, str:cls.str, dex:cls.dex, int:cls.int };
    state.snake = [{x:10,y:10}, {x:10,y:11}, {x:10,y:12}];
    spawnFood(5);
    loop();
}

// Input
document.addEventListener('keydown', e => {
    if(state.mode !== 'PLAY') return;
    const map = {'ArrowUp':{x:0,y:-1},'ArrowDown':{x:0,y:1},'ArrowLeft':{x:-1,y:0},'ArrowRight':{x:1,y:0}, 'w':{x:0,y:-1},'s':{x:0,y:1},'a':{x:-1,y:0},'d':{x:1,y:0}};
    const d = map[e.key];
    if(d && (state.dir.x + d.x !== 0 || state.dir.y + d.y !== 0)) state.nextDir = d;
    if(e.code === 'Space') useSkill();
});

function useSkill() {
    if(state.rpg.mana < 20) return;
    state.rpg.mana -= 20;
    state.comboTime = 100; // Congela combo
    // Dash visual
    for(let i=0; i<10; i++) spawnPart(state.snake[0].x, state.snake[0].y, '#0ff');
    updateGame(); // Move extra
}

function spawnFood(n) {
    for(let i=0; i<n; i++) {
        state.foods.push({
            x: Math.floor(Math.random()*C.w), y: Math.floor(Math.random()*C.h),
            type: Math.random()<0.1 ? 'gold' : 'normal'
        });
    }
}

function spawnPart(x, y, col) {
    state.particles.push({
        x: x*C.tile+C.tile/2, y: y*C.tile+C.tile/2,
        vx:(Math.random()-.5)*10, vy:(Math.random()-.5)*10, life:1, col
    });
}

function levelUp() {
    state.mode = 'PAUSE';
    state.rpg.lvl++;
    state.rpg.xp = 0;
    const uList = document.getElementById('upgrade-list');
    uList.innerHTML = '';
    
    POWERS.sort(()=>Math.random()-.5).slice(0,3).forEach(p => {
        const div = document.createElement('div');
        div.className = 'game-card';
        div.innerHTML = `<div style="font-size:40px">${p.icon}</div><h3>${p.name}</h3>`;
        div.onclick = () => {
            if(p.stat) state.rpg[p.stat] += p.val;
            state.items.push(p.id);
            addIcon(p.icon);
            document.getElementById('modal-levelup').classList.add('hidden');
            state.mode = 'PLAY';
            loop();
        };
        uList.appendChild(div);
    });
    document.getElementById('modal-levelup').classList.remove('hidden');
}

function addIcon(icon) {
    const d = document.createElement('div');
    d.style = "width:30px;height:30px;background:#222;border:1px solid #555;display:flex;justify-content:center;align-items:center;";
    d.innerText = icon;
    document.getElementById('dock').appendChild(d);
}

// Game Loop
function updateGame() {
    // Mana & Combo
    if(state.rpg.mana < 100) state.rpg.mana += 0.1 + (state.rpg.int*0.05);
    if(state.comboTime > 0) state.comboTime--; else state.combo = 1.0;

    state.dir = state.nextDir;
    const head = {x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y};

    // Wrap
    if(head.x < 0) head.x = C.w-1; if(head.x >= C.w) head.x = 0;
    if(head.y < 0) head.y = C.h-1; if(head.y >= C.h) head.y = 0;

    // Colisão
    if(!state.items.includes('ghost') && state.snake.some(s => s.x===head.x && s.y===head.y)) {
        state.rpg.hp--;
        spawnPart(head.x, head.y, '#f00');
        if(state.rpg.hp <= 0) {
            state.mode = 'OVER';
            document.getElementById('modal-gameover').classList.remove('hidden');
            return;
        } else {
            state.snake.pop(); state.snake.pop();
        }
    }

    state.snake.unshift(head);

    // Comida
    let ate = -1;
    // Magnet
    if(state.items.includes('magnet')) {
        state.foods.forEach(f => {
            if(Math.abs(f.x-head.x)<5 && Math.abs(f.y-head.y)<5) {
                if(f.x<head.x) f.x++; else if(f.x>head.x) f.x--;
                if(f.y<head.y) f.y++; else if(f.y>head.y) f.y--;
            }
        });
    }

    state.foods.forEach((f,i) => { if(f.x===head.x && f.y===head.y) ate=i; });

    if(ate !== -1) {
        const f = state.foods[ate];
        state.foods.splice(ate, 1);
        spawnFood(1);
        
        state.combo = Math.min(5, state.combo + 0.2);
        state.comboTime = 100;
        
        let pts = 10 + state.rpg.str * 2;
        if(f.type === 'gold' || (state.items.includes('midas') && Math.random()<0.2)) pts *= 5;
        
        state.score += Math.floor(pts * state.combo);
        state.rpg.xp += 20 + state.rpg.int * 5;
        
        spawnPart(head.x, head.y, f.type==='gold'?'#fd0':'#f0a');
        
        if(state.rpg.xp >= 100) levelUp();
    } else {
        state.snake.pop();
    }
    
    if(state.foods.length < 5) spawnFood(1);
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0,0,cvs.width,cvs.height);
    
    const head = state.snake[0];
    const cx = cvs.width/2; 
    const cy = cvs.height/2;

    const drawRel = (x, y, col, size=C.tile) => {
        let dx = x - head.x; let dy = y - head.y;
        if(dx < -C.w/2) dx += C.w; if(dx > C.w/2) dx -= C.w;
        if(dy < -C.h/2) dy += C.h; if(dy > C.h/2) dy -= C.h;
        
        const sx = cx + dx * C.tile;
        const sy = cy + dy * C.tile;
        
        if(sx>-C.tile && sx<cvs.width && sy>-C.tile && sy<cvs.height) {
            ctx.fillStyle = col;
            ctx.fillRect(sx+1, sy+1, size-2, size-2);
        }
    };

    // Grid (Fundo)
    const colsVis = Math.ceil(cvs.width/C.tile);
    const rowsVis = Math.ceil(cvs.height/C.tile);
    for(let r=-rowsVis/2-1; r<=rowsVis/2+1; r++) {
        for(let c=-colsVis/2-1; c<=colsVis/2+1; c++) {
            let wx = Math.floor(head.x + c); let wy = Math.floor(head.y + r);
            if((wx+wy)%2===0) {
                ctx.fillStyle = '#111';
                ctx.fillRect(cx + c*C.tile, cy + r*C.tile, C.tile, C.tile);
            }
        }
    }

    state.foods.forEach(f => drawRel(f.x, f.y, f.type==='gold'?'#fd0':'#f05'));
    state.snake.forEach((s,i) => drawRel(s.x, s.y, i===0?'#fff':'#0ff'));
    
    state.particles.forEach((p,i) => {
        p.x+=p.vx; p.y+=p.vy; p.life-=0.05;
        // Desenho absoluto relativo ao centro da tela
        ctx.fillStyle = p.col; ctx.globalAlpha = p.life;
        ctx.fillRect(cx + (p.x - head.x*C.tile), cy + (p.y - head.y*C.tile), 4, 4);
        ctx.globalAlpha = 1;
        if(p.life<=0) state.particles.splice(i,1);
    });

    // UI Updates
    document.getElementById('hp-bar').style.width = (state.rpg.hp/state.rpg.maxHp*100)+'%';
    document.getElementById('mp-bar').style.width = (state.rpg.mana)+'%';
    document.getElementById('score').innerText = state.score;
    document.getElementById('combo').innerText = 'x'+state.combo.toFixed(1);
    document.getElementById('str').innerText = state.rpg.str;
    document.getElementById('dex').innerText = state.rpg.dex;
    document.getElementById('int').innerText = state.rpg.int;
    document.getElementById('lvl').innerText = state.rpg.lvl;
}

let lastTime = 0;
let acc = 0;
function loop(time = 0) {
    if(state.mode !== 'PAUSE' && state.mode !== 'OVER') {
        const dt = time - lastTime;
        lastTime = time;
        acc += dt;
        let speed = 100 - (state.rpg.dex * 2);
        if(acc > speed) {
            updateGame();
            acc = 0;
        }
        draw();
        requestAnimationFrame(loop);
    }
}