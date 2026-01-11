// for importing .json files as modules
declare module '*.json' {
    const value: any;
    export default value;
  }