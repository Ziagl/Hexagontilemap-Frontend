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

        // create menu buttons
        let sizeButtons:Phaser.GameObjects.Image[] = [];
        let lastHeight = 100;
        let index = 0;
        for (let key of Object.keys(MapSize)) {
            if (key.length > 1) {
                lastHeight = lastHeight + buttonHeight;
                const sizeButton = this.add.image((this.scale.width * 0.5) - buttonWidth, lastHeight, this.buttonPanel)
                                        .setDisplaySize(buttonWidth, buttonHeight);
                this.add.text(sizeButton.x, sizeButton.y, key)
                        .setOrigin(0.5);
                sizeButtons.push(sizeButton);
                ++index;
            }
        }

        let typeButtons:Phaser.GameObjects.Image[] = [];
        lastHeight = 100;
        index = 0;
        for (let key of Object.keys(MapType)) {
            if (key.length > 1) {
                lastHeight = lastHeight + buttonHeight;
                const typeButton = this.add.image((this.scale.width * 0.5) + buttonWidth, lastHeight, this.buttonPanel)
                                        .setDisplaySize(buttonWidth, buttonHeight);
                this.add.text(typeButton.x, typeButton.y, key)
                        .setOrigin(0.5);
                typeButtons.push(typeButton);
                --index;
            }
        }

        const mainMenuButton = this.add.image((this.scale.width * 0.5) - buttonWidth, lastHeight, this.buttonPanel)
                                      .setDisplaySize(buttonWidth, buttonHeight);
        this.add.text(mainMenuButton.x, mainMenuButton.y, 'Main Menu')
                .setOrigin(0.5);

        // click events for cursor or touch input
        if(this.isDesktop || this.isAndroid)
        {
            sizeButtons.forEach((button, index) => {
                button.setInteractive()
                .on('pointerup', () => {
                    button.setTint(this.buttonColorHover);
                    const tempButton = this.buttons[index];
                    tempButton.emit('selected');
                })
                .on('pointerdown', () => {
                    button.setTint(this.buttonColorClick);
                });
            });
            typeButtons.forEach((button, index) => {
                button.setInteractive()
                .on('pointerup', () => {
                    button.setTint(this.buttonColorHover);
                    const tempButton = this.buttons[sizeButtons.length + index];
                    tempButton.emit('selected');
                })
                .on('pointerdown', () => {
                    button.setTint(this.buttonColorClick);
                });
            });
            mainMenuButton.setInteractive()
                .on('pointerup', () => {
                    mainMenuButton.setTint(this.buttonColorHover);
                    const button = this.buttons[sizeButtons.length + typeButtons.length];
                    button.emit('selected');
                })
                .on('pointerdown', () => {
                    mainMenuButton.setTint(this.buttonColorClick);
                });
        }
        // hover events only make sense with a cursor
        if(this.isDesktop)
        {
            sizeButtons.forEach(button => {
                button.setInteractive()
                .on('pointerover', () => {
                    button.setTint(this.buttonColorHover);
                })
                .on('pointerout', () => {
                    button.setTint(this.buttonColorDefault);
                }); 
            });
            typeButtons.forEach(button => {
                button.setInteractive()
                .on('pointerover', () => {
                    button.setTint(this.buttonColorHover);
                })
                .on('pointerout', () => {
                    button.setTint(this.buttonColorDefault);
                }); 
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
        sizeButtons.forEach(button => {
            this.buttons.push(button);
        });
        typeButtons.forEach(button => {
            this.buttons.push(button);
        });
        this.buttons.push(mainMenuButton);

        sizeButtons.forEach((button, index) => {
            button.on('selected', () => {
                // @ts-ignore
                this.gameData.mapSize = index + 1;
                // @ts-ignore
                console.log('set MapSize to ', MapSize[(index + 1) as keyof typeof MapSize].toString());
            });
        });
        typeButtons.forEach((button, index) => {
            button.on('selected', () => {
                // @ts-ignore
                this.gameData.mapType = index + 1;
                // @ts-ignore
                console.log('set MapType to ', MapType[(index + 1) as keyof typeof MapType].toString());
            });
        });
        mainMenuButton.on('selected', () => {
            console.log('mainMenu');
            this.scene.start('MainMenu');
        });

        // remember to clean up on Scene shutdown
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            sizeButtons.forEach(button => {
                button.off('selected');
            });
            typeButtons.forEach(button => {
                button.off('selected');
            });
            mainMenuButton.off('selected');
        });
    }

    update()
    {
        // TODO
    }
}