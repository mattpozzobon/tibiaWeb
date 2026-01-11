const Condition = requireModule("condition");

module.exports = function exura(properties) {

  this.addCondition(Condition.prototype.HEALING, 0.1, 0.5);

  return 100;

}