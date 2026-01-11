const Condition = requireModule("condition");

module.exports = function morph(properties) {

  this.addCondition(Condition.prototype.MORPH, 1, 1, {"id": CONST.LOOKTYPES.OTHER.GAMEMASTER});

  return 100;

}
