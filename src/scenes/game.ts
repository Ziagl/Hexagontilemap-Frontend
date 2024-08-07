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
import UnitUIComponent from '../components/UnitUIComponent.ts';
import { CityManager } from '@ziagl/tiled-map-cities';
import { City } from '../models/City.ts';
import CityUIComponent from '../components/CityUIComponent.ts';
import { IPoint } from '@ziagl/tiled-map-cities/lib/main/interfaces/IPoint';

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

  // city management
  private cityManager: CityManager;

  // game
  private readonly tileWidth = 32;
  private readonly tileHeight = 34;
  private readonly playerId = 1;
  private lastSelectedUnitId: number | undefined = undefined;
  private lastSelectedUnit: Unit | undefined = undefined;
  private lastClickedTile: CubeCoordinates | undefined = undefined;

  constructor() {
    super('Game');
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
    //this.load.tilemapTiledJSON('map', 'assets/highland.json');
    // units
    this.load.image('plane', 'assets/units/plane/plane_E.png');
    this.load.image('tank', 'assets/units/tank/tank_E.png');
    this.load.image('ship', 'assets/units/ship/ship_E.png');
    // cities
    this.load.image('city', 'assets/cities/city.png');
    // UI
    this.load.image('bar-horizontal-green', 'assets/ui/bar-horizontal-green.png');
    this.load.image('bar-horizontal-orange', 'assets/ui/bar-horizontal-orange.png');
    this.load.image('bar-horizontal-background', 'assets/ui/bar-horizontal-background.png');
    
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

    // initialize city manager
    this.cityManager = new CityManager(map, rows, columns, []/*this.unpassableLand*/);

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
        const tileCoords = this.pathFinder.offsetToCube({ x: j, y: i });
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
    this.marker.depth = 2000;
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
          const cubeCoords = this.pathFinder.offsetToCube({ x: tile.x, y: tile.y });
          
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
                // update unit UI
                const uiComponent = this.components.findComponent(unit, UnitUIComponent) as UnitUIComponent;
                if(uiComponent) {
                  uiComponent.updateHealthBar(unit.unitHealth / unit.unitMaxHealth);
                  uiComponent.updateMovementBar(unit.unitMovement / unit.unitMaxMovement);
                  uiComponent.updateStep();
                }
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
    let cityCoordinate = {q:0, r:0, s:0};
    let cityCoordinateOffset = {x:0, y:0};
    for(let i = 5; i < 15; ++i) {
      for(let j = 5; j < 15; ++j) {
        if(tankCoordinate.q === 0) {
          if(map[(i*columns) + j] !== TileType.DEEP_WATER && 
             map[(i*columns) + j] !== TileType.SHALLOW_WATER &&
             map[(i*columns) + j] !== TileType.MOUNTAIN) {
            tankCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            tankCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if(shipCoordinate.q === 0) {
          if(map[(i*columns) + j] === TileType.DEEP_WATER ||
            map[(i*columns) +  j] === TileType.SHALLOW_WATER) {
            shipCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            shipCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if(cityCoordinate.q === 0) {
          if(map[(i*columns) + j] !== TileType.DEEP_WATER && 
             map[(i*columns) + j] !== TileType.SHALLOW_WATER &&
             map[(i*columns) + j] !== TileType.MOUNTAIN) {
            cityCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            cityCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if(tankCoordinate.q !== 0 && shipCoordinate.q !== 0 && cityCoordinate.q !== 0) {
          break;
        }
      }
    }

    // create example units
    this.createUnit(tankCoordinate, tankCoordinateOffset, 'tank', this.playerId, 3, Layers.LAND);
    this.createUnit(shipCoordinate, shipCoordinateOffset, 'ship',  this.playerId, 5, Layers.SEA);
    this.createUnit(planeCoordinate, {x:2, y:5}, 'plane',  this.playerId, 8, Layers.AIR);

    // create cities
    this.createCity(cityCoordinate, cityCoordinateOffset, 'Vienna', this.playerId);
    let newCityCoordinate = {q:cityCoordinate.q + 2, r:cityCoordinate.r + 1, s:cityCoordinate.s - 3};
    let newCityCoordinateOffset = this.pathFinder.cubeToOffset(newCityCoordinate);
    this.createCity(newCityCoordinate, newCityCoordinateOffset, 'Salzburg', this.playerId);
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
      this.growCity(1);
    }
  }

  private createUnit(coordinate: {q:number, r:number, s:number}, offsetCoordinate: {x:number, y:number}, unitType: string, playerId: number, movementPoints: number, layer: number ) {
    let tankTile = this.groundLayer.getTileAt(offsetCoordinate.x, offsetCoordinate.y);
    const tank = new Unit(this, tankTile.pixelX + this.tileWidth / 2, tankTile.pixelY + this.tileHeight / 2, unitType).setInteractive(
      new Phaser.Geom.Circle(16, 17, 16),
      Phaser.Geom.Circle.Contains,
    );
    tank.unitLayer = layer;
    tank.unitPosition = coordinate;
    tank.unitPlayer = playerId;
    tank.unitMaxHealth = 100;
    tank.unitHealth = tank.unitMaxHealth;
    tank.unitMaxMovement = movementPoints;
    tank.unitMovement = tank.unitMaxMovement;
    if(this.unitManager.createUnit(tank)) {console.log(unitType + ' created')};
    this.children.add(tank);
    this.components.addComponent(tank, new UnitUIComponent(
      this.add.image(0, 0, 'bar-horizontal-green'),
      this.add.image(0, 0, 'bar-horizontal-orange'),
      this.add.image(0, 0, 'bar-horizontal-background')));
  }

  private createCity(coordinate: {q:number, r:number, s:number}, offsetCoordinate: {x:number, y:number}, cityName: string, playerId: number) {
    let cityTile = this.groundLayer.getTileAt(offsetCoordinate.x, offsetCoordinate.y);
    const city = new City(this, cityTile.pixelX + this.tileWidth / 2, cityTile.pixelY + this.tileHeight / 2, 'city').setInteractive(
      new Phaser.Geom.Circle(16, 17, 16),
      Phaser.Geom.Circle.Contains,
    );
    city.cityPlayer = playerId;
    city.cityPosition = coordinate;
    city.cityPositionPixel = {x: cityTile.pixelX, y: cityTile.pixelY};
    city.cityName = cityName;
    // initialize city tiles
    city.cityTiles = [];
    city.cityTilesPixel = [];
    const neighbors = this.pathFinder.neighborTiles(city.cityPosition);
    neighbors.forEach((neighbor) => {
      const tilePositionOffset = this.pathFinder.cubeToOffset(neighbor);
      const tilePixel = this.groundLayer.getTileAt(tilePositionOffset.x, tilePositionOffset.y);
      city.cityTiles.push(neighbor);
      city.cityTilesPixel.push({x: tilePixel.pixelX, y: tilePixel.pixelY});
    });
    city.cityBorders = [];
    if(this.cityManager.createCity(city)) {console.log(cityName + ' created')}; 
    //compute city borders
    this.cityManager.createCityBorders(city.cityPlayer, this.tileWidth, this.tileHeight);
    this.children.add(city);
    this.components.addComponent(city, new CityUIComponent(
      city,
      {x: cityTile.pixelX - 2, y: cityTile.pixelY + this.tileHeight - 4}));
  }

  private growCity(cityId: number) {
    const city = this.cityManager.getCityById(cityId) as City;
    if(city === undefined) {
      return;
    }
    // add a random new neighbor tile
    let tileAdded = false;
    for(let i = 0; i < city.cityTiles.length; ++i) {
      // find neighbor tiles
      const neighbors = this.pathFinder.neighborTiles(city.cityTiles[i]);
      for(let j = 0; j < neighbors.length; ++j) {
        const tilePositionOffset = this.pathFinder.cubeToOffset(neighbors[j]);
        const tilePixel = this.groundLayer.getTileAt(tilePositionOffset.x, tilePositionOffset.y);
        tileAdded = this.cityManager.addCityTile(city.cityId, neighbors[j], {x: tilePixel.pixelX, y: tilePixel.pixelY});
        if(tileAdded) {
          break;
        }
      }
      if(tileAdded) {
        break;
      }
    }
    if(tileAdded) {
      //compute city borders
      this.cityManager.createCityBorders(city.cityPlayer, this.tileWidth, this.tileHeight);
      // update city UI
      const uiComponent = this.components.findComponent(city, CityUIComponent) as CityUIComponent;
      if(uiComponent) {
        uiComponent.updateBorders();
      }
      // also update other city
      const city2 = this.cityManager.getCityById(2) as City;
      const uiComponent2 = this.components.findComponent(city2, CityUIComponent) as CityUIComponent;
      if(uiComponent2) {
        uiComponent2.updateBorders();
      }
    }
  }
}
