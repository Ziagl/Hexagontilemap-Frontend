import { Scene } from 'phaser';
import { GameMenu } from './game_menu.ts';
import { Generator, LandscapeType, MapSize, MapType, TerrainType, WaterFlowType } from '@ziagl/tiled-map-generator';
import { PathFinder } from '@ziagl/tiled-map-path-finder';
import { CubeCoordinates, Direction } from 'honeycomb-grid';
import { MovementCosts, MovementType } from '../map/MovementCosts.ts';
import { Dictionary } from '../interfaces/IDictionary.ts';
import { MovementRenderer } from '../map/MovementRenderer.ts';
import { Unit } from '../models/Unit.ts';
import { IUnit, UnitManager, UnitType } from '@ziagl/tiled-map-units';
import { Layers } from '../enums/Layers.ts';
import ComponentService from '../services/ComponentService.ts';
import UnitUIComponent from '../components/UnitUIComponent.ts';
import { CityManager } from '@ziagl/tiled-map-cities';
import { City } from '../models/City.ts';
import CityUIComponent from '../components/CityUIComponent.ts';
import { MapTemperature } from '@ziagl/tiled-map-generator/lib/main/enums/MapTemperature';
import { MapHumidity } from '@ziagl/tiled-map-generator/lib/main/enums/MapHumidity';
import { ResourceManager, ResourceType } from '@ziagl/tiled-map-resources';
import { ResourceGenerator } from '../map/ResourceGenerator.ts';
import { Utils } from '@ziagl/tiled-map-utils';
import eventsCenter from '../services/EventService.ts';

export class Game extends Scene {
  private isDesktop = false;
  private isAndroid = false;
  private controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  private map: Phaser.Tilemaps.Tilemap;
  private tileDictionary: Dictionary<Phaser.Tilemaps.Tile> = {};
  private marker: Phaser.GameObjects.Graphics;
  private terrainLayer: Phaser.Tilemaps.TilemapLayer;
  private landscapeLayer: Phaser.Tilemaps.TilemapLayer;
  private riverLayer: Phaser.Tilemaps.TilemapLayer[] = [];
  private readonly riverLayerCount = 6;
  private riverDebugLayer: Phaser.Tilemaps.TilemapLayer;
  private menu: GameMenu;
  private minimap: Phaser.Cameras.Scene2D.Camera;
  private debugMode = false;

  // services
  private components: ComponentService;

  // path finding
  private pathFinder: PathFinder;
  private movementRenderer: MovementRenderer;
  private reachableTiles: CubeCoordinates[] = [];
  private pathTiles: CubeCoordinates[] = [];
  private readonly unpassableWater = [
    TerrainType.DESERT,
    TerrainType.DESERT_HILLS,
    TerrainType.PLAIN,
    TerrainType.PLAIN_HILLS,
    TerrainType.GRASS,
    TerrainType.GRASS_HILLS,
    TerrainType.TUNDRA,
    TerrainType.TUNDRA_HILLS,
    TerrainType.SNOW,
    TerrainType.SNOW_HILLS,
    TerrainType.MOUNTAIN,
  ];
  private readonly unpassableLand = [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER];
  private readonly unpassableAir = [];

  // unit management
  private unitManager: UnitManager;

  // city management
  private cityManager: CityManager;

  // resource management
  private resourceManager: ResourceManager;

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
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.lateUpdate, this); // draw components at last
  }

  preload() {
    // map
    this.load.image('tiles', 'assets/tileset.png');
    //this.load.tilemapTiledJSON('map', 'assets/highland.json');
    // units
    this.load.image('plane', 'assets/units/plane/plane_E.png');
    this.load.image('tank', 'assets/units/tank/tank_E.png');
    this.load.image('ship', 'assets/units/ship/ship_E.png');
    this.load.image('settler', 'assets/units/settler/settler_E.png');
    // cities
    this.load.image('city', 'assets/cities/city.png');
    // UI
    this.load.image('bar-horizontal-green', 'assets/ui/bar-horizontal-green.png');
    this.load.image('bar-horizontal-orange', 'assets/ui/bar-horizontal-orange.png');
    this.load.image('bar-horizontal-background', 'assets/ui/bar-horizontal-background.png');
    //config
    this.load.json('unitsConfig', 'config/units.json');
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
    const gameData = this.gameData;
    console.log(
      'Create new random map with type ' +
        MapType[gameData.mapType as keyof typeof MapType].toString() +
        ' and size ' +
        MapSize[gameData.mapSize as keyof typeof MapSize].toString(),
    );
    generator.generateMap(gameData.mapType, gameData.mapSize, MapTemperature.NORMAL, MapHumidity.NORMAL, 2.0);
    const [map, rows, columns] = generator.exportMap();
    const riverTileDirections = generator.exportRiverTileDirections();
    console.log('map rows ' + rows + ' columns ' + columns);
    generator.print();

    // initialize path finder
    this.pathFinder = new PathFinder(
      [
        MovementCosts.generateMap(map[0], MovementType.WATER),
        MovementCosts.generateMap(map[0], MovementType.LAND),
        MovementCosts.generateMap(map[0], MovementType.AIR),
      ],
      rows,
      columns,
    );

    // initialize unit manager
    const config = this.cache.json.get('unitsConfig') as IUnit[];
    this.unitManager = new UnitManager(
      map[0],
      Object.keys(Layers).length,
      rows,
      columns,
      [this.unpassableWater, this.unpassableLand, this.unpassableAir],
      config,
    );

    // initialize city manager
    this.cityManager = new CityManager(map[0], rows, columns, [] /*this.unpassableLand*/);

    // initialize resource manager with map resources
    this.resourceManager = new ResourceManager();
    const resmap = ResourceGenerator.generateMap(map[0], map[1], rows, columns);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        const coordinates = this.pathFinder.offsetToCube({ x: j, y: i });
        this.resourceManager.addResourceTile(coordinates, resmap[j + columns * i]);
      }
    }

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
    this.terrainLayer = this.map.createBlankLayer(
      'TerrainLayer',
      tileset!,
      0,
      0,
      columns,
      rows,
      this.tileWidth,
      this.tileHeight,
    )!;
    this.terrainLayer.layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer
    this.landscapeLayer = this.map.createBlankLayer(
      'LandscapeLayer',
      tileset!,
      0,
      0,
      columns,
      rows,
      this.tileWidth,
      this.tileHeight,
    )!;
    this.landscapeLayer.layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer
    // create riverLayerCount river layers, because a river curve can lead to at least 4 river tiles per coordinate
    for(let i = 0; i < this.riverLayerCount; ++i) {
      this.riverLayer[i] = this.map.createBlankLayer(
        'RiverLayer' + i,
        tileset!,
        0,
        0,
        columns,
        rows,
        this.tileWidth,
        this.tileHeight,
      )!;
      this.riverLayer[i].layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer
    }
    // create river debug layer
    this.riverDebugLayer = this.map.createBlankLayer(
      'RiverDebugLayer',
      tileset!,
      0,
      0,
      columns,
      rows,
      this.tileWidth,
      this.tileHeight,
    )!;
    this.riverDebugLayer.layer.hexSideLength = mapData.hexSideLength; // set half tile height also for layer
    this.riverDebugLayer.visible = this.debugMode;
    // convert 1D -> 2D
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        // terrain layer
        let tile = this.terrainLayer.putTileAt(map[0][j + columns * i] - 1, j, i, false);
        tile.updatePixelXY(); // update pixel that vertical alignment is correct (hexSideLength needs to be set)
        // add tile to dictionary for later use
        const tileCoords = this.pathFinder.offsetToCube({ x: j, y: i });
        const key = Utils.coordinateToKey(tileCoords);
        this.tileDictionary[key] = tile;
        if (map[1][j + columns * i] !== LandscapeType.NONE) {
          // landscape layer
          let landscapeTile = this.landscapeLayer.putTileAt(map[1][j + columns * i] - 1, j, i, false);
          landscapeTile.updatePixelXY();
        }
        if (map[2][j + columns * i] === WaterFlowType.RIVER) {
          // get directions for this tile
          let directions = riverTileDirections.get(Utils.coordinateToKey(tileCoords));
          //console.log("round "+directions?.length+" at "+j+","+i);
          let layerIndex = 0;
          directions?.forEach((direction) => {
            // get base river tile index and add direction details
            let tileIndex = map[2][j + columns * i] - 1;
            switch(direction) {
              case Direction.NW: tileIndex+=5; break;
              case Direction.W: tileIndex+=4; break;
              case Direction.SW: tileIndex+=3; break;
              case Direction.SE: tileIndex+=2; break;
              case Direction.E: tileIndex+=1; break;
              case Direction.NE: break;
            }
            console.log("added river tile at "+j+","+i);
            // river layer
            let riverTile = this.riverLayer[layerIndex].putTileAt(tileIndex, j, i, false);
            riverTile.updatePixelXY();
            ++layerIndex;
          });
        }
        // add tiles to debug layer
        let index = 28;
        switch(map[2][j + columns * i]) {
          //case: WaterFlowType.RIVER:
          case WaterFlowType.RIVERBED: index = 27; break;
          case WaterFlowType.NONE: index = 26; break;
        }
        let debugTile = this.riverDebugLayer.putTileAt(index, j, i, false);
        debugTile.updatePixelXY();
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
        const tile = this.terrainLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
        if (tile) {
          const cubeCoords = this.pathFinder.offsetToCube({ x: tile.x, y: tile.y });

          // move unit
          if (
            this.lastClickedTile !== undefined &&
            this.lastSelectedUnitId !== undefined &&
            this.pathTiles.length > 0 &&
            this.lastClickedTile.q === cubeCoords.q &&
            this.lastClickedTile.r === cubeCoords.r &&
            this.lastClickedTile.s === cubeCoords.s
          ) {
            // update position for unit manager
            const success = this.unitManager.moveUnitByPath(this.lastSelectedUnitId, this.pathTiles);
            if (success) {
              // update position of display
              let unit = this.unitManager.getUnitById(this.lastSelectedUnitId) as unknown as Unit;
              unit.x = tile.pixelX + this.tileWidth / 2;
              unit.y = tile.pixelY + this.tileHeight / 2;
              this.lastSelectedUnitId = undefined;
              this.lastClickedTile = undefined;
              this.lastSelectedUnit = undefined;
              // update unit UI
              const uiComponent = this.components.findComponent(unit, UnitUIComponent) as UnitUIComponent;
              if (uiComponent) {
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
          if (units.length > 0) {
            this.lastSelectedUnitId = units[0].unitId ?? undefined;
            this.lastSelectedUnit = units[0] as unknown as Unit;
          }

          if (units.length === 0) {
            if (this.menu) {
              const resources = this.resourceManager.getResources(cubeCoords);
              let resourceString: string = '';
              if (resources != undefined) {
                resources.forEach((resource) => {
                  switch (resource.type) {
                    case ResourceType.FOOD:
                      resourceString = resourceString + ' food: ' + resource.amount;
                      break;
                    case ResourceType.GOLD:
                      resourceString = resourceString + ' gold: ' + resource.amount;
                      break;
                    case ResourceType.PRODUCTION:
                      resourceString = resourceString + ' prod: ' + resource.amount;
                      break;
                  }
                });
              }
              // temorarily disabled
              // TODO
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
                  tile.index +
                  ' Resources: ' +
                  resourceString +
                  ' Water Status: ' + 
                  map[2][tile.x + columns * tile.y],
              );
            }
          } else {
            let reachablePath = true;
            // select unit a second time with shown path -> remove path
            if (this.movementRenderer.isVisible()) {
              this.pathTiles = [];
              this.movementRenderer.reset();
              reachablePath = false;
            }
            // compute reachable tiles and render them
            if (this.pathTiles.length == 0 && reachablePath && this.lastSelectedUnit !== undefined) {
              this.reachableTiles = this.pathFinder.reachableTiles(
                cubeCoords,
                this.lastSelectedUnit.unitMovement,
                this.lastSelectedUnit.unitLayer,
              );
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
              } /* else {
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
    let tankCoordinate = { q: 0, r: 0, s: 0 };
    let tankCoordinateOffset = { x: 0, y: 0 };
    let settlerCoordinate = { q: 0, r: 0, s: 0 };
    let settlerCoordinateOffset = { x: 0, y: 0 };
    let shipCoordinate = { q: 0, r: 0, s: 0 };
    let shipCoordinateOffset = { x: 0, y: 0 };
    let planeCoordinate = { q: 0, r: 5, s: -5 };
    let cityCoordinate = { q: 0, r: 0, s: 0 };
    let cityCoordinateOffset = { x: 0, y: 0 };
    for (let i = 5; i < 20; ++i) {
      for (let j = 5; j < 20; ++j) {
        if (settlerCoordinate.q === 0) {
          if (
            map[0][i * columns + j] !== TerrainType.DEEP_WATER &&
            map[0][i * columns + j] !== TerrainType.SHALLOW_WATER &&
            map[0][i * columns + j] !== TerrainType.MOUNTAIN
          ) {
            settlerCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            settlerCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if (tankCoordinate.q === 0) {
          if (
            map[0][i * columns + j] !== TerrainType.DEEP_WATER &&
            map[0][i * columns + j] !== TerrainType.SHALLOW_WATER &&
            map[0][i * columns + j] !== TerrainType.MOUNTAIN
          ) {
            tankCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            tankCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if (shipCoordinate.q === 0) {
          if (
            map[0][i * columns + j] === TerrainType.DEEP_WATER ||
            map[0][i * columns + j] === TerrainType.SHALLOW_WATER
          ) {
            shipCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            shipCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if (cityCoordinate.q === 0) {
          if (
            map[0][i * columns + j] !== TerrainType.DEEP_WATER &&
            map[0][i * columns + j] !== TerrainType.SHALLOW_WATER &&
            map[0][i * columns + j] !== TerrainType.MOUNTAIN
          ) {
            cityCoordinate = this.pathFinder.offsetToCube({ x: j, y: i });
            cityCoordinateOffset = { x: j, y: i };
            continue;
          }
        }
        if (tankCoordinate.q !== 0 && shipCoordinate.q !== 0 && cityCoordinate.q !== 0) {
          break;
        }
      }
    }

    // create example units
    this.createUnit(tankCoordinate, tankCoordinateOffset, 'tank', this.playerId, 3, UnitType.WARRIOR, Layers.LAND);
    this.createUnit(
      settlerCoordinate,
      settlerCoordinateOffset,
      'settler',
      this.playerId,
      5,
      UnitType.SETTLER,
      Layers.LAND,
    );
    this.createUnit(shipCoordinate, shipCoordinateOffset, 'ship', this.playerId, 5, UnitType.WARRIOR, Layers.SEA);
    this.createUnit(planeCoordinate, { x: 2, y: 5 }, 'plane', this.playerId, 8, UnitType.WARRIOR, Layers.AIR);

    // create cities
    this.createCity(cityCoordinate, cityCoordinateOffset, 'Vienna', this.playerId);
    let newCityCoordinate = { q: cityCoordinate.q + 3, r: cityCoordinate.r + 1, s: cityCoordinate.s - 3 };
    let newCityCoordinateOffset = this.pathFinder.cubeToOffset(newCityCoordinate);
    this.createCity(newCityCoordinate, newCityCoordinateOffset, 'Salzburg', this.playerId);

    // listen to events
    eventsCenter.on('debugModeToggle', () => {
      this.debugMode = !this.debugMode;
      this.riverDebugLayer.visible = this.debugMode;
    });
  }

  update(time: number, delta: number) {
    this.controls.update(delta);

    // get the world point of pointer
    const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    // get the tile under the curser (can be null if outside map)
    const tile = this.terrainLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
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
      this.growCity(1); // growCity with 1 (first city);
    }
    if (code === Phaser.Input.Keyboard.KeyCodes.C) {
      this.settlerToCity(2); // createcity with 2 (unitId of settler)
    }
    if (code === Phaser.Input.Keyboard.KeyCodes.D) {
      eventsCenter.emit('debugModeToggle');
    }
  }

  private createUnit(
    coordinate: { q: number; r: number; s: number },
    offsetCoordinate: { x: number; y: number },
    unitName: string,
    playerId: number,
    movementPoints: number,
    unitType: UnitType,
    layer: number,
  ) {
    let tankTile = this.terrainLayer.getTileAt(offsetCoordinate.x, offsetCoordinate.y);
    const unit = new Unit(
      this,
      tankTile.pixelX + this.tileWidth / 2,
      tankTile.pixelY + this.tileHeight / 2,
      unitName,
    ).setInteractive(new Phaser.Geom.Circle(16, 17, 16), Phaser.Geom.Circle.Contains);
    unit.unitType = unitType;
    unit.unitLayer = layer;
    unit.unitPosition = coordinate;
    unit.unitPlayer = playerId;
    unit.unitMaxHealth = 100;
    unit.unitHealth = unit.unitMaxHealth;
    unit.unitMaxMovement = movementPoints;
    unit.unitMovement = unit.unitMaxMovement;
    if (this.unitManager.createUnit(unit)) {
      console.log(`${unitType} created (${unit.unitProductionCost}, ${unit.unitPurchaseCost})`);
    }
    this.children.add(unit);
    this.components.addComponent(
      unit,
      new UnitUIComponent(
        this.add.image(0, 0, 'bar-horizontal-green'),
        this.add.image(0, 0, 'bar-horizontal-orange'),
        this.add.image(0, 0, 'bar-horizontal-background'),
      ),
    );
  }

  private createCity(
    coordinate: { q: number; r: number; s: number },
    offsetCoordinate: { x: number; y: number },
    cityName: string,
    playerId: number,
  ) {
    let cityTile = this.terrainLayer.getTileAt(offsetCoordinate.x, offsetCoordinate.y);
    const city = new City(
      this,
      cityTile.pixelX + this.tileWidth / 2,
      cityTile.pixelY + this.tileHeight / 2,
      'city',
    ).setInteractive(new Phaser.Geom.Circle(16, 17, 16), Phaser.Geom.Circle.Contains);
    city.cityPlayer = playerId;
    city.cityPosition = coordinate;
    city.cityPositionPixel = { x: cityTile.pixelX, y: cityTile.pixelY };
    city.cityName = cityName;
    // initialize city tiles
    city.cityTiles = [];
    city.cityTilesPixel = [];
    const neighbors = this.pathFinder.neighborTiles(city.cityPosition);
    neighbors.forEach((neighbor) => {
      const tilePositionOffset = this.pathFinder.cubeToOffset(neighbor);
      const tilePixel = this.terrainLayer.getTileAt(tilePositionOffset.x, tilePositionOffset.y);
      city.cityTiles.push(neighbor);
      city.cityTilesPixel.push({ x: tilePixel.pixelX, y: tilePixel.pixelY });
    });
    city.cityBorders = [];
    if (this.cityManager.createCity(city)) {
      console.log(cityName + ' created');
    }
    //compute city borders
    this.cityManager.createCityBorders(city.cityPlayer, this.tileWidth, this.tileHeight);
    this.children.add(city);
    this.components.addComponent(
      city,
      new CityUIComponent(city, { x: cityTile.pixelX - 2, y: cityTile.pixelY + this.tileHeight - 4 }),
    );
  }

  private growCity(cityId: number) {
    const city = this.cityManager.getCityById(cityId) as City;
    if (city === undefined) {
      return;
    }
    // add a random new neighbor tile
    let tileAdded = false;
    for (let i = 0; i < city.cityTiles.length; ++i) {
      // find neighbor tiles
      const neighbors = this.pathFinder.neighborTiles(city.cityTiles[i]);
      for (let j = 0; j < neighbors.length; ++j) {
        const tilePositionOffset = this.pathFinder.cubeToOffset(neighbors[j]);
        const tilePixel = this.terrainLayer.getTileAt(tilePositionOffset.x, tilePositionOffset.y);
        tileAdded = this.cityManager.addCityTile(city.cityId, neighbors[j], {
          x: tilePixel.pixelX,
          y: tilePixel.pixelY,
        });
        if (tileAdded) {
          break;
        }
      }
      if (tileAdded) {
        break;
      }
    }
    if (tileAdded) {
      this.updateCityBorders();
    }
  }

  private updateCityBorders() {
    const cities = this.cityManager.getCitiesOfPlayer(this.playerId) as City[];
    //compute city borders
    this.cityManager.createCityBorders(this.playerId, this.tileWidth, this.tileHeight);
    // update city UI for each city
    cities.forEach((city) => {
      const uiComponent = this.components.findComponent(city, CityUIComponent) as CityUIComponent;
      if (uiComponent) {
        uiComponent.updateBorders();
      }
    });
  }

  private settlerToCity(unitId: number) {
    const settler = this.unitManager.getUnitById(unitId) as Unit;
    if (settler === undefined) {
      console.log('Unit not found');
      return;
    }
    if (settler.unitType !== UnitType.SETTLER) {
      console.log('Unit is not a settler');
      return;
    }
    const settlerCoordinate = settler.unitPosition;
    const settlerOffsetCoordinate = this.pathFinder.cubeToOffset(settlerCoordinate);
    // remove settler unit
    this.unitManager.removeUnit(settler.unitId);
    // remove settler UI
    this.components.destroyComponent(settler, UnitUIComponent);
    // remove settler game object
    settler.destroy();
    // create city
    this.createCity(settlerCoordinate, settlerOffsetCoordinate, 'Graz', this.playerId);
    this.updateCityBorders();
  }
}
