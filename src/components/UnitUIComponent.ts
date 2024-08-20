import { IComponent } from '../interfaces/IComponent';
import HealthBar from '../models/HealthBar';

export default class UnitUIComponent implements IComponent {
  private gameObject: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

  private healthBar: HealthBar;
  private healthBarImage: Phaser.GameObjects.Image;
  private movementBar: HealthBar;
  private movementBarImage: Phaser.GameObjects.Image;
  private barBackgroundImage: Phaser.GameObjects.Image;

  private readonly barWidth: number = 20;

  constructor(
    healthBarImage: Phaser.GameObjects.Image,
    movementBarImage: Phaser.GameObjects.Image,
    barBackgroundImage: Phaser.GameObjects.Image,
  ) {
    this.healthBarImage = healthBarImage;
    this.movementBarImage = movementBarImage;
    this.barBackgroundImage = barBackgroundImage;
  }

  init(go: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform): void {
    this.gameObject = go;
  }

  start(): void {
    // get scene object and create bar
    const { scene } = this.gameObject;

    this.healthBar = new HealthBar(scene)
      .withMiddle(this.healthBarImage)
      .withBackground(this.barBackgroundImage)
      .moveTo(this.gameObject.x - this.barWidth / 2, this.gameObject.y + 17)
      .resize(this.barWidth);
    this.movementBar = new HealthBar(scene)
      .withMiddle(this.movementBarImage)
      .withBackground(this.barBackgroundImage)
      .moveTo(this.gameObject.x - this.barWidth / 2, this.gameObject.y + 19)
      .resize(this.barWidth);
  }

  updateHealthBar(percent: number) {
    if (this.healthBar) {
      this.healthBar.animateToFill(percent);
    }
  }

  updateMovementBar(percent: number) {
    if (this.movementBar) {
      this.movementBar.animateToFill(percent);
    }
  }

  updateStep() {
    // triggered updates
    if (!this.healthBar || !this.movementBar) {
      return;
    }

    this.healthBar.moveTo(this.gameObject.x - this.barWidth / 2, this.gameObject.y + 17);
    this.movementBar.moveTo(this.gameObject.x - this.barWidth / 2, this.gameObject.y + 19);
  }

  update(dt: number): void {
    // real time updates
  }

  destroy() {
    this.healthBar.destroy();
    this.movementBar.destroy();
  }
}
