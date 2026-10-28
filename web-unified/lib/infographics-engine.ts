import { InfographicType } from './types';

export function renderInfographicOnCanvas(
  ctx: CanvasRenderingContext2D,
  type: InfographicType,
  data: {
    label?: string;
    value?: string;
    subtext?: string;
    bars?: { label: string; height: number }[];
    terminalLines?: string[];
  } | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number = 1.0 // 0.0 to 1.0 animation timeline
) {
  if (type === 'none' || !type) return;

  ctx.save();
  ctx.translate(x, y);

  switch (type) {
    case 'metric_counter': {
      const val = data?.value || '+340%';
      const lbl = data?.label || 'CONVERSION VELOCITY';
      const sub = data?.subtext || 'Automated by Cortexi AI';

      // Card Backdrop with Electric Violet Glow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.stroke();

      // Top subtle neon bar
      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(0, 0, width * Math.min(1, progress * 1.2), 3);

      // Label
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(lbl.toUpperCase(), 16, 24);

      // Metric Value with Cyan glow
      ctx.font = '800 32px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#00F0FF';
      ctx.fillText(val, 16, 62);

      // Subtext
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(sub, 16, 82);
      break;
    }

    case 'bar_chart': {
      const bars = data?.bars || [
        { label: 'Q1', height: 35 },
        { label: 'Q2', height: 55 },
        { label: 'Q3', height: 80 },
        { label: 'Q4', height: 100 },
      ];

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#00F0FF';
      ctx.fillText(data?.label || 'REVENUE TRAJECTORY', 14, 20);

      // Draw Bars
      const chartBottom = height - 26;
      const barWidth = Math.max(16, (width - 32) / bars.length - 8);

      bars.forEach((b, i) => {
        const bx = 16 + i * (barWidth + 8);
        const targetH = ((height - 50) * b.height) / 100;
        const currentH = targetH * Math.min(1, progress * 1.3);
        const by = chartBottom - currentH;

        // Gradient bar
        const grad = ctx.createLinearGradient(bx, by, bx, chartBottom);
        grad.addColorStop(0, i % 2 === 0 ? '#00F0FF' : '#8B5CF6');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.4)');

        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, barWidth, currentH);

        // Value text
        if (progress > 0.6) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(`${b.height}%`, bx + 2, by - 4);
        }

        // X label
        ctx.font = '10px system-ui';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(b.label, bx + 2, height - 10);
      });
      break;
    }

    case 'terminal': {
      const lines = data?.terminalLines || [
        '$ npx create-cortexi-story',
        '✔ Synthesizing stickman rigs...',
        '✔ Linking IK bones to timeline',
        '✔ Rendering 60fps kinetic frames',
      ];

      ctx.fillStyle = 'rgba(11, 15, 25, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.stroke();

      // Window Header
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(0, 0, width, 22);

      // 3 dots
      ctx.fillStyle = '#FF5F56';
      ctx.beginPath();
      ctx.arc(12, 11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFBD2E';
      ctx.beginPath();
      ctx.arc(24, 11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#27C93F';
      ctx.beginPath();
      ctx.arc(36, 11, 4, 0, Math.PI * 2);
      ctx.fill();

      // Title
      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('bash — 80x24', width / 2 - 30, 15);

      // Terminal Code Lines
      ctx.font = '11px monospace';
      const visibleLinesCount = Math.floor(lines.length * Math.min(1, progress * 1.25));

      lines.slice(0, Math.max(1, visibleLinesCount)).forEach((line, idx) => {
        const ly = 42 + idx * 16;
        if (line.startsWith('$')) {
          ctx.fillStyle = '#00F0FF';
        } else if (line.includes('✔')) {
          ctx.fillStyle = '#10B981';
        } else {
          ctx.fillStyle = '#E2E8F0';
        }
        ctx.fillText(line, 14, ly);
      });
      break;
    }

    case 'alert_card': {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(24, height / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText('!', 22, height / 2 + 4);

      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(data?.label || 'SYSTEM ANOMALY DETECTED', 42, height / 2 - 2);

      ctx.font = '10px system-ui';
      ctx.fillStyle = '#FECDD3';
      ctx.fillText(data?.subtext || 'Latency spike resolved by AI optimizer', 42, height / 2 + 13);
      break;
    }

    case 'sparkline': {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px system-ui';
      ctx.fillStyle = '#10B981';
      ctx.fillText(data?.label || 'REALTIME FLOW', 14, 20);

      // Line graph
      const points = [20, 28, 22, 45, 38, 62, 54, 78, 92];
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = 14 + (i * (width - 28)) / (points.length - 1);
        const py = height - 16 - (p / 100) * (height - 40);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
