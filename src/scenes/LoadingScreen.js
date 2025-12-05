export class LoadingScreen extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScreen', active: false });
  }

  create() {
    const cam = this.cameras.main;
    
    // Semi-transparent overlay
    const overlay = this.add.rectangle(
      cam.centerX,
      cam.centerY,
      cam.width,
      cam.height,
      0x000000,
      0.7
    ).setDepth(9999);

    // Loading text with rotation animation
    this.loadingText = this.add.text(
      cam.centerX,
      cam.centerY,
      'Loading...',
      { fontSize: '32px', color: '#00ff00', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(10000);

    // Animate rotation for spinner effect
    this.tweens.add({
      targets: this.loadingText,
      angle: 360,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });
  }

  shutdown() {
    // Clean up when the loading screen is done
    if (this.loadingText) {
      this.loadingText.destroy();
    }
  }
}
