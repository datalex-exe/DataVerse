// High-performance particle engine with zero per-frame garbage collection

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
  type: string;
  paramA?: number;
  paramB?: number;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private maxParticles: number = 80;

  constructor() {
    this.initPool();
  }

  private initPool() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: 0,
        vy: 0,
        size: 8,
        alpha: 0,
        rotation: 0,
        vRot: 0,
        life: 0,
        maxLife: 100,
        color: '#ffffff',
        type: 'none',
      });
    }
  }

  public reset() {
    for (const p of this.particles) {
      p.alpha = 0;
      p.life = 0;
    }
  }

  private spawnParticle(p: Particle, type: string, width: number, height: number, colors?: string[]) {
    p.type = type;
    p.life = 0;
    p.maxLife = 120 + Math.random() * 100;
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 0.05;

    if (type === 'snow' || type === 'ice-glitter') {
      p.x = Math.random() * width;
      p.y = -10 - Math.random() * 20;
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vy = 1.0 + Math.random() * 1.5;
      p.size = 2.5 + Math.random() * 4.5;
      p.alpha = 0.5 + Math.random() * 0.45;
      p.color = '#ffffff';
    } else if (type === 'sakura' || type === 'blossoms') {
      p.x = Math.random() * (width + 50) - 25;
      p.y = -15;
      p.vx = 0.6 + Math.random() * 1.2;
      p.vy = 1.2 + Math.random() * 1.6;
      p.size = 7 + Math.random() * 6;
      p.alpha = 0.75 + Math.random() * 0.2;
      p.color = (colors && colors.length > 0) ? colors[Math.floor(Math.random() * colors.length)] : '#fbcfe8';
      p.paramA = Math.random() * Math.PI * 2; // wobble phase
    } else if (type === 'maple-leaves' || type === 'golden-foliage') {
      p.x = Math.random() * (width + 80) - 40;
      p.y = -20;
      p.vx = 0.5 + Math.random() * 1.4;
      p.vy = 1.4 + Math.random() * 1.8;
      p.size = 12 + Math.random() * 10;
      p.alpha = 0.85;
      p.color = (colors && colors.length > 0) ? colors[Math.floor(Math.random() * colors.length)] : '#ea580c';
    } else if (type === 'fireflies') {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = (Math.random() - 0.5) * 0.5;
      p.size = 4 + Math.random() * 4;
      p.alpha = 0.1;
      p.color = '#bef264';
      p.paramA = Math.random() * Math.PI * 2; // pulse phase
    } else if (type === 'twinkle-stars' || type === 'stardust' || type === 'fairy-sparkle') {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = (Math.random() - 0.5) * 0.3;
      p.size = 4 + Math.random() * 6;
      p.alpha = 0.1;
      p.color = (colors && colors.length > 0) ? colors[Math.floor(Math.random() * colors.length)] : '#fef08a';
      p.paramA = Math.random() * Math.PI * 2;
    } else if (type === 'flames') {
      p.x = width * (0.2 + Math.random() * 0.6);
      p.y = height + 10;
      p.vx = (Math.random() - 0.5) * 1.0;
      p.vy = -(2.5 + Math.random() * 3.0);
      p.size = 6 + Math.random() * 8;
      p.alpha = 0.8;
      p.color = Math.random() > 0.4 ? '#f97316' : '#ef4444';
    } else if (type === 'rose-petals') {
      p.x = Math.random() * (width + 40) - 20;
      p.y = -15;
      p.vx = 0.4 + Math.random() * 0.8;
      p.vy = 1.0 + Math.random() * 1.5;
      p.size = 9 + Math.random() * 7;
      p.alpha = 0.85;
      p.color = '#be123c';
    } else if (type === 'butterflies') {
      p.x = Math.random() * width;
      p.y = height * (0.3 + Math.random() * 0.5);
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = (Math.random() - 0.5) * 1.2;
      p.size = 14 + Math.random() * 6;
      p.alpha = 0.9;
      p.color = '#38bdf8';
      p.paramA = 0; // wing angle
    } else {
      // Default ambient spore
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = -0.4 - Math.random() * 0.5;
      p.size = 3 + Math.random() * 3;
      p.alpha = 0.5;
      p.color = '#e2e8f0';
    }
  }

  private activePreset: string = 'none';

  public setPreset(filterId: string) {
    this.reset();
    if (filterId.includes('cherry-blossom') || filterId.includes('spring-bloom') || filterId.includes('flower-garden')) {
      this.activePreset = 'blossoms';
    } else if (filterId.includes('falling-petals') || filterId.includes('nature-dream')) {
      this.activePreset = 'rose-petals';
    } else if (filterId.includes('autumn-leaves') || filterId.includes('golden-leaves')) {
      this.activePreset = 'maple-leaves';
    } else if (filterId.includes('snowfall') || filterId.includes('winter-frost') || filterId.includes('winter-sparkle')) {
      this.activePreset = 'snow';
    } else if (filterId.includes('rainy-day') || filterId.includes('forest-mist')) {
      this.activePreset = 'rain';
    } else if (filterId.includes('fireflies') || filterId.includes('summer-glow')) {
      this.activePreset = 'fireflies';
    } else if (filterId.includes('starry-sky') || filterId.includes('stardust') || filterId.includes('cloud-dream')) {
      this.activePreset = 'twinkle-stars';
    } else if (filterId.includes('butterfly-garden')) {
      this.activePreset = 'butterflies';
    } else if (filterId.includes('fairy-dust') || filterId.includes('celestial-glow') || filterId.includes('dream-fairy')) {
      this.activePreset = 'twinkle-stars';
    } else if (filterId.includes('fire-aura')) {
      this.activePreset = 'flames';
    } else {
      this.activePreset = 'none';
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D, width: number, height: number, typeOrTime?: string | number, colors?: string[]) {
    const type = typeof typeOrTime === 'string' ? typeOrTime : this.activePreset;
    if (!type || type === 'none') return;

    ctx.save();

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      // Respawn if dead
      if (p.life >= p.maxLife || p.alpha <= 0.01 || p.y > height + 30 || p.x > width + 50 || p.x < -50) {
        if (Math.random() < 0.25) {
          this.spawnParticle(p, type, width, height, colors);
        } else {
          continue;
        }
      }

      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;

      // Draw according to particle type
      if (p.type === 'snow' || p.type === 'ice-glitter') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sakura' || p.type === 'blossoms') {
        p.paramA = (p.paramA || 0) + 0.04;
        const sway = Math.sin(p.paramA) * 1.5;
        p.x += sway;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        // Delicate curved petal
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'maple-leaves' || p.type === 'golden-foliage' || p.type === 'rose-petals') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.65, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'fireflies') {
        p.paramA = (p.paramA || 0) + 0.06;
        const glow = 0.2 + 0.7 * Math.abs(Math.sin(p.paramA));
        ctx.fillStyle = p.color;
        ctx.globalAlpha = glow;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'twinkle-stars' || p.type === 'stardust' || p.type === 'fairy-sparkle') {
        p.paramA = (p.paramA || 0) + 0.08;
        const pulse = 0.2 + 0.8 * Math.abs(Math.sin(p.paramA));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pulse;

        // Draw 4-point sparkle cross
        ctx.beginPath();
        const r = p.size;
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.2, -r * 0.2);
        ctx.lineTo(r, 0);
        ctx.lineTo(r * 0.2, r * 0.2);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.2, r * 0.2);
        ctx.lineTo(-r, 0);
        ctx.lineTo(-r * 0.2, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'flames') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'butterflies') {
        p.paramA = (p.paramA || 0) + 0.35;
        const flap = Math.abs(Math.sin(p.paramA));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        // Left wing
        ctx.beginPath();
        ctx.ellipse(-p.size * 0.4 * flap, 0, p.size * 0.5 * flap, p.size * 0.7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.ellipse(p.size * 0.4 * flap, 0, p.size * 0.5 * flap, p.size * 0.7, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
