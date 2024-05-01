import { Scene } from 'phaser';

export class Game extends Scene
{
    private controls:Phaser.Cameras.Controls.SmoothedKeyControl;
    private map: Phaser.Tilemaps.Tilemap;
    private marker: Phaser.GameObjects.Graphics;
    private groundLayer: Phaser.Tilemaps.TilemapLayer;

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
        // create map
        this.map = this.add.tilemap('map');

        const tileset = this.map.addTilesetImage('tileset', 'tiles');
        this.groundLayer = this.map.createLayer('Calque 1', tileset!) as Phaser.Tilemaps.TilemapLayer;

        const cursors = this.input.keyboard!.createCursorKeys();

        this.marker = this.add.graphics();
        this.marker.lineStyle(2, 0x000000, 1);
        this.marker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);

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
            maxSpeed: 0.5
        };

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

        // mouse control
        this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            // const { worldX, worldY } = pointer;
            // TODO        
        });
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
            // mouse wheel zooms map
            let zoom = this.cameras.main.zoom;
            zoom = zoom + deltaY * 0.001;
            this.cameras.main.setZoom(zoom);
        });

        // remember to clean up on Scene shutdown
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off(Phaser.Input.Events.POINTER_UP)
        });
    }

    update (time:number, delta:number)
    {
        this.controls.update(delta);

        // get the world point of pointer
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

        // get the tile under the curser (can be null if outside map)
        const tile = this.groundLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
        // update marker position and visibility
        if(tile){
            this.marker.x = tile.pixelX;
            this.marker.y = tile.pixelY;
            this.marker.alpha = 1; // sets marker visible
        } else {
            this.marker.alpha = 0; // sets marker invisible
        }
    }
}
