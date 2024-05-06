import * as tiled from '@kayahr/tiled';

export class Generator
{
    private readonly templateFileName = 'assets/hexagonal.json';

    constructor()
    {
    }

    public async generate()
    {
        // load template
        const response = await fetch(this.templateFileName);
        let mainMap = (await response.json()) as tiled.Map;
        let layers = mainMap.layers;

        // TODO

        // export
        const json = JSON.stringify(mainMap);
    }
}