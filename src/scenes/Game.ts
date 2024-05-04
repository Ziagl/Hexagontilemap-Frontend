import { Scene } from 'phaser';
import { GameMenu } from './GameMenu.ts';

export class Game extends Scene
{
    private isDesktop = false;
    private isAndroid = false;
    private controls:Phaser.Cameras.Controls.SmoothedKeyControl;
    private map: Phaser.Tilemaps.Tilemap;
    private marker: Phaser.GameObjects.Graphics;
    private groundLayer: Phaser.Tilemaps.TilemapLayer;
    private menu: GameMenu;

    constructor ()
    {
        super('Game');
    }

    init()
    {
        this.isDesktop = this.sys.game.device.os.desktop;
        this.isAndroid = this.sys.game.device.os.android;
    }

    preload ()
    {
        // map
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

        // creates a hexagonal marker based on tile size
        this.marker = this.add.graphics();
        this.marker.lineStyle(2, 0x000000, 1);
        this.marker.beginPath();
        this.marker.moveTo(0, this.map.tileHeight / 4);
        this.marker.lineTo(0, (this.map.tileHeight / 4) * 3);
        this.marker.lineTo(this.map.tileWidth / 2, this.map.tileHeight);
        this.marker.lineTo(this.map.tileWidth, (this.map.tileHeight / 4) * 3);
        this.marker.lineTo(this.map.tileWidth, this.map.tileHeight / 4);
        this.marker.lineTo(this.map.tileWidth / 2, 0);
        this.marker.lineTo(0, this.map.tileHeight / 4);
        this.marker.closePath();
        this.marker.strokePath();

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

        if(this.isDesktop || this.isAndroid)
        {
            // mouse control
            this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                
                // get the tile under the curser (can be null if outside map)
                const tile = this.groundLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
                if (tile){
                    if(this.menu)
                    {
                        this.menu.setMenuVisible(true);
                    }
                } else {
                    if(this.menu)
                    {
                        this.menu.setMenuVisible(false);
                    }
                }
            });
            this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
                // mouse wheel zooms map
                let zoom = this.cameras.main.zoom;
                zoom = zoom + deltaY * 0.001;
                this.cameras.main.setZoom(zoom);
            });
        }
        if(this.isDesktop)
        {
            // keyboard control
            this.input.keyboard!.on('keyup', this.anyKey, this);

            // remember to clean up on Scene shutdown
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                this.input.off(Phaser.Input.Events.POINTER_UP)
            });
        }

        // load game menu scene
        this.scene.launch('GameMenu');
        this.menu = this.scene.get('GameMenu') as GameMenu;
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

    anyKey (event: any)
    {
        let code = event.keyCode;

        // if user clicks ESC
        if (code === Phaser.Input.Keyboard.KeyCodes.ESC)
        {
            this.scene.start('MainMenu');
        }
    }
}
