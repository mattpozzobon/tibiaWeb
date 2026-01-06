/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./engine.ts":
/*!*******************!*\
  !*** ./engine.ts ***!
  \*******************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './src/Cgameserver'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\n/* harmony import */ var _src_helper_appContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./src/helper/appContext */ \"./src/helper/appContext.ts\");\n/* module decorator */ module = __webpack_require__.hmd(module);\n\n\nif (__webpack_require__.c[__webpack_require__.s] === module) {\n    console.log('Starting NodeJS Forby Open Tibia Server');\n    console.log('Creating server with version: ', _src_helper_appContext__WEBPACK_IMPORTED_MODULE_1__.CONFIG.SERVER.CLIENT_VERSION);\n    console.log('Setting data directory to ', (0,_src_helper_appContext__WEBPACK_IMPORTED_MODULE_1__.getDataFile)(''));\n    const gameServer = (0,_src_helper_appContext__WEBPACK_IMPORTED_MODULE_1__.initializeGameServer)(new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './src/Cgameserver'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(_src_helper_appContext__WEBPACK_IMPORTED_MODULE_1__.CONFIG));\n    gameServer.initialize();\n    console.log('GameServer initialized successfully!');\n}\n\n\n//# sourceURL=webpack:///./engine.ts?");

/***/ }),

/***/ "./src/helper/appContext.ts":
/*!**********************************!*\
  !*** ./src/helper/appContext.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   CONFIG: () => (/* binding */ CONFIG),\n/* harmony export */   CONST: () => (/* binding */ CONST),\n/* harmony export */   ITEM_TO_SPRITE: () => (/* binding */ ITEM_TO_SPRITE),\n/* harmony export */   ITEM_TO_SPRITE_BY_HAND: () => (/* binding */ ITEM_TO_SPRITE_BY_HAND),\n/* harmony export */   Print: () => (/* binding */ Print),\n/* harmony export */   getDataFile: () => (/* binding */ getDataFile),\n/* harmony export */   getGameServer: () => (/* binding */ getGameServer),\n/* harmony export */   getSpriteIdForItem: () => (/* binding */ getSpriteIdForItem),\n/* harmony export */   initializeGameServer: () => (/* binding */ initializeGameServer),\n/* harmony export */   requireModule: () => (/* binding */ requireModule)\n/* harmony export */ });\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _config_config_json__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../config/config.json */ \"./src/config/config.json\");\n/* harmony import */ var _config_constants_json__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../config/constants.json */ \"./src/config/constants.json\");\n/* harmony import */ var _config_itemToSprite_json__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../config/itemToSprite.json */ \"./src/config/itemToSprite.json\");\n\n\n\n\n/* ----------------------------------------------------\n   Helpers\n---------------------------------------------------- */\nfunction envStr(name) {\n    const v = process.env[name];\n    return v && v.trim().length ? v : undefined;\n}\nfunction envInt(name) {\n    const v = process.env[name];\n    if (!v)\n        return undefined;\n    const n = Number(v);\n    return Number.isFinite(n) ? n : undefined;\n}\n/* ----------------------------------------------------\n   Build CONFIG with env overrides\n---------------------------------------------------- */\nfunction buildConfig() {\n    var _a, _b, _c, _d, _e, _f, _g;\n    const cfg = JSON.parse(JSON.stringify(_config_config_json__WEBPACK_IMPORTED_MODULE_1__));\n    /* Login server */\n    cfg.LOGIN.HOST = (_a = envStr(\"LOGIN_HOST\")) !== null && _a !== void 0 ? _a : cfg.LOGIN.HOST;\n    cfg.LOGIN.PORT = (_b = envInt(\"LOGIN_PORT\")) !== null && _b !== void 0 ? _b : cfg.LOGIN.PORT;\n    /* Game server */\n    cfg.SERVER.HOST = (_c = envStr(\"SERVER_HOST\")) !== null && _c !== void 0 ? _c : cfg.SERVER.HOST;\n    cfg.SERVER.PORT = (_d = envInt(\"SERVER_PORT\")) !== null && _d !== void 0 ? _d : cfg.SERVER.PORT;\n    cfg.SERVER.EXTERNAL_HOST = (_e = envStr(\"EXTERNAL_HOST\")) !== null && _e !== void 0 ? _e : cfg.SERVER.EXTERNAL_HOST;\n    /* Database */\n    cfg.DATABASE.ACCOUNT_DATABASE =\n        (_f = envStr(\"ACCOUNT_DATABASE\")) !== null && _f !== void 0 ? _f : cfg.DATABASE.ACCOUNT_DATABASE;\n    /* Crypto */\n    cfg.HMAC.SHARED_SECRET =\n        (_g = envStr(\"HMAC_SHARED_SECRET\")) !== null && _g !== void 0 ? _g : cfg.HMAC.SHARED_SECRET;\n    return cfg;\n}\n/* ----------------------------------------------------\n   Exports\n---------------------------------------------------- */\nconst CONFIG = buildConfig();\nconst CONST = _config_constants_json__WEBPACK_IMPORTED_MODULE_2__;\n/* ----------------------------------------------------\n   Item → sprite lookup\n---------------------------------------------------- */\nconst ITEM_TO_SPRITE = _config_itemToSprite_json__WEBPACK_IMPORTED_MODULE_3__.items.reduce((acc, item) => {\n    acc[item.id] = item.sprite_id;\n    return acc;\n}, {});\nfunction getSpriteIdForItem(itemId, hand) {\n    // Prefer hand-aware mapping if available\n    const handMap = ITEM_TO_SPRITE_BY_HAND[itemId];\n    if (handMap) {\n        if (hand === \"left\" && typeof handMap.left === \"number\")\n            return handMap.left;\n        if (hand === \"right\" && typeof handMap.right === \"number\")\n            return handMap.right;\n        if (typeof handMap.default === \"number\")\n            return handMap.default;\n    }\n    // Fallback to generic mapping\n    return ITEM_TO_SPRITE[itemId] || null;\n}\nconst ITEM_TO_SPRITE_BY_HAND = _config_itemToSprite_json__WEBPACK_IMPORTED_MODULE_3__.items.reduce((acc, item) => {\n    const name = (item.name || \"\").toLowerCase();\n    const mapping = acc[item.id] || {};\n    const isLeft = name.includes(\"left-hand\") ||\n        name.includes(\"lefthand\") ||\n        name.includes(\"left hand\");\n    const isRight = name.includes(\"right-hand\") ||\n        name.includes(\"righthand\") ||\n        name.includes(\"right hand\");\n    if (isLeft)\n        mapping.left = item.sprite_id;\n    else if (isRight)\n        mapping.right = item.sprite_id;\n    else\n        mapping.default = item.sprite_id;\n    acc[item.id] = mapping;\n    return acc;\n}, {});\n/* ----------------------------------------------------\n   Utilities\n---------------------------------------------------- */\nconst getDataFile = (...args) => {\n    return path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, \"..\", \"data\", CONFIG.SERVER.CLIENT_VERSION, ...args);\n};\nconst requireModule = (...args) => {\n    return __webpack_require__(\"./src/helper sync recursive\")(path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, \"..\", \"src\", ...args));\n};\nlet gameServerInstance = null;\nconst initializeGameServer = (server) => {\n    if (!gameServerInstance)\n        gameServerInstance = server;\n    return gameServerInstance;\n};\nconst getGameServer = () => {\n    if (!gameServerInstance)\n        throw new Error(\"GameServer not initialized\");\n    return gameServerInstance;\n};\n/* ----------------------------------------------------\n   Debug printer\n---------------------------------------------------- */\nclass Print {\n    static line() {\n        console.log(\"----------------------------------------------------\");\n    }\n    static savePlayer(character) {\n        const parsed = JSON.parse(character);\n        console.log(\"JSON saved:\\n\", JSON.stringify(parsed, null, 2));\n    }\n    static packet(buffer, packet) {\n        const msg = packet.index > packet.buffer.length\n            ? \"🔴\"\n            : packet.index === packet.buffer.length\n                ? \"🟡\"\n                : \"🟢\";\n        const opcode = buffer[0].toString().padStart(2, \"0\");\n        console.log(`📤 opcode ${opcode} ${msg}`);\n    }\n    static packetIn(opcode) {\n        console.log(`📨 opcode ${opcode.toString().padStart(2, \"0\")} ⚫`);\n    }\n}\n\n\n//# sourceURL=webpack:///./src/helper/appContext.ts?");

/***/ }),

/***/ "./src/helper sync recursive":
/*!**************************!*\
  !*** ./src/helper/ sync ***!
  \**************************/
/***/ ((module) => {

eval("function webpackEmptyContext(req) {\n\tvar e = new Error(\"Cannot find module '\" + req + \"'\");\n\te.code = 'MODULE_NOT_FOUND';\n\tthrow e;\n}\nwebpackEmptyContext.keys = () => ([]);\nwebpackEmptyContext.resolve = webpackEmptyContext;\nwebpackEmptyContext.id = \"./src/helper sync recursive\";\nmodule.exports = webpackEmptyContext;\n\n//# sourceURL=webpack:///./src/helper/_sync?");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "./src/config/config.json":
/*!********************************!*\
  !*** ./src/config/config.json ***!
  \********************************/
/***/ ((module) => {

"use strict";
eval("module.exports = /*#__PURE__*/JSON.parse('{\"HMAC\":{\"SHARED_SECRET\":\"0000000000000000000000000000000000000000000000000000000000000000\"},\"LOGIN\":{\"PORT\":1338,\"HOST\":\"127.0.0.1\",\"TOKEN_VALID_MS\":3000},\"IPC\":{\"PORT\":2000,\"HOST\":\"127.0.0.1\",\"RECONNECT_MS\":1000,\"SOCKET\":\"game.sock\"},\"LOGGING\":{\"INTERVAL\":20,\"NETWORK_TELEMETRY\":true,\"FILEPATH\":\"server.log\"},\"DATABASE\":{\"ACCOUNT_DATABASE\":\"accounts.db\",\"DEFAULT_CHARACTER\":{\"ENABLED\":true,\"ACCOUNT\":\"111111\",\"PASSWORD\":\"tibia\",\"SEX\":\"male\",\"NAME\":\"God\",\"ROLE\":5},\"DEFAULT_CHARACTER0\":{\"ENABLED\":true,\"ACCOUNT\":\"0\",\"PASSWORD\":\"0\",\"SEX\":\"female\",\"NAME\":\"0\",\"ROLE\":0},\"DEFAULT_CHARACTER1\":{\"ENABLED\":true,\"ACCOUNT\":\"1\",\"PASSWORD\":\"1\",\"SEX\":\"female\",\"NAME\":\"1\",\"ROLE\":0},\"DEFAULT_CHARACTER2\":{\"ENABLED\":true,\"ACCOUNT\":\"2\",\"PASSWORD\":\"2\",\"SEX\":\"male\",\"NAME\":\"2\",\"ROLE\":0},\"DEFAULT_CHARACTER3\":{\"ENABLED\":true,\"ACCOUNT\":\"3\",\"PASSWORD\":\"3\",\"SEX\":\"male\",\"NAME\":\"3\",\"ROLE\":0},\"DEFAULT_CHARACTER4\":{\"ENABLED\":true,\"ACCOUNT\":\"4\",\"PASSWORD\":\"4\",\"SEX\":\"male\",\"NAME\":\"4\",\"ROLE\":0},\"DEFAULT_CHARACTER5\":{\"ENABLED\":true,\"ACCOUNT\":\"5\",\"PASSWORD\":\"5\",\"SEX\":\"male\",\"NAME\":\"5\",\"ROLE\":0}},\"SERVER\":{\"COMPRESSION\":{\"ENABLED\":true,\"THRESHOLD\":1024,\"LEVEL\":1},\"STATUS\":{\"OPEN\":\"OPEN\",\"OPENING\":\"OPENING\",\"CLOSING\":\"CLOSING\",\"CLOSED\":\"CLOSED\",\"MAINTENANCE\":\"MAINTENANCE\"},\"ON_ALREADY_ONLINE\":\"replace\",\"EXTERNAL_HOST\":\"127.0.0.1:2222\",\"VERSION\":\"0.0.0\",\"CLIENT_VERSION\":\"1098\",\"DATE\":\"2022-03-24\",\"PORT\":2222,\"HOST\":\"127.0.0.1\",\"ALLOW_MAXIMUM_CONNECTIONS\":50,\"MS_TICK_INTERVAL\":10,\"MS_SHUTDOWN_SCHEDULE\":1000,\"MAX_PACKET_SIZE\":1024,\"SOCKET_TIMEOUT_MS\":120000},\"WORLD\":{\"MAXIMUM_STACK_COUNT\":100,\"GLOBAL_COOLDOWN_MS\":1000,\"WORLD_FILE\":\"Tibia1098.otbm\",\"IDLE\":{\"WARN_SECONDS\":300,\"KICK_SECONDS\":60},\"CHUNK\":{\"WIDTH\":18,\"HEIGHT\":7,\"DEPTH\":8},\"CLOCK\":{\"SPEED\":10,\"START\":\"08:00\"},\"SPAWNS\":{\"ENABLED\":false},\"NPCS\":{\"ENABLED\":false}}}');\n\n//# sourceURL=webpack:///./src/config/config.json?");

/***/ }),

/***/ "./src/config/constants.json":
/*!***********************************!*\
  !*** ./src/config/constants.json ***!
  \***********************************/
/***/ ((module) => {

"use strict";
eval("module.exports = /*#__PURE__*/JSON.parse('{\"CONTAINER\":{\"EQUIPMENT\":0,\"DEPOT\":1,\"KEYRING\":2,\"BACKPACK\":3,\"BELT\":4},\"CHANNEL\":{\"DEFAULT\":0,\"WORLD\":1,\"TRADE\":2,\"HELP\":3},\"MONSTER\":{\"RAT\":0},\"PROTOCOL\":{\"CLIENT\":{\"LATENCY\":0,\"LOGOUT\":1,\"MOVE\":2,\"CONTAINER_CLOSE\":3,\"TURN\":4,\"OUTFIT\":5,\"TARGET\":6,\"CAST_SPELL\":7,\"CHANNEL_MESSAGE\":8,\"CHANNEL_JOIN\":9,\"CHANNEL_LEAVE\":10,\"CHANNEL_PRIVATE_MESSAGE\":11,\"THING_MOVE\":12,\"THING_USE_WITH\":13,\"THING_USE\":14,\"THING_LOOK\":15,\"FRIEND_REMOVE\":16,\"FRIEND_ADD\":17,\"BUY_OFFER\":18,\"OPEN_KEYRING\":19,\"CLIENT_USE_TILE\":20,\"TARGET_CANCEL\":21,\"USE_BELT_POTION\":22},\"SERVER\":{\"LATENCY\":0,\"ITEM_ADD\":1,\"ITEM_REMOVE\":10,\"CHUNK\":2,\"MESSAGE_CANCEL\":22,\"MESSAGE_SERVER\":3,\"MESSAGE_PRIVATE\":16,\"CREATURE_MESSAGE\":4,\"CREATURE_MOVE\":5,\"CREATURE_REMOVE\":9,\"CREATURE_TELEPORT\":15,\"CREATURE_STATE\":12,\"CREATURE_SAY\":25,\"CREATURE_INFORMATION\":27,\"CONTAINER_OPEN\":6,\"CONTAINER_CLOSE\":11,\"CONTAINER_ADD\":7,\"CONTAINER_REMOVE\":13,\"STATE_SERVER\":19,\"STATE_PLAYER\":8,\"MAGIC_EFFECT\":14,\"DISTANCE_EFFECT\":24,\"PLAYER_LOGIN\":17,\"PLAYER_LOGOUT\":18,\"HAIR\":20,\"ITEM_INFORMATION\":21,\"ITEM_TEXT\":26,\"ITEM_TRANSFORM\":23,\"TRADE_OFFER\":28,\"WORLD_TIME\":29,\"COMBAT_LOCK\":30,\"SERVER_ERROR\":31,\"EMOTE\":33,\"TOGGLE_CONDITION\":34,\"TARGET\":35,\"SPELL_ADD\":36,\"SPELL_CAST\":32,\"SPELL_REMOVE\":38,\"CREATURE_PROPERTY\":37,\"CHANNEL_JOIN\":50,\"FRIEND_UPDATE\":51}},\"DIRECTION\":{\"NORTH\":0,\"EAST\":1,\"SOUTH\":2,\"WEST\":3,\"SOUTHEAST\":4,\"SOUTHWEST\":5,\"NORTHEAST\":6,\"NORTHWEST\":7},\"TYPES\":{\"PLAYER\":0,\"MONSTER\":1,\"NPC\":2},\"ROLES\":{\"NONE\":0,\"TUTOR\":1,\"SENIOR_TUTOR\":2,\"GAMEMASTER\":3,\"GOD\":4},\"FLUID\":{\"NONE\":0,\"WATER\":1,\"BLOOD\":2,\"BEER\":3,\"SLIME\":4,\"LEMONADE\":5,\"MILK\":6,\"MANA\":7,\"WATER2\":9,\"HEALTH\":10,\"OIL\":11,\"SLIME2\":12,\"URINE\":13,\"COCONUTMILK\":14,\"WINE\":15,\"MUD\":19,\"FRUITJUICE\":21,\"LAVA\":26,\"RUM\":27},\"EQUIPMENT\":{\"HELMET\":0,\"ARMOR\":1,\"LEGS\":2,\"BOOTS\":3,\"RIGHT\":4,\"LEFT\":5,\"BACKPACK\":6,\"NECKLACE\":7,\"RING\":8,\"QUIVER\":9,\"RING2\":10,\"RING3\":11,\"RING4\":12,\"RING5\":13,\"BELT\":14},\"VOCATION\":{\"NONE\":0,\"KNIGHT\":1,\"PALADIN\":2,\"SORCERER\":3,\"DRUID\":4,\"ELITE_KNIGHT\":5,\"ROYAL_PALADIN\":6,\"MASTER_SORCERER\":7,\"ELDER_DRUID\":8},\"PROPERTIES\":{\"NAME\":0,\"HEALTH\":1,\"HEALTH_MAX\":2,\"MANA\":3,\"MANA_MAX\":4,\"CAPACITY\":5,\"CAPACITY_MAX\":6,\"ATTACK\":7,\"ATTACK_SPEED\":9,\"DEFENSE\":8,\"SPEED\":10,\"OUTFIT\":11,\"DIRECTION\":12,\"ROLE\":13,\"SEX\":14,\"VOCATION\":15,\"HAIRS\":17,\"MAGIC\":18,\"FIST\":19,\"CLUB\":20,\"SWORD\":21,\"AXE\":22,\"DISTANCE\":23,\"SHIELDING\":24,\"FISHING\":25,\"EXPERIENCE\":26,\"ENERGY\":27,\"ENERGY_MAX\":28},\"SEX\":{\"MALE\":0,\"FEMALE\":1},\"COLOR\":{\"BLUE\":5,\"LIGHTGREEN\":30,\"LIGHTBLUE\":35,\"MAYABLUE\":95,\"DARKRED\":108,\"LIGHTGREY\":129,\"SKYBLUE\":143,\"PURPLE\":155,\"RED\":180,\"ORANGE\":198,\"YELLOW\":210,\"WHITE\":215},\"CONDITION\":{\"DRUNK\":0,\"POISONED\":1,\"BURNING\":2,\"ELECTRIFIED\":3,\"INVISIBLE\":4,\"PROTECTION_ZONE\":5,\"COMBAT_LOCK\":6,\"SUPPRESS_DRUNK\":7,\"HEALING\":8,\"REGENERATION\":9,\"MORPH\":10,\"MAGIC_SHIELD\":11,\"MAGIC_FLAME\":12,\"SATED\":13,\"HASTE\":14,\"ARENA\":15,\"HEALTH_HEALING\":16,\"MANA_HEALING\":17,\"ENERGY_HEALING\":18},\"BLOODTYPE\":{\"BLOOD\":0,\"POISON\":1,\"NONE\":2},\"LOOKTYPES\":{\"CREATURE\":{\"ORC_WARLORD\":2,\"WAR_WOLF\":3,\"ORC_RIDER\":4,\"ORC\":5,\"ORC_SHAMAN\":6,\"ORC_WARRIOR\":7,\"ORC_BERSERKER\":8,\"NECROMANCER\":9,\"BUTTERFLY\":10,\"BLACK_SHEEP\":13,\"SHEEP\":14,\"TROLL\":15,\"BEAR\":16,\"BONELORD\":17,\"GHOUL\":18,\"SLIME\":19,\"QUARA_PREDATOR\":20,\"RAT\":21,\"CYCLOPS\":22,\"MINOTAUR_MAGE\":23,\"MINOTAUR_ARCHER\":24,\"MINOTAUR\":25,\"ROTWORM\":26,\"WOLF\":27,\"SNAKE\":28,\"MINOTAUR_GUARD\":29,\"SPIDER\":30,\"DEER\":31,\"DOG\":32,\"SKELETON\":33,\"DRAGON\":34,\"POISON_SPIDER\":36,\"DEMON_SKELETON\":37,\"GIANT_SPIDER\":38,\"DRAGON_LORD\":39,\"FIRE_DEVIL\":40,\"LION\":41,\"POLAR BEAR\":42,\"SCORPION\":43,\"WASP\":44,\"BUG\":45,\"GHOST\":48,\"FIRE_ELEMENTAL\":49,\"ORC_SPEARMAN\":50,\"GREEN_DJINN\":51,\"WINTER_WOLF\":52,\"FROST_TROLL\":53,\"WITCH\":54,\"BEHEMOTH\":55,\"CAVE RAT\":56,\"MONK\":57,\"PRIESTESS\":58,\"ORC_LEADER\":59,\"PIG\":60,\"GOBLIN\":61,\"ELF\":62,\"ELF_ARCANIST\":63,\"ELF_SCOUT\":64,\"MUMMY\":65,\"DWARF_GEOMANCER\":66,\"STONE_GOLEM\":67,\"VAMPIRE\":68,\"DWARF\":69,\"DWARF_GUARD\":70,\"DWARF_SOLDIER\":71,\"HERO\":73,\"RABBIT\":74,\"SWAMP_TROLL\":76,\"BANSHEE\":78,\"ANCIENT_SCARAB\":79,\"BLUE DJINN\":80,\"COBRA\":81,\"LARVA\":82,\"SCARAB\":83,\"PHARAOH\":90,\"PHARAOH_PELERYNA\":91,\"MIMIC\":92,\"PIRATE_MARAUDER\":93,\"HYAENA\":94,\"GARGOYLE\":95,\"PIRATE_CUTTHROAT\":96,\"PIRATE_BUCCANEER\":97,\"PIRATE_CORSAIR\":98,\"LICH\":99,\"CRYPT_SHAMBLER\":100,\"BONEBEAST\":101,\"DEATHSLICER\":102,\"EFREET\":103,\"MARID\":104,\"BADGER\":105,\"SKUNK\":106,\"DEMON\":107,\"ELDER_BONELORD\":108,\"GAZER\":109,\"YETI\":110},\"MALE\":{\"CITIZEN\":128,\"HUNTER\":129,\"MAGE\":130,\"KNIGHT\":131,\"NOBLEMAN\":132,\"SUMMONER\":133,\"WARRIOR\":134},\"FEMALE\":{\"CITIZEN\":136,\"HUNTER\":137,\"MAGE\":138,\"KNIGHT\":139,\"NOBLEMAN\":140,\"SUMMONER\":141,\"WARRIOR\":142},\"OTHER\":{\"GAMEMASTER\":75,\"ELF\":144,\"DWARF\":160}},\"EFFECT\":{\"MAGIC\":{\"DRAWBLOOD\":1,\"LOSEENERGY\":2,\"POFF\":3,\"BLOCKHIT\":4,\"EXPLOSIONAREA\":5,\"EXPLOSIONHIT\":6,\"FIREAREA\":7,\"YELLOW_RINGS\":8,\"GREEN_RINGS\":9,\"HITAREA\":10,\"TELEPORT\":11,\"ENERGYHIT\":12,\"MAGIC_BLUE\":13,\"MAGIC_RED\":14,\"MAGIC_GREEN\":15,\"HITBYFIRE\":16,\"HITBYPOISON\":17,\"MORTAREA\":18,\"SOUND_GREEN\":19,\"SOUND_RED\":20,\"POISONAREA\":21,\"SOUND_YELLOW\":22,\"SOUND_PURPLE\":23,\"SOUND_BLUE\":24,\"SOUND_WHITE\":25},\"PROJECTILE\":{\"SPEAR\":1,\"BOLT\":2,\"ARROW\":3,\"FIRE\":4,\"ENERGY\":5,\"POISONARROW\":6,\"BURSTARROW\":7,\"THROWINGSTAR\":8,\"THROWINGKNIFE\":9,\"SMALLSTONE\":10,\"DEATH\":11,\"LARGEROCK\":12,\"SNOWBALL\":13,\"POWERBOLT\":14,\"POISON\":15}}}');\n\n//# sourceURL=webpack:///./src/config/constants.json?");

/***/ }),

/***/ "./src/config/itemToSprite.json":
/*!**************************************!*\
  !*** ./src/config/itemToSprite.json ***!
  \**************************************/
/***/ ((module) => {

"use strict";
eval("module.exports = /*#__PURE__*/JSON.parse('{\"items\":[{\"name\":\"Left-Hand Espada\",\"id\":2412,\"sprite_id\":919},{\"name\":\"Right-hand Fire\",\"id\":2191,\"sprite_id\":920},{\"name\":\"Left-hand Fire\",\"id\":2191,\"sprite_id\":921},{\"name\":\"Right-hand Water\",\"id\":2186,\"sprite_id\":923},{\"name\":\"Left-hand Water\",\"id\":2186,\"sprite_id\":922},{\"name\":\"Right-hand Earth\",\"id\":2182,\"sprite_id\":925},{\"name\":\"Left-hand Earth\",\"id\":2182,\"sprite_id\":924},{\"name\":\"Right-hand Wind\",\"id\":2190,\"sprite_id\":926},{\"name\":\"Left-hand Wind\",\"id\":2190,\"sprite_id\":927},{\"name\":\"Leather Helmet\",\"id\":2461,\"sprite_id\":907},{\"name\":\"Leather Armor\",\"id\":2467,\"sprite_id\":908},{\"name\":\"Leather Legs\",\"id\":2649,\"sprite_id\":910},{\"name\":\"Leather Boots\",\"id\":2643,\"sprite_id\":909},{\"name\":\"studded helmet\",\"id\":2482,\"sprite_id\":911},{\"name\":\"studded Armor\",\"id\":2484,\"sprite_id\":912},{\"name\":\"studded legs\",\"id\":2468,\"sprite_id\":913},{\"name\":\"studded boots\",\"id\":2641,\"sprite_id\":914},{\"name\":\"chain helmet\",\"id\":2458,\"sprite_id\":915},{\"name\":\"chain Armor\",\"id\":2464,\"sprite_id\":916},{\"name\":\"chain legs\",\"id\":2648,\"sprite_id\":917},{\"name\":\"chain boots\",\"id\":2645,\"sprite_id\":918},{\"name\":\"backpack\",\"id\":1988,\"sprite_id\":928},{\"name\":\"Cape\",\"id\":2003,\"sprite_id\":929},{\"name\":\"Belt\",\"id\":2002,\"sprite_id\":931}]}');\n\n//# sourceURL=webpack:///./src/config/itemToSprite.json?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__(__webpack_require__.s = "./engine.ts");
/******/ 	
/******/ })()
;