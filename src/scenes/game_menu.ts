import { Scene } from 'phaser';
import { Game } from './game';
import eventsCenter from '../services/EventService';

enum Tilenames {
  DEEP_WATER = 'Deep water',
  SHALLOW_WATER = 'Shallow water',
  DESERT = 'Desert',
  DESERT_HILLS = 'Desert Hills',
  PLAIN = 'Plain',
  PLAIN_HILLS = 'Plain Hills',
  GRASS = 'Grass',
  GRASS_HILLS = 'Grass Hills',
  TUNDRA = 'Tundra',
  TUNDRA_HILLS = 'Tundra Hills',
  SNOW = 'Snow',
  SNOW_HILLS = 'Snowy Hills',
  MOUNTAIN = 'Mountain',
}

export class GameMenu extends Scene {
  private tileMenu: Phaser.GameObjects.Container;
  private background = 'background';
  private tileImage: Phaser.GameObjects.Image;
  private tileName: Phaser.GameObjects.DOMElement;
  private tileInformation: Phaser.GameObjects.DOMElement;
  private style: any;

  private buttonColorDefault = 0xffffff;
  private buttonColorHover = 0x66ff7f;
  private buttonColorClick = 0xff0000;

  constructor() {
    super('GameMenu');
  }

  init() {
    // initialize style
    this.style = {
      width: '380px',
      height: this.scale.height - 100 + 'px',
      font: '48px Arial',
      color: '#000000',
      'text-align': 'center',
    };
  }

  preload() {
    // menu
    this.load.image(this.background, 'assets/ui/panel_brown.png');
    // tile array
    for (let i = 1; i < 14; ++i) {
      this.load.image('tile_' + i, 'assets/tile_' + i + '.png');
    }
  }

  create() {
    const mapButtonWidth = this.scale.width / 15;
    const mapButtonHeight = mapButtonWidth / 3;

    // create tile menu container
    this.tileMenu = this.add.container(0, 0);
    const backgroundImage = this.add
      .image(this.scale.width, 0, this.background)
      .setOrigin(1, 0)
      .setDisplaySize(400, this.scale.height);
    this.tileMenu.add(backgroundImage);
    this.tileName = this.add
      .dom(this.scale.width - 20, 50, 'div', this.style, 'Test das it ein ganz langer text')
      .setOrigin(1, 0);
    this.tileMenu.add(this.tileName);
    this.tileImage = this.add
      .image(this.scale.width - 20, 170, 'none')
      .setOrigin(1, 0)
      .setDisplaySize(360, 360);
    this.tileMenu.add(this.tileImage);
    this.tileInformation = this.add
      .dom(this.scale.width - 20, 600, 'div', this.style, 'Test das it ein ganz langer text')
      .setOrigin(1, 0);
    this.tileMenu.add(this.tileInformation);
    this.tileMenu.visible = false;

    // create map buttons
    // create debug button
    const debugButton = this.add
      .image(mapButtonWidth * 0.5, this.scale.height - 290, this.background)
      .setDisplaySize(mapButtonWidth, mapButtonHeight);
    this.add.text(debugButton.x, debugButton.y, 'Debug').setOrigin(0.5);
    // add style
    debugButton
      .setInteractive()
      .on('pointerup', () => {
        debugButton.setTint(this.buttonColorHover);
        debugButton.emit('selected');
      })
      .on('pointerdown', () => {
        debugButton.setTint(this.buttonColorClick);
      })
      .on('pointerover', () => {
        debugButton.setTint(this.buttonColorHover);
      })
      .on('pointerout', () => {
        debugButton.setTint(this.buttonColorDefault);
      });
    // add events
    debugButton.on('selected', () => {
      console.log('Debug button clicked');
      // create debugModeToggle event
      eventsCenter.emit('debugModeToggle');
    });
  }

  update() {
    // TODO
  }

  public setMenuVisible(value: boolean) {
    this.tileMenu.visible = value;
  }

  public setTileImage(value: number) {
    // swaps image and destoys old one
    const image = this.add
      .image(this.scale.width - 20, 170, 'tile_' + value)
      .setOrigin(1, 0)
      .setDisplaySize(360, 360);
    this.tileMenu.replace(this.tileImage, image, true);
    this.tileImage = image;
    const tileName = this.add
      .dom(this.scale.width - 20, 50, 'div', this.style, Object.values(Tilenames)[value - 1])
      .setOrigin(1, 0);
    this.tileMenu.replace(this.tileName, tileName, true);
    this.tileName = tileName;
  }

  public setTileInformation(value: string) {
    this.tileInformation.setText(value);
  }
}
