import { IComponent } from "../interfaces/IComponent";

export  default class UIBarComponent implements IComponent {
    private gameObject: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
    private graphics?: Phaser.GameObjects.Graphics;

    private readonly barWidth: number = 20;
    private readonly barHeight: number = 2;

    init(go: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform): void {
        this.gameObject = go;
    }

    start(): void {
        // get scene object and create bar
        const {scene} = this.gameObject;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(1000);
        this.graphics.fillStyle(0xffffff, 1);    // background
        this.graphics.fillRect(0, 0, this.barWidth, this.barHeight);     // bar
    }

    update(dt: number):void {
        if(!this.graphics) {
            return;
        }

        this.graphics.x = this.gameObject.x - this.barWidth / 2;
        this.graphics.y = this.gameObject.y + 17;
    }
}