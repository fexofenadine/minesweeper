//#region src/storage.js?raw
var storage_default = "//saved settings that fall back to defaults when a browser blocks site storage\nexport const load = (key) => {\n  try {\n    return localStorage.getItem(key)\n  } catch {\n    return null\n  }\n}\n\nexport const save = (key, value) => {\n  try {\n    localStorage.setItem(key, value)\n  } catch {\n    //settings just are not remembered\n  }\n}\n\nexport const remove = (key) => {\n  try {\n    localStorage.removeItem(key)\n  } catch {\n    //nothing was stored\n  }\n}\n";
//#endregion
export { storage_default as default };
