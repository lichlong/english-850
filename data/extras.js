// 课外拓展 + 课外练习（SPEC §11）
// 拓展三段结构：std = 标准英语原文（可含超纲词，按文体写）／zh = 中文／simple = 850 简说
// 文体：电影台词 / 新闻 / 文学。简说与练习答案只用 850 表内词 + 允许项 + 偏离词
window.EXTRAS = {
  u001: {
    read: {
      genre: "电影台词",
      title: "Ten Minutes",
      blocks: [
        {
          std: "You want to know how I got this garden? Ten minutes a day. That's it. Not an hour on Sunday \u2014 ten minutes, every single morning.",
          zh: "你想知道这花园是怎么来的？每天十分钟，就这些。不是周日干一小时——是每天早上十分钟。",
          simple: "You may be saying, how did I get this garden? Ten minutes every day. Not one hour on Sunday. Ten minutes, every morning."
        },
        {
          std: "Everybody asks me for the secret. There isn't one. The only thing I do is show up \u2014 rain or shine.",
          zh: "人人都问我要秘诀。没有秘诀。我唯一做的事就是出现——风雨无阻。",
          simple: "Every person puts the question to me: what is the secret? There is no secret. The only thing I do is come, on a cold day and on a warm day."
        },
        {
          std: "People think it's about discipline. It isn't. It's about not stopping long enough to forget.",
          zh: "人以为是自律。不是。是别停太久，久到忘了。",
          simple: "Some persons may be saying it is about control. It is not. It is about not stopping for a long time, long enough to have no memory of it."
        }
      ]
    },
    quiz: [
      { level: "low", zh: "空气很冷。", en: "The air is cold." },
      { level: "mid", zh: "他每天早上在花园里干十分钟活，所以他不累。", en: "He works in the garden ten minutes every morning, so he is not tired." }
    ]
  },

  u002: {
    read: {
      genre: "新闻",
      title: "One Town at a Time",
      blocks: [
        {
          std: "A 72-year-old man has walked more than 3,000 kilometres in the past year, one small town at a time.",
          zh: "一位 72 岁的老人过去一年走了 3000 多公里，一个小镇接着一个小镇。",
          simple: "An old man of seventy-two years went a very long way in one year. He went from town to town, and he did not go quickly."
        },
        {
          std: "He says he has no special training, no coach and no plan \u2014 only a pair of boots and a habit of getting up early.",
          zh: "他说自己没有专门训练、没有教练、也没有计划——只有一双靴子和早起的习惯。",
          simple: "He says he has no special learning and no guide. Only boots on his feet, and the rule of early hours."
        },
        {
          std: "Asked what keeps him going, he laughed: \u201cThe road doesn't care how old you are.\u201d",
          zh: "被问到是什么让他一直走下去，他笑了：“路不在乎你多大年纪。”",
          simple: "I put the question to him: what keeps you going? He gave a smile and said, \u201cThe road does not take interest in your years.\u201d"
        }
      ]
    },
    quiz: [
      { level: "low", zh: "路很长。", en: "The road is long." },
      { level: "mid", zh: "我们走了两个小时，才到那个小镇。", en: "We went for two hours before we came to the small town." }
    ]
  },

  u003: {
    read: {
      genre: "文学",
      title: "The Fourth Seat",
      blocks: [
        {
          std: "The table was laid for four, but only three of them sat down; the fourth place stayed empty, as it had every evening since spring.",
          zh: "桌上摆了四个人的位置，但只有三个人坐下；第四个位子一直空着，从春天起每晚如此。",
          simple: "The table had a seat for four persons, but only three took their seats. The other seat had no person in it, every evening after the first day of spring."
        },
        {
          std: "Nobody mentioned it. Nobody ever did. The empty chair had become a kind of guest, and they had learned to set a plate for it.",
          zh: "没人提起。从来没人提。那把空椅子成了一个客人，他们学会了给它摆一副餐具。",
          simple: "No person said a word about it. That seat was now a sort of friend, and they put a plate before it every night."
        },
        {
          std: "When the youngest finally asked, her mother only said, \u201cWe keep it for the days that might come back.\u201d",
          zh: "最小的孩子终于问起时，母亲只说：“我们留着它，给那些也许会回来的日子。”",
          simple: "At last the smallest girl put the question to her mother. Her mother said only this: \u201cWe keep it for the days that may come back.\u201d"
        }
      ]
    },
    quiz: [
      { level: "low", zh: "晚饭很简单。", en: "The meal is simple." },
      { level: "mid", zh: "我们一个小时不说话，只听父亲讲故事。", en: "For one hour we do not talk. We only give our attention to my father's story." }
    ]
  }
};
