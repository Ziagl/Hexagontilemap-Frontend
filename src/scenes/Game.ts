import { Scene } from 'phaser';

export class Game extends Scene
{
    private controls:Phaser.Cameras.Controls.SmoothedKeyControl;

    constructor ()
    {
        super('Game');
    }

    preload ()
    {
        this.load.image('tiles', 'assets/tileset.png');
        this.load.tilemapTiledJSON('map', 'assets/hexagonal.json');
    }

    create ()
    {
        const map = this.add.tilemap('map');

        const tileset = map.addTilesetImage('tileset', 'tiles');

        map.createLayer('Calque 1', tileset!);

        const cursors = this.input.keyboard!.createCursorKeys();

        this.cameras.main.setZoom(2);
        this.cameras.main.centerOn(200, 100);

        const controlConfig = {
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            acceleration: 0.02,
            drag: 0.0005,
            maxSpeed: 0.7
        };

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);
    }

    update (time:number, delta:number)
    {
        this.controls.update(delta);
    }
}
