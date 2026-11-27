import { VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';

/** Unified keyboard and mouse input state mapped to logical 1280x720 canvas coordinates. */
export class InputController {
  constructor(canvas, onFirstGesture) {
    this.canvas = canvas;
    this.onFirstGesture = onFirstGesture;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = {
      x: VIEW_WIDTH * 0.6,
      y: VIEW_HEIGHT * 0.5,
      leftDown: false,
      leftClicked: false,
      rightClicked: false,
    };
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  _toCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = VIEW_WIDTH / Math.max(1, rect.width);
    const scaleY = VIEW_HEIGHT / Math.max(1, rect.height);
    return {
      x: Math.max(0, Math.min(VIEW_WIDTH, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(VIEW_HEIGHT, (clientY - rect.top) * scaleY)),
    };
  }

  _onKeyDown(e) {
    this.onFirstGesture?.();
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (!this.keys.has(code)) {
      this.justPressed.add(code);
    }
    this.keys.add(code);
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  _onMouseMove(e) {
    const pos = this._toCanvasCoords(e.clientX, e.clientY);
    this.mouse.x = pos.x;
    this.mouse.y = pos.y;
  }

  _onMouseDown(e) {
    this.onFirstGesture?.();
    const pos = this._toCanvasCoords(e.clientX, e.clientY);
    this.mouse.x = pos.x;
    this.mouse.y = pos.y;
    if (e.button === 0) {
      this.mouse.leftDown = true;
      this.mouse.leftClicked = true;
    } else if (e.button === 2) {
      this.mouse.rightClicked = true;
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) {
      this.mouse.leftDown = false;
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  getMoveVector() {
    let dx = 0;
    let dy = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) dy -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) dy += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) dx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  endFrame() {
    this.justPressed.clear();
    this.mouse.leftClicked = false;
    this.mouse.rightClicked = false;
  }
}
