import { IComponent } from '../interfaces/IComponent';
import short from 'short-uuid';

export type Constructor<T extends {} = {}> = new (...args: any[]) => T;

export default class ComponentService {
  private componentsByGameObject = new Map<string, IComponent[]>();
  private queuedForStart: IComponent[] = [];

  addComponent(go: Phaser.GameObjects.GameObject, component: IComponent) {
    // generate a unique name for the game object if it doesn't have one
    if (!go.name) {
      go.name = short.generate();
    }
    // initialize empty list of components for the game object if it doesn't have one
    if (!this.componentsByGameObject.has(go.name)) {
      this.componentsByGameObject.set(go.name, []);
    }
    // add component to the list of components for the game object
    const list = this.componentsByGameObject.get(go.name) as IComponent[];
    list.push(component);
    // call lifecycle methods
    // init
    component.init(go);
    // awake
    if (component.awake) {
      component.awake();
    }
    // start
    if (component.start) {
      this.queuedForStart.push(component);
    }
  }

  findComponent<ComponentType>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const components = this.componentsByGameObject.get(go.name);
    if (!components) {
      return null;
    }

    return components.find((component) => component instanceof componentType);
  }

  destroyComponent<ComponentType>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const component = this.findComponent(go, componentType);
    if (component && component.destroy) {
      component.destroy();
    } else {
      console.warn(`Component ${componentType.name} not found on GameObject ${go.name}`);
    }
  }

  destroy() {
    // destroy each component
    const entires = this.componentsByGameObject.entries();
    for (const [, components] of entires) {
      components.forEach((component) => {
        if (component.destroy) {
          component.destroy();
        }
      });
    }
  }

  update(dt: number) {
    // process queued start
    while (this.queuedForStart.length > 0) {
      const component = this.queuedForStart.shift() as IComponent;
      if (component?.start) {
        component.start!();
      }
    }
    // update each component
    const entires = this.componentsByGameObject.entries();
    for (const [, components] of entires) {
      components.forEach((component) => {
        if (component.update) {
          component.update(dt);
        }
      });
    }
  }
}
