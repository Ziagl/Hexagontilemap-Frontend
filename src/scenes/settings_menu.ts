import { MapSize, MapType } from '@ziagl/tiled-map-generator';
import { Scene } from 'phaser';

export class SettingsMenu extends Scene
{
    private isDesktop = false;
    private isAndroid = false;
    private buttons: Phaser.GameObjects.Image[] = [];
    private buttonPanel = 'brown-panel';
    private buttonColorDefault = 0xffffff;
    private buttonColorHover = 0x66ff7f;
    private buttonColorClick = 0xff0000;

    constructor ()
    {
        super('SettingsMenu');

        //this.data.set('MapSize', MapSize.SMALL);
        //this.data.set('MapType', MapType.CONTINENTS);
    }

    init()
    {
        this.isDesktop = this.sys.game.device.os.desktop;
        this.isAndroid = this.sys.game.device.os.android;
    }

    preload()
    {
        this.load.image(this.buttonPanel, 'assets/ui/panel_brown.png');

        // if there is a mouse cursor, change it
        if(this.isDesktop)
        {
            this.input.setDefaultCursor('url(assets/ui/cursorHand_grey.png), pointer');
        }
    }

    create()
    {
        const buttonWidth = this.scale.width / 7;
        const buttonHeight = buttonWidth / 3;
        const buttonOffset = buttonHeight / 2;

        // create menu buttons
        const playButton = this.add.image((this.scale.width * 0.5), (this.scale.height * 0.5) - ((buttonHeight * 3) / 2), this.buttonPanel)
                                    .setDisplaySize(buttonWidth, buttonHeight);
        for (let key of Object.keys(MapSize)) {
            //const playButton = this.add.image((this.scale.width * 0.5), (this.scale.height * 0.5) - ((buttonHeight * 3) / 2), this.buttonPanel)
            //                        .setDisplaySize(buttonWidth, buttonHeight);
            this.add.text(playButton.x, playButton.y, key)
                    .setOrigin(0.5);
            break;
        }

        const settingsButton = this.add.image(playButton.x, playButton.y + playButton.displayHeight + buttonOffset, this.buttonPanel)
                                       .setDisplaySize(buttonWidth, buttonHeight);
        this.add.text(settingsButton.x, settingsButton.y, 'Settings')
                .setOrigin(0.5);

        const mainMenuButton = this.add.image(settingsButton.x, settingsButton.y + settingsButton.displayHeight + buttonOffset, this.buttonPanel)
                                      .setDisplaySize(buttonWidth, buttonHeight);
        this.add.text(mainMenuButton.x, mainMenuButton.y, 'Main Menu')
                .setOrigin(0.5);

        // click events for cursor or touch input
        if(this.isDesktop || this.isAndroid)
        {
            playButton.setInteractive()
                .on('pointerup', () => {
                    playButton.setTint(this.buttonColorHover);
                    const button = this.buttons[0];
                    button.emit('selected');
                })
                .on('pointerdown', () => {
                    playButton.setTint(this.buttonColorClick);
                });
            settingsButton.setInteractive()
                .on('pointerup', () => {
                    settingsButton.setTint(this.buttonColorHover);
                    const button = this.buttons[1];
                    button.emit('selected');
                })
                .on('pointerdown', () => {
                    settingsButton.setTint(this.buttonColorClick);
                });
            mainMenuButton.setInteractive()
                .on('pointerup', () => {
                    mainMenuButton.setTint(this.buttonColorHover);
                    const button = this.buttons[2];
                    button.emit('selected');
                })
                .on('pointerdown', () => {
                    mainMenuButton.setTint(this.buttonColorClick);
                });
        }
        // hover events only make sense with a cursor
        if(this.isDesktop)
        {
            playButton.setInteractive()
                .on('pointerover', () => {
                    playButton.setTint(this.buttonColorHover);
                })
                .on('pointerout', () => {
                    playButton.setTint(this.buttonColorDefault);
                });
            settingsButton.setInteractive()
                .on('pointerover', () => {
                    settingsButton.setTint(this.buttonColorHover);
                })
                .on('pointerout', () => {
                    settingsButton.setTint(this.buttonColorDefault);
                });
            mainMenuButton.setInteractive()
                .on('pointerover', () => {
                    mainMenuButton.setTint(this.buttonColorHover);
                })
                .on('pointerout', () => {
                    mainMenuButton.setTint(this.buttonColorDefault);
                });
        }

        this.buttons = [];
        this.buttons.push(playButton);
        this.buttons.push(settingsButton);
        this.buttons.push(mainMenuButton);

        playButton.on('selected', () => {
            console.log('play');
            this.scene.start('Game');
        });
        settingsButton.on('selected', () => {
            console.log('settings');
        });
        mainMenuButton.on('selected', () => {
            console.log('mainMenu');
            this.scene.start('MainMenu');
        });

        // remember to clean up on Scene shutdown
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            playButton.off('selected');
            settingsButton.off('selected');
            mainMenuButton.off('selected');
        });
    }

    update()
    {
        // TODO
    }
}