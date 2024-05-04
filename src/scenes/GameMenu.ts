import { Scene } from 'phaser';

export class GameMenu extends Scene
{
    private tileMenu: Phaser.GameObjects.Container;
    private background = 'background';

    constructor ()
    {
        super('GameMenu');
    }

    init()
    {
        // TODO
    }

    preload()
    {
        // menu
        this.load.image(this.background, 'assets/ui/panel_brown.png');
    }

    create()
    {
        // create menu container
        this.tileMenu = this.add.container(0, 0);
        const backgroundImage = this.add.image(0, 0, this.background)
                                        .setOrigin(0, 0)
                                        .setDisplaySize(50, 50);
        this.tileMenu.add(backgroundImage);
        this.tileMenu.visible = false
    }

    update()
    {
        // TODO
    }

    public setMenuVisible(value:boolean)
    {
        this.tileMenu.visible = value;
    }
}