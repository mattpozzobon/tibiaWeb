const Condition = requireModule("condition");

module.exports = function exura(properties) {

  if(!this.addCondition(Condition.prototype.INVISIBLE, 0.01, 1)) {
    return 0;
  }

  return 50;

}