import { Scene } from 'phaser';
import { GameMenu } from './game_menu.ts';
import { Generator, MapSize, MapType, TileType } from '@ziagl/tiled-map-generator';
import { PathFinder } from '@ziagl/tiled-map-path-finder';
import { CubeCoordinates, HexOffset, Orientation, offsetToCube } from 'honeycomb-grid';
import { MovementCosts, MovementType } from '../map/MovementCosts.ts';
import { Dictionary } from '../interfaces/IDictionary.ts';
import { MovementRenderer } from '../map/MovementRenderer.ts';
import { Unit } from '../models/Unit.ts';
import { UnitManager } from '@ziagl/tiled-map-units';
import { Layers } from '../enums/Layers.ts';
import ComponentService from '../services/ComponentService.ts';
import UIBarComponent from '../components/UIBarComponent.ts';

export class Game extends Scene {
  private isDesktop = false;
  private isAndroid = false;
  private controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  private map: Phaser.Tilemaps.Tilemap;
  private tileDictionary: Dictionary<Phaser.Tilemaps.Tile> = {};
  private marker: Phaser.GameObjects.Graphics;
  private groundLayer: Phaser.Tilemaps.TilemapLayer;
  private menu: GameMenu;
  private minimap: Phaser.Cameras.Scene2D.Camera;

  // services
  private components: ComponentService;

  // path finding
  private pathFinder: PathFinder;
  private movementRenderer: MovementRenderer;
  private reachableTiles: CubeCoordinates[] = [];
  private pathTiles: CubeCoordinates[] = [];
  private readonly unpassableWater = [
    TileType.DESERT,
    TileType.FOREST,
    TileType.HILLS,
    TileType.JUNGLE,
    TileType.MOUNTAIN,
    TileType.PLAIN,
    TileType.SNOW_HILLS,
    TileType.SNOW_MOUNTAIN,
    TileType.SNOW_PLAIN,
    TileType.SNOW_WATER,
  ];
  private readonly unpassableLand = [
    TileType.DEEP_WATER,
    TileType.SHALLOW_WATER,
    TileType.MOUNTAIN,
    TileType.SNOW_MOUNTAIN,
  ];
  private readonly unpassableAir = [];

  // unit management
  private unitManager: UnitManager;

  // game
  private readonly tileWidth = 32;
  private readonly tileHeight = 34;
  private readonly playerId = 1;
  private lastSelectedUnitId: number | undefined = undefined;
  private lastSelectedUnit: Unit | undefined = undefined;
  private lastClickedTile: CubeCoordinates | undefined = undefined;

  private _hexSetting;
  //private _hexDefinition;

  constructor() {
    super('Game');

    // is needed for cube to offset conversion
    this._hexSetting = { offset: -1 as HexOffset, orientation: Orientation.POINTY };
    //this._hexDefinition = defineHex(this._hexSetting);
  }

  init() {
    this.isDesktop = this.sys.game.device.os.desktop;
    this.isAndroid = this.sys.game.device.os.android;

    // create component service
    this.components = new ComponentService();
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.components.destroy();
    });
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.lateUpdate, this);  // draw components at last
  }

  preload() {
    // map
    this.load.image('tiles', 'assets/tileset.png');
    this.load.image('plane', 'assets/units/plane/plane_E.png');
    this.load.image('tank', 'assets/units/tank/tank_E.png');
    this.load.image('ship', 'assets/units/ship/ship_E.png');
    //this.load.tilemapTiledJSON('map', 'assets/highland.json');
  }

  create() {
    // create map
    // static
    //this.map = this.add.tilemap('map');
    //const tileset = this.map.addTilesetImage('tileset', 'tiles');
    //this.groundLayer = this.map.createLayer(0, tileset!) as Phaser.Tilemaps.TilemapLayer;

    //dynamic
    const generator = new Generator();
    // @ts-ignore
    console.log(
      'Create new random map with type ' +
        MapType[this.gameData.mapType as keyof typeof MapType].toString() +
        ' and size ' +
        MapSize[this.gameData.mapSize as keyof typeof MapSize].toString(),
    );
    // @ts-ignore
    generator.generateMap(this.gameData.mapType, this.gameData.mapSize);
    const [map, rows, columns] = generator.exportMap();
    console.log('map rows ' + rows + ' columns ' + columns);
    generator.print();

    // initialize path finder
    this.pathFinder = new PathFinder(
      [
        MovementCosts.generateMap(map, MovementType.WATER),
        MovementCosts.generateMap(map, MovementType.LAND),
        MovementCosts.generateMap(map, MovementType.AIR),
      ],
      rows,
      columns,
    );

    // initialize unit manager
    this.unitManager = new UnitManager(map, Object.keys(Layers).length, rows, columns, [
      this.unpassableWater,
      this.unpassableLand,
      this.unpassableAir,
    ]);

    // initialize empty hexagon map
    const mapData = new Phaser.Tilemaps.MapData({
      width: columns,
      height: rows,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      widthInPixels: columns * this.tileWidth,
      heightInPixels: rows * this.tileHeight,
      orientation: Phaser.Tilemaps.Orientation.HEXAGONAL,
      format: Phaser.Tilemaps.Formats.ARRAY_2D,
      renderOrder: 'right-down',
    });
    mapData.hexSideLength = this.tileHeight / 2; // this needs to be height for pointy hexagon map

    this.map = new Phaser.Tilemaps.Tilemap(this, mapData);
    this.map.hexSideLength = mapData.hexSideLength;
    const tileset = this.map.addTilesetImage('tileset', 'tiles');
    this.groundLayer = this.map.createBlankLayer('groundLayer', tileset!, 0, 0, columns, rows, this.tileWidth, this.tileHeight)!;
    this.groundLayer.layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer

    // convert 1D -> 2D
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        let tile = this.groundLayer.putTileAt(map[j + columns * i] - 1, j, i, false);
        tile.updatePixelXY(); // update pixel that vertical alignment is correct (hexSideLength needs to be set)
        // add tile to dictionary for later use
        const tileCoords = offsetToCube(this._hexSetting, { col: j, row: i });
        const key: string = `q:${tileCoords.q}r:${tileCoords.r}s:${tileCoords.s}`;
        this.tileDictionary[key] = tile;
      }
    }

    // create movement renderer
    this.movementRenderer = new MovementRenderer(this, this.tileDictionary, this.map);

    //  add a minimap that shows the map from a different zoom level
    this.minimap = this.cameras
      .add(0, this.scale.height - this.scale.height / 4, this.scale.width / 4, this.scale.height / 4)
      .setZoom(0.2)
      .setName('mini');
    this.minimap.setBackgroundColor(0x002244);
    this.minimap.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2 - 200);

    const cursors = this.input.keyboard!.createCursorKeys();

    // creates a hexagonal marker based on tile size
    this.marker = this.add.graphics();
    this.marker.depth = 100;
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
      maxSpeed: 0.5,
    };

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

    if (this.isDesktop || this.isAndroid) {
      // mouse control
      this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        let createdPath = false;

        // get the tile under the curser (can be null if outside map)
        const tile = this.groundLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
        if (tile) {
          const cubeCoords = offsetToCube(this._hexSetting, { col: tile.x, row: tile.y });

          // move unit
          if(this.lastClickedTile !== undefined && 
            this.lastSelectedUnitId !== undefined &&
            this.pathTiles.length > 0 &&
            this.lastClickedTile.q === cubeCoords.q && 
            this.lastClickedTile.r === cubeCoords.r && 
            this.lastClickedTile.s === cubeCoords.s) {
              // update position for unit manager
              const success = this.unitManager.moveUnitByPath(this.lastSelectedUnitId, this.pathTiles);
              if (success) {
                // update position of display
                let unit = this.unitManager.getUnitById(this.lastSelectedUnitId) as Unit;
                unit.x = tile.pixelX + this.tileWidth / 2;
                unit.y = tile.pixelY + this.tileHeight / 2;
                this.lastSelectedUnitId = undefined;
                this.lastClickedTile = undefined;
                this.lastSelectedUnit = undefined;
              }
          }

          // check if it is a unit
          const units = this.unitManager.getUnitsByCoordinates(cubeCoords, this.playerId);

          // select unit (can also handle more than one unit on the same tile)
          // TODO
          if(units.length > 0) {
            this.lastSelectedUnitId = units[0].unitId ?? undefined;
            this.lastSelectedUnit = units[0] as Unit;
          }

          if (units.length === 0) {
            if (this.menu) {
              this.menu.setMenuVisible(true);
              this.menu.setTileImage(tile.index + 1);
              this.menu.setTileInformation(
                'OffsetCoords: ' +
                  tile.x +
                  ',' +
                  tile.y +
                  ' , CubeCoords: ' +
                  cubeCoords.q +
                  ',' +
                  cubeCoords.r +
                  ',' +
                  cubeCoords.s +
                  ' , Index: ' +
                  tile.index,
              );
            }
          } else {
            let reachablePath = true;
            // select unit a second time with shown path -> remove path
            if(this.movementRenderer.isVisible()) {
              this.pathTiles = [];
              this.movementRenderer.reset();
              reachablePath = false;
            }
            // compute reachable tiles and render them
            if (this.pathTiles.length == 0 && reachablePath && this.lastSelectedUnit !== undefined) {
              this.reachableTiles = this.pathFinder.reachableTiles(cubeCoords, this.lastSelectedUnit.unitMovement, this.lastSelectedUnit.unitLayer);
              this.movementRenderer.create(this.reachableTiles);
              createdPath = true; // set this flag to avoid removing path
            }
          }

          // generate markers for moveable tiles
          if (this.movementRenderer.isVisible() && !createdPath) {
            // if markers already exists and now clicked one of them -> compute path
            if (this.reachableTiles.length > 0) {
              const startCoords = this.reachableTiles[0];
              const endCoords = cubeCoords;
              let computePath = false;

              // check if compute path is possible
              if (startCoords.q != endCoords.q || startCoords.r != endCoords.r) {
                this.reachableTiles.forEach((coordinates) => {
                  if (coordinates.q == cubeCoords.q && coordinates.r == cubeCoords.r && coordinates.s == cubeCoords.s) {
                    computePath = true;
                    return;
                  }
                });
                if (computePath == false) {
                  // if clicked outside of marked tiles -> remove path
                  this.pathTiles = [];
                }
              }/* else {
                // if clicked on start tile -> remove path
                this.pathTiles = [];
              }*/
              // find path from start to end and render it
              if (computePath && this.lastSelectedUnit !== undefined) {
                this.pathTiles = this.pathFinder.computePath(startCoords, endCoords, this.lastSelectedUnit.unitLayer);
                this.movementRenderer.create(this.pathTiles);
              }
            }
            // reset rendered path if there is no path
            if (this.pathTiles.length == 0) {
              this.pathTiles = [];
              this.movementRenderer.reset();
            }
          }

          // remember last clicked coordinate for unit
          this.lastClickedTile = cubeCoords;
        } else {
          if (this.menu) {
            this.menu.setMenuVisible(false);
          }
        }
      });
      this.input.on(
        Phaser.Input.Events.POINTER_WHEEL,
        (
          pointer: Phaser.Input.Pointer,
          currentlyOver: Phaser.GameObjects.GameObject[],
          deltaX: number,
          deltaY: number,
          deltaZ: number,
        ) => {
          // mouse wheel zooms map
          let zoom = this.cameras.main.zoom;
          zoom = zoom + deltaY * 0.001;
          this.cameras.main.setZoom(zoom);
        },
      );
    }
    if (this.isDesktop) {
      // keyboard control
      this.input.keyboard!.on('keyup', this.anyKey, this);

      // remember to clean up on Scene shutdown
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.off(Phaser.Input.Events.POINTER_UP);
      });
    }

    // load game menu scene
    this.scene.launch('GameMenu');
    this.menu = this.scene.get('GameMenu') as GameMenu;

    // units
    let tankCoordinate = {q:0, r:0, s:0};
    let tankCoordinateOffset = {x:0, y:0};
    let shipCoordinate = {q:0, r:0, s:0};
    let shipCoordinateOffset = {x:0, y:0};
    let planeCoordinate = { q: 0, r: 5, s: -5 };
    for(let i = 5; i < 15; ++i) {
      for(let j = 5; j < 15; ++j) {
        if(tankCoordinate.q === 0) {
          if(map[i + (i*columns) + j] !== TileType.DEEP_WATER && map[i + (i*columns) + j] !== TileType.SHALLOW_WATER) {
            tankCoordinate = offsetToCube(this._hexSetting, { col: j, row: i });
            tankCoordinateOffset = { x: j, y: i };
          }
        }
        if(shipCoordinate.q === 0) {
          if(map[i + (i*columns) + j] === TileType.DEEP_WATER || map[i + (i*columns) +  j] === TileType.SHALLOW_WATER) {
            shipCoordinate = offsetToCube(this._hexSetting, { col: j, row: i });
            shipCoordinateOffset = { x: j, y: i };
          }
        }
        if(tankCoordinate.q !== 0 && shipCoordinate.q !== 0) {
          break;
        }
      }
    }

    // create tank
    console.log('tank coordinate: ' + tankCoordinateOffset.x + ',' + tankCoordinateOffset.y);
    let tankTile = this.groundLayer.getTileAt(tankCoordinateOffset.x, tankCoordinateOffset.y);
    let tank = new Unit(this, tankTile.pixelX + this.tileWidth / 2, tankTile.pixelY + this.tileHeight / 2, 'tank').setInteractive(
      new Phaser.Geom.Circle(16, 17, 16),
      Phaser.Geom.Circle.Contains,
    );
    tank.unitLayer = Layers.LAND;
    tank.unitPosition = tankCoordinate;
    tank.unitPlayer = this.playerId;
    tank.unitMovement = 3;
    if(this.unitManager.createUnit(tank)) {console.log('tank created')};
    this.children.add(tank);
    this.components.addComponent(tank, new UIBarComponent());

    // create ship
    console.log('ship coordinate: ' + shipCoordinateOffset.x + ',' + shipCoordinateOffset.y);
    let shipTile = this.groundLayer.getTileAt(shipCoordinateOffset.x, shipCoordinateOffset.y);
    let ship = new Unit(this, shipTile.pixelX + this.tileWidth / 2, shipTile.pixelY + this.tileHeight / 2, 'ship').setInteractive(
      new Phaser.Geom.Circle(16, 17, 16),
      Phaser.Geom.Circle.Contains,
    );
    ship.unitLayer = Layers.SEA;
    ship.unitPosition = shipCoordinate;
    ship.unitPlayer = this.playerId;
    ship.unitMovement = 5;
    if(this.unitManager.createUnit(ship)) { console.log('ship created'); }
    this.children.add(ship);
    this.components.addComponent(ship, new UIBarComponent());

    // create plane
    let planeTile = this.groundLayer.getTileAt(2, 5);
    let plane = new Unit(this, planeTile.pixelX + this.tileWidth / 2, planeTile.pixelY + this.tileHeight / 2, 'plane').setInteractive(
      new Phaser.Geom.Circle(16, 17, 16),
      Phaser.Geom.Circle.Contains,
    );
    plane.unitLayer = Layers.AIR;
    plane.unitPosition = planeCoordinate;
    plane.unitPlayer = this.playerId;
    plane.unitMovement = 8;
    if(this.unitManager.createUnit(plane)) { console.log('plane created'); }
    this.children.add(plane);
    this.components.addComponent(plane, new UIBarComponent());
  }

  update(time: number, delta: number) {
    this.controls.update(delta);

    // get the world point of pointer
    const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    // get the tile under the curser (can be null if outside map)
    const tile = this.groundLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
    // update marker position and visibility
    if (tile) {
      this.marker.x = tile.pixelX;
      this.marker.y = tile.pixelY;
      this.marker.alpha = 1; // sets marker visible
    } else {
      this.marker.alpha = 0; // sets marker invisible
    }
  }

  // update for UI stuff
  lateUpdate(time: number, delta: number) {
    // update all components
    this.components.update(delta);
  }

  anyKey(event: any) {
    let code = event.keyCode;

    // if user clicks ESC
    if (code === Phaser.Input.Keyboard.KeyCodes.ESC) {
      // back to main menu
      this.scene.start('MainMenu');
    }
    if (code === Phaser.Input.Keyboard.KeyCodes.M) {
      // toggle mini map
      this.minimap.visible = !this.minimap.visible;
    }
    if (code === Phaser.Input.Keyboard.KeyCodes.SPACE) {
      // TODO
    }
  }
}
