const Exponent = function() {

  // 'overrideable' user settings
  this.settings = {
    mode: 'development',
    componentSelector: 'component',
    uiSelector: 'ui',
    controlSelector: 'control',
  };

  // all the registered components
  this.registry = {};

  // all the mounted components (dangling from the DOM Tree!)
  this.mounted = [];

  // arrays of functions to plug into the object injected into every component
  this.middlewares = [];

  /**
   * * Public Functions for frontend devs
   */

  this.configure = function(settings) {
    this.settings = { ...this.settings, ...settings };

    return this;
  }

  this.use = function(middlewares) {
    this.middlewares = this.middlewares.concat(middlewares);

    return this;
  }

  this.register = function(components) {
    this.registry = { ...this.registry, ...components };

    return this;
  }

  this.autoload = function(components) {
    components.map(c => {
      const { Component, props } = this.withMiddlewares(c);

      return Component(props); // augment with middlewares
    });

    return this;
  }

  /**
   * * Internal functions for the courageous few
   */

  this.mount = function(element) {
    this.handleComponentMount(element);

    const childrenComponents = this.findChildrenComponents(element);
    const children = this.filterFirstDepthChildren(childrenComponents);

    if (!children.length) return;

    children.map(child => this.handleComponentMount(child) ); // begin loop

    return this;
  }

  this.handleComponentMount = (element) => {
    if (!element.dataset) return;

    const attr = element.dataset[this.settings.componentSelector];
    const componentIds = attr.split(',').map(str => str.trim() );

    if (!componentIds.length) return;

    element.dataset.status = 'loading';

    const instances = componentIds.map(id => {
      const Component = this.registry[id];
      if (!Component) return;

      return this.mountComponentOnElement(Component, id, element);
    });

    return instances;
  }

  this.unmountComponents = function() {
    this.mounted.map( unmount => unmount() );
    this.mounted = [];
  }

  this.mountComponentOnElement = (componentFn, id, element) => {
    const { uiSelector, controlSelector } = this.settings;
    const childrenComponents = this.findChildrenComponents(element);
    const ui = this.getComponentUIElements(element, childrenComponents);
    const controls = this.getComponentControlElements(element, childrenComponents);
    const children = this.findAndMountChildrenComponents(childrenComponents);

    const defaultProps = {
      id,
      element,
      [uiSelector]: ui,
      [controlSelector]: controls,
      children,
    };

    const { Component, props } = this.withMiddlewares(componentFn, defaultProps);
    const ComponentInstance = Component(props);

    this.mounted.push( ComponentInstance );

    element.dataset.status = 'loaded';

    return ComponentInstance;
  }

  this.findAndMountChildrenComponents = function(childrenComponents) {
    const directChildren = this.filterFirstDepthChildren(childrenComponents);
    let children = [];

    directChildren.forEach(child => {
      const ComponentInstances = this.handleComponentMount(child);
      children = children.concat( ComponentInstances );
    });

    return children;
  }

  this.withMiddlewares = (Component, props = {}) => {
    const augmentedProps = this.middlewares.reduce(
      (props, fn) => {
        return fn({Component, props});
      },
      props
    );

    return {
      Component,
      props: augmentedProps
    };
  }

  this.findChildrenComponents = function(element) {
    const componentDataSelector = this.getSelector(this.settings.componentSelector);
    const children = element.querySelectorAll(componentDataSelector);

    return children;
  }

  this.findShallowChildrenComponents = function(element) {
    return this.filterFirstDepthChildren( this.findChildrenComponents(element) );
  }

  this.filterFirstDepthChildren = function(children) {
   const matches = [];

    children.forEach((child, i) => {
      if (i === 0) return matches.push(child); // push the first you find, it must be a direct descendant

      let nested = false;

      matches.forEach(match => {
        if ( match.contains(child) ) {
          nested = true;
        }
      });

      if (!nested) matches.push(child);
    });

    return matches;
  }

  this.findChildrenElements = function(selector, element, childrenComponents) {
    const children = [];
    const childrenElements = element.querySelectorAll(selector);

    childrenElements.forEach(childElement => {
      let isNested = false;

      childrenComponents.forEach(childComponent => {
        if ( childComponent.contains(childElement) ) {
          isNested = true;
        }
      });

      if (isNested) return;

      children.push(childElement);
    });

    return children;
  }

  this.getComponentUIElements = function(element, childrenComponents) {
    const ui = {};
    const selector = this.getSelector(this.settings.uiSelector);
    const children = this.findChildrenElements(selector, element, childrenComponents);

    children.forEach(el => ( ui[el.dataset[this.settings.uiSelector]] = el ) );

    return ui;
  }

  this.getComponentControlElements = function(element, childrenComponents) {
    const controls = {};
    const selector = this.getSelector(this.settings.controlSelector);
    const children = this.findChildrenElements(selector, element, childrenComponents);

    children.forEach(el => ( controls[el.dataset[this.settings.controlSelector]] = el ) );

    return controls;
  }

  this.getSelector = function(selector) {
    return `[data-${selector}]`;
  }
}

/**
 * And here we go!
 */
const ExponentApp = new Exponent();

// devmode
if (ExponentApp.settings.mode === 'development') window.Exponent = ExponentApp;

export default ExponentApp;
