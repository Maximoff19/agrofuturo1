(function(){
  function setupCanvas(canvas){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0){
      // fallback dimensiones por CSS
      canvas.width = 600 * dpr; canvas.height = 320 * dpr; 
    } else {
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  class LiteChart{
    constructor(ctx, cfg){
      this.canvas = ctx.canvas || ctx;
      this.ctx = setupCanvas(this.canvas);
      this.cfg = cfg;
      this.draw();
    }
    destroy(){
      const c = this.ctx; const canvas = this.canvas;
      c.clearRect(0,0,canvas.width,canvas.height);
    }
    draw(){
      const type = this.cfg.type || 'bar';
      if (type === 'bar') return drawBar(this.ctx, this.cfg);
      if (type === 'radar') return drawRadar(this.ctx, this.cfg);
      return drawBar(this.ctx, this.cfg);
    }
  }

  function drawBar(ctx, cfg){
    const { labels, datasets } = cfg.data;
    const W = ctx.canvas.clientWidth || ctx.canvas.width; 
    const H = ctx.canvas.clientHeight || ctx.canvas.height;
    const pad = 36; const baseY = H - pad; const baseX = pad; const maxW = W - pad*2; const maxH = H - pad*2;
    // calc max value
    let maxV = 0;
    datasets.forEach(ds => ds.data.forEach(v => { if (v>maxV) maxV=v; }));
    if (maxV === 0) maxV = 1;
    const groupW = maxW / labels.length;
    const barW = groupW / (datasets.length + 1);
    // axes
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = '#223043'; ctx.lineWidth = 1; 
    ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(W-pad, baseY); ctx.stroke();
    // bars
    labels.forEach((label, j) => {
      datasets.forEach((ds, i) => {
        const val = ds.data[j] || 0;
        const h = (val/maxV) * (maxH - 10);
        const x = baseX + groupW*j + i*barW + barW*0.5;
        const y = baseY - h;
        ctx.fillStyle = ds.backgroundColor || '#4ade80';
        ctx.fillRect(x, y, barW*0.8, h);
      });
      // label
      ctx.fillStyle = '#98a3b4'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label.slice(0,18), baseX + groupW*j + groupW/2, H - 10);
    });
  }

  function drawRadar(ctx, cfg){
    const { labels, datasets } = cfg.data;
    const W = ctx.canvas.clientWidth || ctx.canvas.width; 
    const H = ctx.canvas.clientHeight || ctx.canvas.height;
    const cx = W/2, cy = H/2; const r = Math.min(W,H)/2 - 24;
    ctx.clearRect(0,0,W,H);
    // grid
    ctx.strokeStyle = '#223043'; ctx.lineWidth = 1;
    for (let t=0.25;t<=1.0;t+=0.25){
      ctx.beginPath();
      for (let i=0;i<labels.length;i++){
        const ang = (i/labels.length) * Math.PI*2 - Math.PI/2;
        const x = cx + r*t*Math.cos(ang);
        const y = cy + r*t*Math.sin(ang);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath(); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#223043';
    labels.forEach((lab, i) => {
      const ang = (i/labels.length) * Math.PI*2 - Math.PI/2;
      const x = cx + r*Math.cos(ang);
      const y = cy + r*Math.sin(ang);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
      ctx.fillStyle = '#98a3b4'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(lab, x, y - 4);
    });
    // datasets
    datasets.forEach(ds => {
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const t = Math.max(0, Math.min(1, val));
        const ang = (i/labels.length) * Math.PI*2 - Math.PI/2;
        const x = cx + r*t*Math.cos(ang);
        const y = cy + r*t*Math.sin(ang);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.fillStyle = (ds.backgroundColor || 'rgba(76, 201, 240, 0.2)');
      ctx.strokeStyle = (ds.borderColor || '#4cc9f0');
      ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
    });
  }

  window.Chart = LiteChart;
})();

