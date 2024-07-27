export default class HealthBar {
    private scene: Phaser.Scene;
    private x:number;
    private y:number;
    private width:number;
    private depth:number = 1000;

    private leftCap?: Phaser.GameObjects.Image;
    private middle?: Phaser.GameObjects.Image;
    private rightCap?: Phaser.GameObjects.Image;
    private background?: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    withLeftCap(cap: Phaser.GameObjects.Image) {
        this.leftCap = cap.setOrigin(0, 0.5);
        this.leftCap.depth = this.depth;
        return this;
    }

    withMiddle(middle: Phaser.GameObjects.Image) {
        this.middle = middle.setOrigin(0, 0.5);
        this.middle.depth = this.depth;
        return this;
    }

    withRightCap(cap: Phaser.GameObjects.Image) {
        this.rightCap = cap.setOrigin(0, 0.5);
        this.rightCap.depth = this.depth;
        return this;
    }

    withBackground(background: Phaser.GameObjects.Image) {
        this.background = background.setOrigin(0, 0.5);
        this.background.depth = this.depth - 1;
        return this;
    }

    layout() {
        if(this.middle) {
            this.middle.displayWidth = this.width;
        }
        
        this.layoutSegments();

        return this;
    }

    moveTo(x: number, y: number) {
        this.x = x;
        this.y = y;

        this.layoutSegments();

        return this;
    }

    resize(width: number) {
        this.width = width;

        this.layoutSegments();

        return this;
    }

    animateToFill(fill: number, duration: number = 1000) {
        if(!this.middle) {
            return;
        }

        const percent = Math.max(0, Math.min(1, fill));

        this.scene.tweens.add({
            targets: this.middle,
            displayWidth: this.width * percent,
            duration,
            ease: Phaser.Math.Easing.Sine.Out,
            complete: () => {
                this.layoutSegments();
            }
        });
    }

    private layoutSegments() {
        if(!this.middle) {
            return this;
        }

        this.middle.displayWidth = this.width;

        if(this.background) {
            this.background.x = this.x;
            this.background.y = this.y;
            this.background.displayWidth = this.width;
        }

        if(this.leftCap) {
            this.leftCap.x = this.x;
            this.leftCap.y = this.y;

            this.middle.x = this.leftCap.x + this.leftCap.width;
            this.middle.y = this.leftCap.y;
        } else {
            this.middle.x = this.x;
            this.middle.y = this.y;
        }

        if(this.rightCap) {
            this.rightCap.x = this.middle.x + this.middle.displayWidth;
            this.rightCap.y = this.middle.y;
        }
    }
};