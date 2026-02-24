import { bus } from '../engine/events.js';

export class PhotoMode {
  constructor(container, canvas) {
    this.container = container;
    this.canvas = canvas;
    this.active = false;

    // Photo button
    this.btn = document.createElement('button');
    this.btn.className = 'stat-item photo-btn';
    this.btn.textContent = '📷';
    this.btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.capture();
    });
  }

  capture() {
    if (this.active) return;
    this.active = true;

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'photo-flash';
    this.container.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('active'));

    if (navigator.vibrate) navigator.vibrate(30);

    // Wait for flash then capture
    setTimeout(() => {
      flash.remove();
      this._doCapture();
      this.active = false;
    }, 300);
  }

  _doCapture() {
    try {
      // Create offscreen canvas with watermark
      const offCanvas = document.createElement('canvas');
      offCanvas.width = this.canvas.width;
      offCanvas.height = this.canvas.height;
      const ctx = offCanvas.getContext('2d');

      // Draw game canvas
      ctx.drawImage(this.canvas, 0, 0);

      // Add watermark
      const fontSize = Math.max(14, offCanvas.width / 40);
      ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('IslandCreator', offCanvas.width - 16, offCanvas.height - 12);

      // Convert to blob and download
      offCanvas.toBlob((blob) => {
        if (!blob) return;

        // Try share API first (mobile native share)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], 'island-screenshot.png', { type: 'image/png' });
          const shareData = { files: [file], title: 'My Island - IslandCreator' };
          if (navigator.canShare(shareData)) {
            navigator.share(shareData).catch(() => this._downloadBlob(blob));
            return;
          }
        }

        // Fallback: download
        this._downloadBlob(blob);
      }, 'image/png');

      bus.emit('notification', {
        message: 'Screenshot captured!',
        type: 'success',
        icon: '📸',
      });
    } catch (err) {
      bus.emit('notification', {
        message: 'Could not capture screenshot.',
        type: 'warning',
        icon: '⚠️',
      });
    }
  }

  _downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `island-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
