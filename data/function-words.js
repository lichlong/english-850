// 功能词表（SPEC §13.4）：复健卡里要剔除的词
// 只收"语法功能词"——冠词、代词、介词、连词、助动词、情态动词、高频副词、数词。
// 这些词每句都出现好几次，列进复健卡没有意义（它们不需要"复习"）。
// 注意：make / get / go / take 这类操作词不算功能词，它们是实义动词，要留着。
window.FUNCTION_WORDS = {
  the: 1, a: 1, an: 1,
  i: 1, you: 1, he: 1, she: 1, it: 1, we: 1, they: 1,
  me: 1, him: 1, her: 1, us: 1, them: 1,
  my: 1, your: 1, his: 1, its: 1, our: 1, their: 1,
  this: 1, that: 1, these: 1, those: 1,
  of: 1, to: 1, in: 1, on: 1, at: 1, by: 1, for: 1, with: 1, from: 1,
  into: 1, onto: 1, about: 1, over: 1, under: 1, up: 1, down: 1, out: 1, off: 1,
  through: 1, between: 1, among: 1, against: 1, across: 1, along: 1, around: 1,
  before: 1, after: 1, during: 1, above: 1, below: 1, near: 1, till: 1,
  and: 1, or: 1, but: 1, if: 1, so: 1, as: 1, than: 1, then: 1,
  because: 1, though: 1, although: 1, while: 1, until: 1, unless: 1, whether: 1,
  be: 1, am: 1, is: 1, are: 1, was: 1, were: 1, been: 1, being: 1,
  do: 1, does: 1, did: 1, done: 1,
  have: 1, has: 1, had: 1,
  will: 1, would: 1, shall: 1, should: 1, may: 1, might: 1, must: 1, can: 1,
  not: 1, no: 1, yes: 1,
  all: 1, any: 1, some: 1, each: 1, every: 1,
  one: 1, two: 1, three: 1, four: 1, five: 1, ten: 1, first: 1, second: 1, last: 1,
  very: 1, more: 1, most: 1, much: 1, many: 1, little: 1, few: 1,
  other: 1, another: 1, same: 1, such: 1, only: 1, also: 1, too: 1,
  again: 1, still: 1, just: 1, now: 1, here: 1, there: 1,
  when: 1, where: 1, how: 1, why: 1, who: 1, whom: 1, whose: 1, which: 1, what: 1,
  mine: 1, yours: 1, hers: 1, ours: 1, theirs: 1
};
