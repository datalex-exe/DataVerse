import { FaceLandmarksData } from './types';

export class FaceOverlayRenderer {
  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filterId: string,
    _params: Record<string, any>,
    face: FaceLandmarksData | null,
    timeSec: number
  ) {
    if (!face) return;

    ctx.save();

    // Landmark pixel positions
    const eyeLX = face.eyeLeft.x * width;
    const eyeLY = face.eyeLeft.y * height;
    const eyeRX = face.eyeRight.x * width;
    const eyeRY = face.eyeRight.y * height;

    const eyeCenterX = (eyeLX + eyeRX) / 2;
    const eyeCenterY = (eyeLY + eyeRY) / 2;
    const eyeDist = Math.hypot(eyeRX - eyeLX, eyeRY - eyeLY);
    const roll = face.roll;

    const foreheadX = face.forehead.x * width;
    const foreheadY = face.forehead.y * height;
    const cheekLX = face.cheekLeft.x * width;
    const cheekLY = face.cheekLeft.y * height;
    const cheekRX = face.cheekRight.x * width;
    const cheekRY = face.cheekRight.y * height;
    const noseX = face.noseTip.x * width;
    const noseY = face.noseTip.y * height;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. GLASSES & ACCESSORIES
    // ─────────────────────────────────────────────────────────────────────────
    if (filterId === 'acc-classic-sunglasses') {
      this.drawWayfarerGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-round-glasses') {
      this.drawRoundGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-heart-glasses') {
      this.drawHeartGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-cyber-glasses') {
      this.drawCyberGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll, timeSec);
    } else if (filterId === 'acc-neon-glasses') {
      this.drawNeonShutterGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-star-glasses') {
      this.drawStarGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-pixel-glasses') {
      this.drawPixelGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-cat-eye') {
      this.drawCatEyeGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-aviator') {
      this.drawAviatorGlasses(ctx, eyeCenterX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'acc-futuristic-visor') {
      this.drawFuturisticVisor(ctx, eyeCenterX, eyeCenterY, eyeDist, roll, timeSec);
    }

    // Headwear & Ears
    else if (filterId === 'acc-golden-crown') {
      this.drawGoldenCrown(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-silver-crown') {
      this.drawSilverCrown(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-floating-halo') {
      this.drawFloatingHalo(ctx, foreheadX, foreheadY, eyeDist, roll, timeSec);
    } else if (filterId === 'acc-flower-crown') {
      this.drawFlowerCrown(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-bunny-ears') {
      this.drawBunnyEars(ctx, foreheadX, foreheadY, eyeDist, roll, timeSec);
    } else if (filterId === 'acc-cat-ears') {
      this.drawCatEars(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-bear-ears') {
      this.drawBearEars(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-fantasy-horns') {
      this.drawFantasyHorns(ctx, foreheadX, foreheadY, eyeDist, roll, timeSec);
    } else if (filterId === 'acc-magical-headband') {
      this.drawMagicalHeadband(ctx, foreheadX, foreheadY, eyeDist, roll);
    } else if (filterId === 'acc-royal-tiara') {
      this.drawRoyalTiara(ctx, foreheadX, foreheadY, eyeDist, roll);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FACE EFFECTS & MAKEUP
    // ─────────────────────────────────────────────────────────────────────────
    else if (filterId === 'face-rosy-blush' || filterId === 'face-cute-blush') {
      this.drawBlush(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist, filterId === 'face-cute-blush');
    } else if (filterId === 'face-freckles') {
      this.drawFreckles(ctx, noseX, noseY, eyeDist);
    } else if (filterId === 'face-star-makeup') {
      this.drawStarStamps(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist);
    } else if (filterId === 'face-heart-makeup') {
      this.drawHeartStamps(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist);
    } else if (filterId === 'face-butterfly-makeup') {
      this.drawButterflyFaceArt(ctx, noseX, eyeCenterY, eyeDist, roll);
    } else if (filterId === 'face-rainbow-paint') {
      this.drawRainbowFacePaint(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist);
    } else if (filterId === 'face-neon-paint') {
      this.drawNeonTribalPaint(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist, timeSec);
    } else if (filterId === 'face-golden-sparkles' || filterId === 'face-silver-sparkles') {
      this.drawFaceSparkles(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist, timeSec, filterId === 'face-golden-sparkles');
    } else if (filterId === 'face-dramatic-eyeliner') {
      this.drawWingedEyeliner(ctx, eyeLX, eyeLY, eyeRX, eyeRY, eyeDist, roll);
    } else if (filterId === 'face-electric-makeup') {
      this.drawLightningBoltMakeup(ctx, cheekRX, cheekRY, eyeDist);
    } else if (filterId === 'face-crystal-makeup') {
      this.drawCrystalJewels(ctx, eyeLX, eyeLY, eyeRX, eyeRY, eyeDist);
    } else if (filterId === 'face-glitter-makeup' || filterId === 'face-festival-glitter') {
      this.drawChunkyGlitter(ctx, cheekLX, cheekLY, cheekRX, cheekRY, eyeDist, timeSec);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. FANTASY AURAS
    // ─────────────────────────────────────────────────────────────────────────
    else if (filterId === 'fantasy-galaxy-aura') {
      this.drawGalaxyAura(ctx, eyeCenterX, eyeCenterY, eyeDist, timeSec);
    } else if (filterId === 'fantasy-moonlight-aura') {
      this.drawMoonlightAura(ctx, foreheadX, foreheadY, eyeDist, timeSec);
    } else if (filterId === 'fantasy-cyberpunk') {
      this.drawCyberpunkHUD(ctx, width, height, eyeCenterX, eyeCenterY, eyeDist, timeSec);
    } else if (filterId === 'fantasy-electric-aura') {
      this.drawElectricArcs(ctx, eyeCenterX, eyeCenterY, eyeDist, timeSec);
    }

    ctx.restore();
  }

  // ── Glasses Implementations ───────────────────────────────────────────────
  private drawWayfarerGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    // Frame
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;

    // Left Frame & Lens
    ctx.beginPath();
    ctx.roundRect(-65, -20, 56, 44, [10, 8, 14, 14]);
    ctx.fill();
    ctx.stroke();

    // Right Frame & Lens
    ctx.beginPath();
    ctx.roundRect(9, -20, 56, 44, [8, 10, 14, 14]);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.fillRect(-12, -15, 24, 6);

    // Lens reflection
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-58, -14);
    ctx.lineTo(-44, -14);
    ctx.lineTo(-54, 18);
    ctx.lineTo(-64, 18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, -14);
    ctx.lineTo(30, -14);
    ctx.lineTo(20, 18);
    ctx.lineTo(10, 18);
    ctx.fill();

    ctx.restore();
  }

  private drawRoundGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';

    // Left circle
    ctx.beginPath();
    ctx.arc(-35, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right circle
    ctx.beginPath();
    ctx.arc(35, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bridge arch
    ctx.beginPath();
    ctx.arc(0, -5, 12, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }

  private drawHeartGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 100;
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3.5;

    const drawHeart = (ox: number, oy: number) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-18, -14, -30, 8, 0, 30);
      ctx.bezierCurveTo(30, 8, 18, -14, 0, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawHeart(-32, -10);
    drawHeart(32, -10);

    // Bridge
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-8, -4, 16, 4);

    ctx.restore();
  }

  private drawCyberGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const glow = 0.7 + 0.3 * Math.sin(time * 4);
    ctx.strokeStyle = '#00f5d4';
    ctx.fillStyle = 'rgba(0, 245, 212, 0.2)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 12 * glow;

    // Hexagonal cyber glasses
    const drawHex = (ox: number) => {
      ctx.beginPath();
      ctx.moveTo(ox - 28, -12);
      ctx.lineTo(ox + 24, -18);
      ctx.lineTo(ox + 30, 10);
      ctx.lineTo(ox - 10, 24);
      ctx.lineTo(ox - 30, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    drawHex(-36);
    drawHex(36);

    // Center bridge with digital lines
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(10, -8);
    ctx.stroke();

    ctx.restore();
  }

  private drawNeonShutterGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 10;

    // Outline frames
    ctx.strokeRect(-66, -18, 58, 38);
    ctx.strokeRect(8, -18, 58, 38);

    // Shutters
    for (let y = -10; y <= 14; y += 8) {
      ctx.beginPath();
      ctx.moveTo(-64, y);
      ctx.lineTo(-10, y);
      ctx.moveTo(10, y);
      ctx.lineTo(64, y);
      ctx.stroke();
    }

    // Bridge
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(10, -8);
    ctx.stroke();

    ctx.restore();
  }

  private drawStarGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 100;
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3.5;

    const drawStar = (ox: number) => {
      ctx.save();
      ctx.translate(ox, 0);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(a) * 28;
        const y = Math.sin(a) * 28;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawStar(-34);
    drawStar(34);

    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(12, -4);
    ctx.stroke();

    ctx.restore();
  }

  private drawPixelGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#000000';
    const s = 6; // pixel block size

    // Stepped pixel glasses
    // Left eye block
    ctx.fillRect(-10 * s, -3 * s, 9 * s, 6 * s);
    // Right eye block
    ctx.fillRect(1 * s, -3 * s, 9 * s, 6 * s);
    // Bridge
    ctx.fillRect(-1 * s, -2 * s, 2 * s, 2 * s);

    // Pixel glint in white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8 * s, -2 * s, 2 * s, 2 * s);
    ctx.fillRect(3 * s, -2 * s, 2 * s, 2 * s);

    ctx.restore();
  }

  private drawCatEyeGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;

    // Winged cat eye frames
    ctx.beginPath();
    ctx.moveTo(-74, -26); // sharp wing
    ctx.lineTo(-20, -12);
    ctx.lineTo(-24, 18);
    ctx.lineTo(-60, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(74, -26); // sharp wing
    ctx.lineTo(20, -12);
    ctx.lineTo(24, 18);
    ctx.lineTo(60, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.fillRect(-10, -10, 20, 4);

    ctx.restore();
  }

  private drawAviatorGlasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3.5;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';

    // Teardrop shape Left
    ctx.beginPath();
    ctx.ellipse(-34, 4, 26, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Teardrop shape Right
    ctx.beginPath();
    ctx.ellipse(34, 4, 26, 28, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Top brow bar
    ctx.beginPath();
    ctx.moveTo(-50, -22);
    ctx.lineTo(50, -22);
    ctx.stroke();

    // Nose bridge
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(10, -6);
    ctx.stroke();

    ctx.restore();
  }

  private drawFuturisticVisor(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const grad = ctx.createLinearGradient(-75, 0, 75, 0);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#06b6d4');

    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;

    // Sleek single continuous horizontal visor
    ctx.beginPath();
    ctx.roundRect(-78, -14, 156, 32, [12, 12, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // Scanning red/white laser line across visor
    const scanX = -60 + 120 * Math.abs(Math.sin(time * 3));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(scanX, -10, 8, 24);

    ctx.restore();
  }

  // ── Headwear & Ears ───────────────────────────────────────────────────────
  private drawGoldenCrown(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.45);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-55, 15);
    ctx.lineTo(-55, -25);
    ctx.lineTo(-30, 0);
    ctx.lineTo(0, -45); // center tall peak
    ctx.lineTo(30, 0);
    ctx.lineTo(55, -25);
    ctx.lineTo(55, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red and blue rubies
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -32, 6, 0, Math.PI * 2);
    ctx.arc(-42, -12, 5, 0, Math.PI * 2);
    ctx.arc(42, -12, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSilverCrown(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.45);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-50, 15);
    ctx.lineTo(-50, -20);
    ctx.lineTo(-25, -2);
    ctx.lineTo(0, -40);
    ctx.lineTo(25, -2);
    ctx.lineTo(50, -20);
    ctx.lineTo(50, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sapphire jewels
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, -28, 6, 0, Math.PI * 2);
    ctx.arc(-36, -10, 4.5, 0, Math.PI * 2);
    ctx.arc(36, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFloatingHalo(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number, time: number) {
    ctx.save();
    const bob = Math.sin(time * 3) * 6;
    ctx.translate(fx, fy - dist * 0.7 + bob);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.ellipse(0, 0, 55, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawFlowerCrown(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.2);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    // Green vine
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 10, 68, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Flowers along the arch
    const flowers = [
      { x: -55, y: -8, color: '#f43f5e' },
      { x: -30, y: -24, color: '#fbbf24' },
      { x: 0, y: -30, color: '#ec4899' },
      { x: 30, y: -24, color: '#38bdf8' },
      { x: 55, y: -8, color: '#f43f5e' },
    ];

    for (const f of flowers) {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBunnyEars(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number, time: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.35);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const twitch = Math.sin(time * 6) * 0.08;

    const drawEar = (side: number) => {
      ctx.save();
      ctx.translate(side * 28, 0);
      ctx.rotate(side * (0.15 + twitch));

      // Outer White Ear
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -65, 16, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Pink Ear
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, -65, 9, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawEar(-1);
    drawEar(1);

    ctx.restore();
  }

  private drawCatEars(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.32);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const drawEar = (side: number) => {
      ctx.save();
      ctx.translate(side * 36, 0);
      // Outer black ear
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-16 * side, 10);
      ctx.lineTo(8 * side, -45);
      ctx.lineTo(24 * side, 10);
      ctx.closePath();
      ctx.fill();

      // Inner pink ear
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-8 * side, 6);
      ctx.lineTo(8 * side, -32);
      ctx.lineTo(18 * side, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawEar(-1);
    drawEar(1);

    ctx.restore();
  }

  private drawBearEars(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.38);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const drawEar = (side: number) => {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(side * 42, -10, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(side * 42, -10, 14, 0, Math.PI * 2);
      ctx.fill();
    };

    drawEar(-1);
    drawEar(1);

    ctx.restore();
  }

  private drawFantasyHorns(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number, time: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.3);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    const glow = 0.6 + 0.4 * Math.sin(time * 5);

    const drawHorn = (side: number) => {
      ctx.save();
      ctx.translate(side * 32, 0);
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(-10 * side, 10);
      ctx.quadraticCurveTo(side * 28, -25, side * 36, -65);
      ctx.quadraticCurveTo(side * 8, -40, 12 * side, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing molten tip
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12 * glow;
      ctx.beginPath();
      ctx.arc(side * 36, -65, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawHorn(-1);
    drawHorn(1);

    ctx.restore();
  }

  private drawMagicalHeadband(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.28);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    // Arch headband
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 12, 60, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Large center pink ribbon bow
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-35, -45, -35, 10, 0, -18);
    ctx.bezierCurveTo(35, -45, 35, 10, 0, -18);
    ctx.fill();

    // Gold star knot
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRoyalTiara(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(fx, fy - dist * 0.32);
    ctx.rotate(roll);

    const scale = dist / 110;
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 10;

    // Delicate arches
    ctx.beginPath();
    ctx.arc(0, 20, 55, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Central diamond peak
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(0, -26);
    ctx.lineTo(24, 0);
    ctx.stroke();

    // Gem dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -26, 4, 0, Math.PI * 2);
    ctx.arc(-24, 0, 3.5, 0, Math.PI * 2);
    ctx.arc(24, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Makeup & Face Art Implementations ─────────────────────────────────────
  private drawBlush(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, dist: number, isKawaii: boolean) {
    const radius = dist * 0.28;

    const drawCheek = (x: number, y: number) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
      grad.addColorStop(0.6, 'rgba(251, 113, 133, 0.2)');
      grad.addColorStop(1, 'rgba(251, 113, 133, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isKawaii) {
        // Diagonal anime cuteness lines
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2.5;
        for (let i = -10; i <= 10; i += 7) {
          ctx.beginPath();
          ctx.moveTo(x + i - 6, y - 6);
          ctx.lineTo(x + i + 6, y + 6);
          ctx.stroke();
        }
      }
    };

    drawCheek(lx, ly);
    drawCheek(rx, ry);
  }

  private drawFreckles(ctx: CanvasRenderingContext2D, nx: number, ny: number, dist: number) {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.65)';
    const spread = dist * 0.45;

    // Fixed pseudorandom seed pattern around nose bridge
    const offsets = [
      [-0.4, -0.2], [-0.3, -0.1], [-0.2, -0.25], [-0.1, -0.1], [0.0, -0.2],
      [0.1, -0.12], [0.2, -0.22], [0.3, -0.08], [0.4, -0.18], [-0.35, 0.05],
      [-0.22, 0.08], [-0.08, 0.02], [0.12, 0.05], [0.25, 0.02], [0.38, 0.08],
      [-0.15, -0.05], [0.05, -0.04], [-0.28, -0.15], [0.28, -0.16]
    ];

    for (const [ox, oy] of offsets) {
      ctx.beginPath();
      ctx.arc(nx + ox * spread, ny + oy * spread, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStarStamps(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, _dist: number) {
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;

    const drawStar = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    drawStar(lx, ly - 5, 8);
    drawStar(lx + 14, ly + 6, 5);
    drawStar(rx, ry - 5, 8);
    drawStar(rx - 14, ry + 6, 5);
  }

  private drawHeartStamps(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, _dist: number) {
    ctx.fillStyle = '#ef4444';

    const drawHeart = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s, -s * 1.2, -s * 1.6, s * 0.4, 0, s * 1.6);
      ctx.bezierCurveTo(s * 1.6, s * 0.4, s, -s * 1.2, 0, 0);
      ctx.fill();
      ctx.restore();
    };

    drawHeart(lx, ly, 7);
    drawHeart(rx, ry, 7);
  }

  private drawButterflyFaceArt(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, roll: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    const scale = dist / 90;
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 2;

    // Delicate butterfly wings over nose bridge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-25, -20, -35, -5, 0, 5);
    ctx.bezierCurveTo(35, -5, 25, -20, 0, 0);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawRainbowFacePaint(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, _dist: number) {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    const h = 2.5;

    const drawStripe = (x: number, y: number, side: number) => {
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.roundRect(x - 14 * side, y + (i - 3) * h, 28, h, 2);
        ctx.fill();
      }
    };

    drawStripe(lx, ly, 1);
    drawStripe(rx, ry, -1);
  }

  private drawNeonTribalPaint(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, _dist: number, time: number) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 5);
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 10 * pulse;

    const drawMark = (x: number, y: number, side: number) => {
      ctx.beginPath();
      ctx.moveTo(x - 12 * side, y - 8);
      ctx.lineTo(x + 12 * side, y + 2);
      ctx.lineTo(x - 6 * side, y + 10);
      ctx.stroke();
    };

    drawMark(lx, ly, 1);
    drawMark(rx, ry, -1);
  }

  private drawFaceSparkles(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, _dist: number, time: number, isGold: boolean) {
    const color = isGold ? '#facc15' : '#e2e8f0';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    const sparkles = [
      { x: lx - 8, y: ly - 12, s: 6, p: 0 },
      { x: lx + 12, y: ly + 4, s: 4, p: 1.5 },
      { x: rx + 8, y: ry - 12, s: 6, p: 2.2 },
      { x: rx - 12, y: ry + 4, s: 4, p: 3.7 },
    ];

    for (const sp of sparkles) {
      const alpha = 0.2 + 0.8 * Math.abs(Math.sin(time * 4 + sp.p));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  private drawWingedEyeliner(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, dist: number, _roll: number) {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 3.5;

    // Left eye cat wing
    ctx.beginPath();
    ctx.moveTo(lx - dist * 0.25, ly);
    ctx.quadraticCurveTo(lx - dist * 0.35, ly - 6, lx - dist * 0.45, ly - 12);
    ctx.stroke();

    // Right eye cat wing
    ctx.beginPath();
    ctx.moveTo(rx + dist * 0.25, ry);
    ctx.quadraticCurveTo(rx + dist * 0.35, ry - 6, rx + dist * 0.45, ry - 12);
    ctx.stroke();
  }

  private drawLightningBoltMakeup(ctx: CanvasRenderingContext2D, rx: number, ry: number, _dist: number) {
    ctx.fillStyle = '#06b6d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -4);
    ctx.lineTo(2, -2);
    ctx.lineTo(12, 16);
    ctx.lineTo(0, 2);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawCrystalJewels(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, _ry: number, dist: number) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#e9d5ff';
    ctx.shadowBlur = 8;

    const count = 5;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const px = lx - dist * 0.2 + (rx - lx + dist * 0.4) * t;
      const py = ly - 18 - Math.sin(t * Math.PI) * 8;

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawChunkyGlitter(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number, dist: number, time: number) {
    const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#facc15'];

    const drawCluster = (cx: number, cy: number) => {
      for (let i = 0; i < 8; i++) {
        const ox = (Math.sin(i * 1.5) * dist) * 0.22;
        const oy = (Math.cos(i * 2.1) * dist) * 0.14;
        const col = colors[i % colors.length];
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * 5 + i));

        ctx.fillStyle = col;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy + 8, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawCluster(lx, ly);
    drawCluster(rx, ry);
    ctx.globalAlpha = 1.0;
  }

  // ── Fantasy Auras ─────────────────────────────────────────────────────────
  private drawGalaxyAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy - dist * 0.2);
    ctx.rotate(time * 0.6);

    const radius = dist * 1.8;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Spiral arms
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.1) {
      const r = (a / (Math.PI * 4)) * radius;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawMoonlightAura(ctx: CanvasRenderingContext2D, fx: number, fy: number, dist: number, _time: number) {
    ctx.save();
    ctx.translate(fx + dist * 0.65, fy - dist * 0.6);

    // Glowing silver crescent moon
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#e2e8f0';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // Cutout to make crescent
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(8, -4, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCyberpunkHUD(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, dist: number, _time: number) {
    ctx.save();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 8;

    // Corner brackets
    const margin = 20;
    const len = 30;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(margin, margin + len);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + len, margin);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(w - margin, h - margin - len);
    ctx.lineTo(w - margin, h - margin);
    ctx.lineTo(w - margin - len, h - margin);
    ctx.stroke();

    // Face targeting reticle
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.beginPath();
    ctx.arc(cx, cy, dist * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#00f5d4';
    ctx.fillText('SYS.REC // 60 FPS', margin + 10, margin + 25);
    ctx.fillText('TARGET: LOCKED', margin + 10, margin + 40);

    ctx.restore();
  }

  private drawElectricArcs(ctx: CanvasRenderingContext2D, cx: number, cy: number, dist: number, time: number) {
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 12;

    const count = 4;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + time * 3;
      const startX = cx + Math.cos(angle) * (dist * 0.7);
      const startY = cy + Math.sin(angle) * (dist * 0.7);
      const endX = cx + Math.cos(angle) * (dist * 1.4);
      const endY = cy + Math.sin(angle) * (dist * 1.4);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 20;
      const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 20;
      ctx.lineTo(midX, midY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export const faceOverlayRenderer = new FaceOverlayRenderer();
