const particles = [];

export function spawnShieldBurst(x,y){
  const colors=['#00e5ff','#40c4ff','#80deea','#ffffff','#00b0ff','#b2ebf2'];
  for(let i=0;i<18;i++){
    const angle=(Math.PI*2*i)/18, speed=2+Math.random()*4;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.2,size:3+Math.random()*5,color:colors[Math.floor(Math.random()*colors.length)],life:1,decay:0.03+Math.random()*0.025,type:'circle'});
  }
  for(let i=0;i<8;i++){
    const angle=Math.random()*Math.PI*2, speed=3+Math.random()*5;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-0.5,size:2+Math.random()*2,color:'#e0f7fa',life:1,decay:0.05+Math.random()*0.03,type:'line',len:10+Math.random()*14});
  }
}
export function spawnShieldBreakBurst(x,y){
  const colors=['#00e5ff','#b2ebf2','#fff','#7a5cff'];
  for(let i=0;i<14;i++){
    const angle=Math.random()*Math.PI*2, speed=2+Math.random()*4;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1,size:4+Math.random()*6,color:colors[Math.floor(Math.random()*colors.length)],life:1,decay:0.04+Math.random()*0.03,type:'circle'});
  }
}
export function spawnStarBurst(x,y){
  const colors=['#ffbf3c','#fff176','#00a8cc','#7a5cff','#2dbd77','#ff6b7a'];
  for(let i=0;i<14;i++){
    const angle=Math.random()*Math.PI*2;
    const speed=1.8+Math.random()*3.2;
    particles.push({
      x,y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-1,
      size:3+Math.random()*4,
      color:colors[Math.floor(Math.random()*colors.length)],
      life:1, decay:0.04+Math.random()*0.03,
      type:'circle'
    });
  }
  // a few sparkle lines
  for(let i=0;i<6;i++){
    const angle=Math.random()*Math.PI*2;
    const speed=2+Math.random()*4;
    particles.push({
      x,y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-0.5,
      size:2+Math.random()*2,
      color:'#fff',
      life:1, decay:0.07+Math.random()*0.04,
      type:'line',
      len:8+Math.random()*10
    });
  }
}
export function spawnHitBurst(x,y){
  for(let i=0;i<10;i++){
    const angle=Math.random()*Math.PI*2;
    const speed=1.5+Math.random()*2.5;
    particles.push({
      x,y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-0.8,
      size:4+Math.random()*5,
      color:i%2===0?'#ff6b7a':'#ffbf3c',
      life:1, decay:0.05+Math.random()*0.04,
      type:'circle'
    });
  }
}
export function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy;
    p.vy+=0.12; // gravity
    p.life-=p.decay;
    if(p.life<=0) particles.splice(i,1);
  }
}
export function drawParticles(ctx){
  particles.forEach(p=>{
    ctx.save();
    ctx.globalAlpha=Math.max(0,p.life);
    if(p.type==='circle'){
      ctx.fillStyle=p.color;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
      ctx.fill();
    } else {
      ctx.strokeStyle=p.color;
      ctx.lineWidth=p.size*0.6;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.vx*(p.len||8),p.y+p.vy*(p.len||8));
      ctx.stroke();
    }
    ctx.restore();
  });
}
export function clearParticles() { particles.length = 0; }
