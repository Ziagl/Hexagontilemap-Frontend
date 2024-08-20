import { Scene } from 'phaser';
import { CubeCoordinates } from 'honeycomb-grid';
import { ICity } from '@ziagl/tiled-map-cities/lib/main/interfaces/ICity';
import { ILine } from '@ziagl/tiled-map-cities/lib/main/interfaces/ILine';
import { IPoint } from '@ziagl/tiled-map-cities/lib/main/interfaces/IPoint';

export class City extends Phaser.GameObjects.Image implements ICity {
  constructor(scene: Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    this.depth = 800;
    // TODO
  }

  // properties from IUnit
  cityId: number;
  cityPlayer: number;
  cityName: string;
  cityPosition: CubeCoordinates;
  cityTiles: CubeCoordinates[];
  cityPositionPixel: IPoint;
  cityTilesPixel: IPoint[];
  cityBorders: ILine[];
}
