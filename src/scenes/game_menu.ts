import { Scene } from 'phaser';

enum Tilenames
{
    Grass = 'Grassland',
    DeepWater = 'Deep water',
    Mountain = 'Mountain',
    Forest = 'Forest',
    Sand = 'Sand',
    Snow = 'Snow',
    Lake = 'Lake',
    ShallowWater = 'Shallow water',
    Reef = 'Reef'
};

export class GameMenu extends Scene
{
    private tileMenu: Phaser.GameObjects.Container;
    private background = 'background';
    private tileImage: Phaser.GameObjects.Image;
    private tileName: Phaser.GameObjects.DOMElement;
    private style: any;

    constructor ()
    {
        super('GameMenu');
    }

    init()
    {
        // initialize style
        this.style = {
            width: '380px',
            height: (this.scale.height - 100) + 'px',
            font: '48px Arial',
            color: '#000000',
            'text-align': 'center'
        };
    }

    preload()
    {
        // menu
        this.load.image(this.background, 'assets/ui/panel_brown.png');
        // tile array
        for(let i = 1; i < 10; ++i)
        {
            this.load.image('tile_' + i, 'assets/tile_' + i + '.png');
        }
    }

    create()
    {
        // create tile menu container
        this.tileMenu = this.add.container(0, 0);
        const backgroundImage = this.add.image(this.scale.width, 0, this.background)
                                        .setOrigin(1, 0)
                                        .setDisplaySize(400, this.scale.height);
        this.tileMenu.add(backgroundImage);
        this.tileName = this.add.dom(this.scale.width - 20, 50, 'div', this.style, 'Test das it ein ganz langer text')
                                 .setOrigin(1, 0);
        this.tileMenu.add(this.tileName);
        this.tileImage = this.add.image(this.scale.width - 20, 170, 'none')
                                  .setOrigin(1, 0)
                                  .setDisplaySize(360, 360);
        this.tileMenu.add(this.tileImage);
        this.tileMenu.visible = false;
    }

    update()
    {
        // TODO
    }

    public setMenuVisible(value: boolean)
    {
        this.tileMenu.visible = value;
    }

    public setTileImage(value: number)
    {
        // swaps image and destoys old one
        const image = this.add.image(this.scale.width - 20, 170, 'tile_' + value)
                        .setOrigin(1, 0)
                        .setDisplaySize(360, 360);
        this.tileMenu.replace(this.tileImage, image, true);
        this.tileImage = image;
        const tileName = this.add.dom(this.scale.width - 20, 50, 'div', this.style, Object.keys(Tilenames)[value - 1])
                            .setOrigin(1, 0);
        this.tileMenu.replace(this.tileName, tileName, true);
        this.tileName = tileName;
    }
}