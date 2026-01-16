import Phaser from 'phaser';

/**
 * Floating damage number popup
 */
export class DamageNumber {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a damage number popup that floats up and fades
   */
  show(x: number, y: number, damage: number, isCritical: boolean = false): void {
    const color = damage > 0 ? '#ff6b6b' : '#51cf66';
    const size = isCritical ? '32px' : '24px';
    const prefix = damage > 0 ? '-' : '+';
    const displayValue = Math.abs(damage);

    const text = this.scene.add
      .text(x, y, `${prefix}${displayValue}`, {
        fontSize: size,
        fontFamily: 'Arial Black',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200);

    // Float up and fade
    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });

    // Scale pop for emphasis
    if (isCritical || damage >= 5) {
      this.scene.tweens.add({
        targets: text,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  /**
   * Show healing number (green, floats up)
   */
  showHeal(x: number, y: number, amount: number): void {
    const text = this.scene.add
      .text(x, y, `+${amount}`, {
        fontSize: '24px',
        fontFamily: 'Arial Black',
        color: '#51cf66',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Show blocked/deflected indicator
   */
  showBlocked(x: number, y: number): void {
    const text = this.scene.add
      .text(x, y, 'BLOCKED!', {
        fontSize: '20px',
        fontFamily: 'Arial Black',
        color: '#4dabf7',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
