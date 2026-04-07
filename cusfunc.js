export function assert(cond,msg){
    if (!cond){
        throw msg || "Assertion failed"
    }
}
export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}