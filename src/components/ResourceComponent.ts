import { Resource } from '@ziagl/tiled-map-resources';
import { IComponent } from '../interfaces/IComponent';

export default class ResourceComponent implements IComponent {
  private readonly resourceColors: number[] = [0x41a71a, 0xeb7400, 0xf7ce2b];
  private readonly resourceAlpha = 1.0;

  private gameObject: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  private rescourceMarkers: Phaser.GameObjects.Graphics[] = [];

  private tilePosition: { x: number; y: number };
  private tileResources: Resource[] = [];

  constructor(tilePosition: { x: number; y: number }, tileResources: Resource[]) {
    this.tilePosition = tilePosition;
    this.tileResources = tileResources;
  }

  init(go: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform): void {
    this.gameObject = go;
  }

  start(): void {
    // get scene object and create bar
    const { scene } = this.gameObject;

    if(this.tileResources.length == 0) {
        return;
    }

    let startPositions = [{x: 14, y: 20}];
    switch(this.tileResources.length) {
        case 1:
            break;
        case 2: 
            startPositions = [{x: 10, y: 20}, {x: 18, y: 20}];
            break;
        case 3: 
            startPositions = [{x: 5, y: 20}, {x: 14, y: 20}, {x: 23, y: 20}];
            break;
    }

    for(let i = 0; i < this.tileResources.length; ++i) {
        const positionOffset = [{x:0, y:0}, {x:4, y:0}, {x:0, y:4}, {x:4, y:0}];
        for(let j = 0; j < this.tileResources[i].amount; ++j) {
            this.addResource(scene, this.tileResources[i].type, {x: startPositions[i].x + positionOffset[j].x, y: startPositions[i].y + positionOffset[j].y});
        }
    }
  }

  private addResource(scene: Phaser.Scene, color: number, position: {x: number, y:number}) {
    let resourceMarker = scene.add.graphics();
    resourceMarker.fillStyle(this.resourceColors[color - 1], this.resourceAlpha);
    resourceMarker.fillCircle(position.x, position.y, 2);
    resourceMarker.x = this.tilePosition.x;
    resourceMarker.y = this.tilePosition.y;
    resourceMarker.alpha = this.resourceAlpha;
    this.rescourceMarkers.push(resourceMarker);
  }
}


