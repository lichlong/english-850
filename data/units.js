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
  },
  {
    id: 'u004',
    mnemonic: '月亮与夜',
    short: [
      { en: 'The moon is very bright now.', zh: '月亮现在很亮。' },
      { en: 'It comes near the earth this week.', zh: '这周它离地球很近。' },
      { en: 'I go out and look up for a time.', zh: '我出门抬头看了一会儿。' },
      { en: 'The street is quiet and the air is cold.', zh: '街上很静，空气很冷。' },
      { en: 'My mother says it is a good night.', zh: '我妈说这是个好夜晚。' }
    ],
    long: [
      { en: 'This is the first of three big moons, and the other two will come in December and in January.', zh: '这是三次大月亮的第一次，另外两次会在十二月和一月。' },
      { en: 'When the moon is near the earth, it seems greater and brighter than on other nights.', zh: '月亮离地球近的时候，看起来比其他夜晚更大更亮。' },
      { en: 'I put my hand up, and the moon is almost as wide as my thumb.', zh: '我把手举起来，月亮差不多和我拇指一样宽。' }
    ],
    passage: {
      title: 'A Big Moon',
      paragraphs: [
        { en: 'On Monday night the moon came up over the buildings and made the street as bright as day. I went out with my mother because she said this was a special night.', zh: '周一晚上，月亮从楼顶升起来，把街道照得像白天一样亮。我和我妈出门，因为她说这是个特别的夜晚。' },
        { en: 'An old man and a small boy were near the garden. The boy put his hand up and said the moon was as big as an orange. The old man said it was much greater than that.', zh: '花园旁边有一位老人和一个小男孩。男孩举起手说月亮像个橙子那么大。老人说它比那大得多。' },
        { en: 'My mother said this was the first of three. The other two would come in December and in January, and all three would be near the earth.', zh: '我妈说这是三次里的第一次。另外两次在十二月和一月，三次都会靠近地球。' },
        { en: 'We had no camera, and we did not need one. We only put our eyes up and kept them there for a long time, and the cold air made our faces red.', zh: '我们没带相机，也不需要。我们只是抬头，把眼睛放在那里很久，冷空气把我们的脸吹红了。' },
        { en: 'A woman on the floor over us put her head out of the window. She said the moon was like a great white plate. The man with her said it was more like a ball of fire that had gone cold.', zh: '楼上的一位女士把头探出窗外。她说月亮像一只很大的白盘子。跟她一起的男人说更像一团冷下来的火球。' },
        { en: 'The boy asked if the moon would be this great tomorrow. No person had a good answer. My mother said it would be smaller, and that this was the reason we were out here now.', zh: '男孩问明天月亮还会不会这么大。没人有个好答案。我妈说会小一些，而这正是我们现在站在外面的原因。' },
        { en: 'After we came back, I had a warm drink and went to my room. The night was quiet, and I had no questions about it.', zh: '回来后，我喝了点热的，回了房间。那个夜晚很静，我对它没有疑问。' }
      ]
    },
    words: ['moon','bright','night','come','near','earth','week','go','out','look','time','street','quiet','air','cold','mother','say','good','first','big','other','december','january','seem','great','hand','wide','thumb','building','day','special','old','small','boy','garden','orange','much','tell','need','eye','long','face','red','back','drink','room','question']
  }
];
