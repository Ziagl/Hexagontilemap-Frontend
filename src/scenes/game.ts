import { Scene } from 'phaser';
import { GameMenu } from './game_menu.ts';
import { Generator, MapSize, MapType } from '@ziagl/tiled-map-generator';
import { PathFinder } from '@ziagl/tiled-map-path-finder';
import { HexOffset, Orientation, offsetToCube } from 'honeycomb-grid';
import { MovementCosts, MovementType } from '../map/MovementCosts.ts';
import { Dictionary } from '../interfaces/IDictionary.ts';

export class Game extends Scene
{
    private isDesktop = false;
    private isAndroid = false;
    private controls:Phaser.Cameras.Controls.SmoothedKeyControl;
    private map: Phaser.Tilemaps.Tilemap;
    private tileDictionary: Dictionary<Phaser.Tilemaps.Tile> = {};
    private marker: Phaser.GameObjects.Graphics;
    private movementMarkers: Phaser.GameObjects.Graphics[] = [];
    private groundLayer: Phaser.Tilemaps.TilemapLayer;
    private menu: GameMenu;
    private minimap: Phaser.Cameras.Scene2D.Camera;
    private pathFinder: PathFinder;

    private _hexSetting;
    //private _hexDefinition;

    constructor ()
    {
        super('Game');

        // is needed for cube to offset conversion
        this._hexSetting = {offset: -1 as HexOffset, orientation: Orientation.POINTY};
        //this._hexDefinition = defineHex(this._hexSetting);
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
        //this.load.tilemapTiledJSON('map', 'assets/highland.json');
    }

    create ()
    {
        // create map
        // static
        //this.map = this.add.tilemap('map');
        //const tileset = this.map.addTilesetImage('tileset', 'tiles');
        //this.groundLayer = this.map.createLayer(0, tileset!) as Phaser.Tilemaps.TilemapLayer;

        //dynamic
        const generator = new Generator();
        // @ts-ignore
        console.log("Create new random map with type " + MapType[this.gameData.mapType as keyof typeof MapType].toString() + " and size " + MapSize[this.gameData.mapSize as keyof typeof MapSize].toString());
        // @ts-ignore
        generator.generateMap(this.gameData.mapType, this.gameData.mapSize);
        const [map, rows, columns] = generator.exportMap();
        console.log("map rows "+rows+" columns "+columns);
        generator.print();

        // initialize path finder
        this.pathFinder = new PathFinder(MovementCosts.generateMap(map, MovementType.LAND), rows, columns);

        // initialize empty hexagon map
        const mapData = new Phaser.Tilemaps.MapData({
            width: columns,
            height: rows,
            tileWidth: 32,
            tileHeight: 34,
            widthInPixels: columns * 32,
            heightInPixels: rows * 34,
            orientation: Phaser.Tilemaps.Orientation.HEXAGONAL,
            format: Phaser.Tilemaps.Formats.ARRAY_2D,
            renderOrder: 'right-down',
        });
        mapData.hexSideLength = 32 / 2;

        this.map = new Phaser.Tilemaps.Tilemap(this, mapData);
        this.map.hexSideLength = mapData.hexSideLength;
        const tileset = this.map.addTilesetImage('tileset', 'tiles');
        this.groundLayer = this.map.createBlankLayer('groundLayer', tileset!, 0, 0, columns, rows, 32, 34)!;
        this.groundLayer.layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer

        // convert 1D -> 2D
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns; j++) {
                let tile = this.groundLayer.putTileAt(map[j + columns * i] - 1, j, i, false);
                tile.updatePixelXY(); // update pixel that vertical alignment is correct (hexSideLength needs to be set)
                // add tile to dictionary for later use
                const tileCoords = offsetToCube(this._hexSetting, {col: j, row: i});
                const key:string = `q:${tileCoords.q}r:${tileCoords.r}s:${tileCoords.s}`;
                this.tileDictionary[key] = tile;
            }
        }

        //  add a minimap that shows the map from a different zoom level
        this.minimap = this.cameras.add(0, this.scale.height - (this.scale.height / 4), this.scale.width / 4, this.scale.height / 4).setZoom(1).setName('mini');
        this.minimap.setBackgroundColor(0x002244);
        this.minimap.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2);

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
                    if(this.menu) {
                        this.menu.setMenuVisible(true);
                        this.menu.setTileImage(tile.index + 1);
                        const cubeCoords = offsetToCube({offset: -1, orientation: Orientation.POINTY}, {col: tile.x, row: tile.y});
                        this.menu.setTileInformation("OffsetCoords: " + tile.x + "," + tile.y + " , CubeCoords: " + cubeCoords.q + "," + cubeCoords.r + "," + cubeCoords.s + " , Index: " + tile.index);
                    }
                } else {
                    if(this.menu) {
                        this.menu.setMenuVisible(false);
                    }
                }

                // generate markers for moveable tiles
                if(this.movementMarkers.length == 0) {
                    const cubeCoords = offsetToCube(this._hexSetting, {col: tile.x, row: tile.y});

                    // compute reachable tiles
                    const reachableTiles = this.pathFinder.reachableTiles(cubeCoords, 1);
                    console.log("reachable tiles: "+reachableTiles.length);

                    console.log("new request for q:"+cubeCoords.q+"r:"+cubeCoords.r+"s:"+cubeCoords.s);
                    // creates a hexagonal movement marker based on tile size
                    reachableTiles.forEach(coordinates => {
                        // find tile by cube coordinates
                        const key:string = 'q:'+coordinates.q+'r:'+coordinates.r+'s:'+coordinates.s;
                        if(Object.keys(this.tileDictionary).includes(key)) {
                            console.log("found tile at "+key);
                            const tile = this.tileDictionary[key];

                            let movementMarker = this.add.graphics();
                            movementMarker.lineStyle(3, 0x100089, 1);
                            movementMarker.beginPath();
                            movementMarker.moveTo(0, this.map.tileHeight / 4);
                            movementMarker.lineTo(0, (this.map.tileHeight / 4) * 3);
                            movementMarker.lineTo(this.map.tileWidth / 2, this.map.tileHeight);
                            movementMarker.lineTo(this.map.tileWidth, (this.map.tileHeight / 4) * 3);
                            movementMarker.lineTo(this.map.tileWidth, this.map.tileHeight / 4);
                            movementMarker.lineTo(this.map.tileWidth / 2, 0);
                            movementMarker.lineTo(0, this.map.tileHeight / 4);
                            movementMarker.closePath();
                            movementMarker.strokePath();

                            movementMarker.x = tile.pixelX;
                            movementMarker.y = tile.pixelY;
                            movementMarker.alpha = 1;

                            this.movementMarkers.push(movementMarker);
                        } else {
                            console.log(`Key ${key} not found.`);
                        }
                    });
                } else {
                    this.movementMarkers.forEach(marker => marker.destroy());
                    this.movementMarkers = [];
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
            // back to main menu
            this.scene.start('MainMenu');
        }
        if (code === Phaser.Input.Keyboard.KeyCodes.M)
        {
            // toggle mini map
            this.minimap.visible = !this.minimap.visible;
        }
        if (code === Phaser.Input.Keyboard.KeyCodes.SPACE)
        {
            // TODO
        }
    }
}
