// 单元内容表
// 结构：短句 3 条 / 长句 2 条 / 短文 1 篇，三段内容互不强相关
// 词汇范围：尽量限制在 850 词内（正式版词表待逐个核对）

window.UNITS = [
  {
    id: "u001",
    mnemonic: "公交与花园",
    short: [
      { en: "The bus is late again.", zh: "公交又晚了。" },
      { en: "I need a cup of tea.", zh: "我需要一杯茶。" },
      { en: "She works in a small shop.", zh: "她在一家小店上班。" }
    ],
    long: [
      {
        en: "When I open the window in the morning, the cold air comes in and I feel awake.",
        zh: "早上我打开窗，冷空气进来，我一下就清醒了。"
      },
      {
        en: "He told me that he could not come today because his car was not working.",
        zh: "他告诉我他今天来不了，因为他的车坏了。"
      }
    ],
    passage: {
      title: "The Old Man's Garden",
      paragraphs: [
        {
          en: "Every morning, an old man works in his garden. He has a small house and a big garden. The garden is full of flowers, and there is one tree near the wall.",
          zh: "每天早上，一位老人在他的花园里干活。他有一间小房子和一个大花园。花园里开满了花，墙边有一棵树。"
        },
        {
          en: "I walk past his house on my way to work. One day I stop and say, \u201cYour garden is beautiful.\u201d",
          zh: "我上班路上会经过他家。有一天我停下来，说：“你的花园真好看。”"
        },
        {
          en: "He looks up and smiles. \u201cThank you. I work here every day, ten minutes in the morning and ten minutes in the evening.\u201d",
          zh: "他抬起头笑了。“谢谢。我每天都来，早上十分钟，晚上十分钟。”"
        },
        {
          en: "\u201cOnly twenty minutes?\u201d I ask.",
          zh: "“只要二十分钟？”我问。"
        },
        {
          en: "\u201cYes,\u201d he says. \u201cMany years ago I worked for hours, and I was always tired. Then I learned this: a little work every day is better than a lot of work in one day.\u201d",
          zh: "“对，”他说，“很多年前我一干就是好几个小时，总是很累。后来我明白了一件事：每天做一点，比一天做很多更好。”"
        },
        {
          en: "I think about his words for a long time. Now I read ten pages every night before I sleep. It is not much. But after one year, it is a lot.",
          zh: "我把他的话想了很久。现在每晚睡前我读十页书。不算多。但一年下来就很多了。"
        },
        {
          en: "The old man still works in his garden. The flowers are always there. He does not hurry, and he does not stop.",
          zh: "老人如今还在花园里干活。花一直在那里。他不着急，也从不停止。"
        }
      ]
    },
    words: [
      "bus", "late", "need", "cup", "tea", "work", "shop", "open", "window",
      "morning", "cold", "air", "feel", "tell", "today", "car", "garden",
      "house", "flower", "tree", "wall", "walk", "stop", "beautiful", "smile",
      "minute", "evening", "hour", "tired", "learn", "read", "page", "night",
      "sleep", "hurry", "always", "small", "big"
    ]
  },
  {
    id: "u002",
    mnemonic: "咖啡与长路",
    short: [
      { en: "This coffee is too hot.", zh: "这咖啡太烫了。" },
      { en: "Can I sit here?", zh: "我可以坐这儿吗？" },
      { en: "The rain will stop soon.", zh: "雨很快就会停。" }
    ],
    long: [
      {
        en: "If you finish your work before six, we can meet at the small coffee shop near the station.",
        zh: "如果你六点前干完活，我们可以在车站旁边那家小咖啡店见。"
      },
      {
        en: "She was reading a book when I came in, so I waited by the door for a minute.",
        zh: "我进来的时候她正在看书，所以我在门边等了一分钟。"
      }
    ],
    passage: {
      title: "The Long Way Home",
      paragraphs: [
        {
          en: "Last night the bus did not come. I waited for twenty minutes, then I started to walk. My house is far from the station, and the road is long.",
          zh: "昨晚公交没来。我等了二十分钟，然后开始走。我家离车站很远，路很长。"
        },
        {
          en: "At first I was angry. My feet were cold, and I had a bag of food in my hand. I thought about all the things I could be doing at home.",
          zh: "一开始我很生气。脚很冷，手里还拎着一袋吃的。我想着这会儿在家能做的那些事。"
        },
        {
          en: "Then I looked up. The street was quiet, and the sky was full of stars. I do not see stars very often, because I am always inside.",
          zh: "然后我抬起头。街上很安静，天上满是星星。我不常看到星星，因为我总是在屋里。"
        },
        {
          en: "A woman was selling hot food near the river. I bought some and ate it standing there. It was the best food I had all week.",
          zh: "河边有个女人在卖热食。我买了一些，站在那儿吃完。那是我这一周吃到的最好吃的东西。"
        },
        {
          en: "When I got home, it was almost eleven. I was tired, but I was not angry any more. Sometimes a long way home is not a bad thing.",
          zh: "到家时快十一点了。我很累，但不再生气了。有时候，回家的路长一点也不是坏事。"
        }
      ]
    },
    words: [
      "coffee", "hot", "sit", "rain", "stop", "soon", "finish", "before",
      "meet", "station", "read", "book", "wait", "door", "minute", "night",
      "start", "walk", "house", "far", "road", "long", "first", "angry",
      "foot", "bag", "food", "hand", "think", "home", "look", "street",
      "quiet", "sky", "star", "often", "always", "inside", "woman", "sell",
      "river", "buy", "eat", "stand", "week", "almost", "tired", "bad"
    ]
  },
  {
    id: "u003",
    mnemonic: "手机与晚饭",
    short: [
      { en: "My phone is not working.", zh: "我的手机坏了。" },
      { en: "He gave me a red pen.", zh: "他给了我一支红笔。" },
      { en: "The food here is good.", zh: "这儿的饭不错。" }
    ],
    long: [
      {
        en: "I do not know why he was angry, but I think it was because I forgot his name.",
        zh: "我不知道他为什么生气，但我觉得是因为我忘了他的名字。"
      },
      {
        en: "After we finished eating, we walked along the river and talked about our old school.",
        zh: "吃完饭后，我们沿着河走，聊起以前的学校。"
      }
    ],
    passage: {
      title: "A Small Thing",
      paragraphs: [
        {
          en: "My phone stopped working on a Monday. I put it on the table and looked at it for a long time. Then I went out without it.",
          zh: "我的手机在某个星期一坏了。我把它放在桌上看了很久，然后没带它就出门了。"
        },
        {
          en: "The day was strange. I did not know what time it was. I could not take a picture of the sky. When I waited for the bus, I had nothing to do but look at the people.",
          zh: "那天很奇怪。我不知道几点了。我没法拍天空。等公交的时候，除了看人，我什么也做不了。"
        },
        {
          en: "A man next to me was talking to his son. The boy asked him why the moon follows the car. The man said he did not know, and they both laughed.",
          zh: "旁边一个男人在跟他儿子说话。男孩问他，为什么月亮会跟着车走。男人说他也不知道，然后两个人都笑了。"
        },
        {
          en: "I would not have heard that if my phone was working.",
          zh: "如果我手机没坏，我不会听到这段对话。"
        },
        {
          en: "In the evening I got it fixed. It cost a little money and took an hour. I was happy to have it back, but I also remembered the day without it.",
          zh: "晚上我把它修好了。花了点钱，用了一个小时。拿回来我很高兴，但也记住了没有它的那一天。"
        }
      ]
    },
    words: [
      "phone", "work", "give", "red", "pen", "food", "know", "angry",
      "think", "forget", "name", "finish", "eat", "walk", "river", "talk",
      "old", "school", "table", "long", "time", "go", "out", "day",
      "strange", "take", "picture", "sky", "wait", "bus", "nothing",
      "people", "next", "son", "boy", "ask", "moon", "follow", "car",
      "laugh", "hear", "evening", "fix", "cost", "money", "hour", "happy",
      "back", "remember"
    ]
  }
];
