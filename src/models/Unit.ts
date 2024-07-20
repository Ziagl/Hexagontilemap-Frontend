import { Scene } from 'phaser';
import { IUnit } from '@ziagl/tiled-map-units';
import { CubeCoordinates } from 'honeycomb-grid';

export class Unit extends Phaser.GameObjects.Image implements IUnit {
  constructor(scene: Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // TODO
  }

  // properties from IUnit
  unitId: number;
  unitPosition: CubeCoordinates;
  unitLayer: number;
  unitPlayer: number;
  unitType: number;
  unitHealth: number;
  unitMaxHealth: number;
  unitMovement: number;
  unitAttack: number;
  unitDefense: number;
  unitRange: number;
  canAttack: boolean;
  canMove: boolean;
}
