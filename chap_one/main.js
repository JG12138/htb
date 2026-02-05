/* 下垂bar */
const $=s=>document.querySelector(s), rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const gLabel=g=>({carb:"碳水组",protein:"蛋白质组",seasoning:"调味料组",veg:"蔬菜组"}[g]||"—");


/*DB */
const DB = {

  "橙知": { luck: 1, direction: 7, stamina: 9 },
  "丹": { luck: 4, direction: 4, stamina: 4 },
  "Eric": { luck: 10, direction: 10, stamina:10 },
  "Ethan": { luck: 4, direction: 4, stamina: 4 },
  "阿基米德": { luck: 4, direction: 4, stamina: 4 },
  "Friedrich": { luck: 4, direction: 4, stamina: 4 },
  "Honey": { luck: 4, direction: 4, stamina: 4 },
  "J.O.": { luck: 4, direction: 4, stamina: 4 },
  "Kazares": { luck: 4, direction: 5, stamina: 9 },
  "奥利弗": { luck: 10, direction: 3, stamina: 8 },
  "Matt": { luck: 4, direction: 2, stamina: 5 },
  "Mubiru": { luck: 3, direction: 8, stamina: 7 },
  "Samuel": { luck: 100, direction: 100, stamina: 100 },
  "Thomas": { luck: 9, direction: 9, stamina: 9 },
  "卡莱比": { luck: 1, direction: 2, stamina: 3 },
  "叶澄希": { luck: 4, direction: 4, stamina: 4 },

  "Amber": { luck: 0, direction: 0, stamina: 0 },
  "Cela": { luck: 4, direction: 4, stamina: 4 },
  "Jeffrey": { luck: 9, direction: 6, stamina: 6 },
  "玛顿": { luck: 4, direction: 4, stamina: 4 },
  "Maya": { luck: 5, direction: 9, stamina: 8 },
  "马塞拉": { luck: 8, direction: 2, stamina: 5 },
  "Melusine": { luck: 4, direction: 6, stamina: 7 },
  "Naya": { luck: 4, direction: 4, stamina: 4 },
  "Romaine": { luck: 4, direction: 4, stamina: 4 },
  "向林木": { luck: 7, direction: 7, stamina: 8.5 },
  "奈芙": { luck: 10, direction: 10, stamina: 10 },
  "Zurabia": { luck: 4, direction: 4, stamina: 4 },
  "Moira": { luck: 4, direction: 4, stamina: 4 },
  "Erla": { luck: 3, direction: 8, stamina: 7 },
  "Josephine": { luck: 5, direction: 3, stamina: 7 },
  "Oliven": { luck: 5, direction: 6, stamina: 7 }

};


//名字害死我咧
const normalizeName = (str) => {
  return str
    .trim()                         // 前后空格
    .replace(/\s+/g,"")             // 中间空格
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 65248)
    )                               // 全角转半角
    .toLowerCase();                 // 小写
};

const DB_NORMALIZED = {};
Object.entries(DB).forEach(([name, stats]) => {
  DB_NORMALIZED[normalizeName(name)] = stats;
});



/* state (refresh => reinit => cleared by default) */
/*我的亲亲全局变量*/
const S={name:"",group:"",stats:{luck:4,direction:4,stamina:4},tokens:0,scene:"camp_intro",hist:[],lastRoll:null};
const reset=()=>Object.assign(S,{
  name:"",group:"",
  stats:{luck:4,direction:4,stamina:4},
  tokens:0,scene:"camp_intro",hist:[],lastRoll:null,
  check:{}
});

/* dice 数值高就成功率大，真写的我满头大汗了*/
const roll = (stat, tag) => {

  let effectiveStat;

  if (stat <= 0) {
    // 底层保底：1~4 随机
    console.log("stat=0 detected: too weak, using random 1~4");
    effectiveStat = rnd(1, 4);

  } else if (stat >= 10) {
    // 吹牛惩罚：4~8 随机
    console.log("stat over 10 detected: overconfident, using random 4~8");
    effectiveStat = rnd(4, 8);

  } else {
    // 正常情况：1~9 → capped 到 8
    effectiveStat = Math.min(stat, 8);
  }

  const d = rnd(1, 10);
  const ok = d <= effectiveStat;

  console.log(
    `[ROLL] ${tag} d10=${d} <= ${effectiveStat} (raw=${stat}) ? ${ok ? "SUCCESS" : "FAIL"}`
  );

  return { d, ok, effectiveStat };
};


// 每条路线最多
const resetRouteTokens = (routeTag="") => {
  S.tokens = 0;
  S.check = {};        
  console.log(`[TOKENS] reset -> tokens=0 ${routeTag?`(${routeTag})`:""}`);
};

const addToken = (reason="") => {
  const before = S.tokens;
  S.tokens = Math.min(2, S.tokens + 1);  
  console.log(`[TOKENS] +1 ${reason} ${before} -> ${S.tokens}`);
};


const checkOnce = (key, stat, tag) => {
  const { d, ok } = roll(S.stats[stat], tag);
  S.check[key] = { d, ok, stat };
  if (ok) addToken(`明投成功(${key}:${stat})`);
  return ok;
};


const hiddenRoll = (stat, tag) => {
  const { ok } = roll(S.stats[stat], tag);
  if (ok) addToken(`暗投成功(${stat})`);
  else console.log(`[TOKENS] 暗投失败(${stat}) tokens=${S.tokens}`);
  return ok;
};

const hiddenLuck = () => hiddenRoll("luck", "暗骰幸运(运气)");
const hiddenStamina = () => hiddenRoll("stamina", "暗骰耐力");


/* loot (for test) */
const pickN = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) {
    out.push(a.splice(rnd(0, a.length - 1), 1)[0]);
  }
  return out;
};

const GROUPS=["carb","protein","seasoning","veg"];
const groupOk=g=>GROUPS.includes(g);
const tier=()=>S.tokens>=2?"高级":S.tokens===1?"一般":"眉笔";

const getLoot = (group, t) => {
  const g = groupOk(group) ? group : "protein";
  const table = LOOT[g] || LOOT.protein;
  const pool = table[t] || table["眉笔"];

  let n;
  if (t === "高级") n = 4;
  else if (t === "一般") n = 3;
  else n = 2; // 眉笔

  return pickN(pool, n).join("、");
};


/*记得倒回来重新检查这个池子*/
const LOOT = {
  carb: {
    高级: ["细意面","通心粉","千层面","香米","土豆","红薯","玉米饼","贝果","可颂","白面包","司康","年糕","甜玉米","手工拉面","乌冬面","披萨饼胚"],
    一般: ["米","小土豆","贝果","玉米","火鸡面","红薯","松饼","玉米饼","法棍","全麦面包","披萨饼胚","饺子皮","细意面"],
    眉笔: ["苏打饼干","手指饼干","方便米饭","方便面","即食燕麦","草莓味蛋白棒","汉堡坯","玉米粒罐头","热狗面包","硬法棍"]
  },

  protein: {
    高级: ["一打鸡蛋","牛奶","猪五花","猪里脊","海参","扇贝肉","开背龙虾","带皮三文鱼","龙利鱼","羊排","和牛肉片","战斧牛排","鲟鱼子酱","羊里脊肉","鹅肝罐头","帝王蟹蟹腿","火鸡腿","牛舌"],
    一般: ["四颗鸡蛋","牛奶","鸡肉肠","培根","豆腐","虾滑","鸡腿肉","牛仔骨","鸡翅","羊排","硬质芝士","午餐肉","牛肉丸","扇贝","金枪鱼罐头","鱼丸","鳕鱼"],
    眉笔: ["一颗鸡蛋","鲱鱼罐头","罐头豆子","肉松","蟹柳","牛肉干","芝士片","合成牛排","汉堡肉","香肠","鸡胸肉","培根","午餐肉"]
  },

  seasoning: {
    高级: ["盐","糖","黑胡椒","番茄酱","蜂蜜","辣椒酱","孜然","酱油","柠檬汁","香草黄油","咖喱块","韩式辣酱","红酒","欧芹碎","特辣火锅底料","迷迭香","蒜粉","洋葱粉","草莓酱","沙拉酱","蛋黄酱"],
    一般: ["盐","糖","黑胡椒","酱油","番茄酱","辣椒酱","蜂蜜","柠檬汁","蛋黄酱","沙拉酱","黄芥末酱","黄油","黑蒜酱","咖喱块","草莓酱"],
    眉笔: ["盐包","糖包","小包果酱","麦O劳黄芥末","麦O劳番茄酱","芥末","几块红糖","小包酱油"]
  },

  veg: {
    高级: ["洋葱","胡萝卜","罗勒","青椒","香菇","口蘑","圣女果","番茄","蟹味菇","松露","南瓜","黄瓜","牛油果","茄子","青菜","菠菜","西兰花","甜豌豆","紫甘蓝"],
    一般: ["洋葱","番茄","彩椒","芝麻菜","菠菜","西兰花","芦笋","莴苣","孢子甘蓝","酸黄瓜","芹菜","海带","包菜","香菇","胡萝卜","韭葱"],
    眉笔: ["芝麻菜","海带丝","榨菜","泡菜","生菜","甜菜根","秋葵","洋蓟","羽衣甘蓝","菠菜罐头"]
  }
};



const resultTextFirepit=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (firepit) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于找到了异常的源头。
在石头下方，垫着一层隔热垫，隔热垫里包着一个防水袋。
防水袋封得很仔细，明显是为了避免被灰烬和湿气影响。
你没有太多时间细看内容，只能迅速确认这是节目组提前藏好的物资。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
虽然没有完全挖出所有隐藏结构，但你还是在灰烬下找到了一些被刻意保护的物品。
它们被藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="眉笔") return `你检查了很久。
虽然地面确实比周围干燥，但并没有找到明确的隐藏结构或容器。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};

const resultTextTent=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (tent) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于确认了异常的源头。
在帐篷底部的夹层里，你摸到一层不该出现的硬挺边缘。
你小心拆开折叠处，发现里面塞着一个防水袋，外面还额外包了防潮材料。
这显然是节目组提前放置、并确保不受潮的物资。

你没有太多时间细看内容，只能迅速确认这是可用的补给。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
虽然你没能完全拆开所有折叠夹层，但你还是在防潮垫边缘摸到一些被保护起来的小物件。
它们藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="眉笔") return `你检查了很久。

帐篷的折叠、绑绳和防潮垫看起来确实被重新整理过，
但你没能找到明确的隐藏夹层或容器。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};


const resultTextTrash=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (trash) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于确认了异常的源头。
在“可回收”袋子的内层，你摸到一个被塑料膜反复缠绕的防水袋。
防水袋外面还垫了干燥剂，明显是为了避免受潮和异味污染。
这不是垃圾，这是节目组提前藏好的补给点。

你没有太多时间细看内容，只能迅速确认这是可用物资。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
你没能把整个袋子翻到底，但在内层夹缝里还是摸到一些被塑料膜保护起来的小物件。
它们藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="眉笔") return `你检查了很久。
垃圾袋外层确实像被动过，但你没能找到明确的内层防水袋或隐藏夹层。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手套上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。

不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};

const firepitApproachText=()=>`你走近篝火堆。
木柴已经烧过一轮，灰烬被简单清理，但并不彻底。
石头围成的火圈看起来被重新摆过一次。
`;

const firepitLookText=()=>{
  const ok = S.check.firepit?.ok; // tf
  const suc=`
你看起来运气不错。

你注意到灰烬的分布有些奇怪。
有几块石头下面几乎没有灰，应该是被人临时挪开，又匆匆放回原位。
这里显然不只是普通的露营痕迹。`;

  const fail=`
你仔细看了看篝火堆。

灰烬和木炭混在一起，看起来已经被风和脚步打乱过好几次。
石头的位置虽然不算整齐，但更像是游客随手调整的结果。
如果这里真的藏了什么，至少第一眼并不明显。`;

  return (ok?suc:fail).trim();
};

const firepitContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;


/* firepit page 2: 深入 + 暗骰提示 */
const firepitDeepText = (mode)=>(
`你蹲下身，小心地检查。灰烬很轻，很快就被拨开。
石头下面的地面比周围要干燥得多，应该是被刻意保护过。

这里确实有人提前动过手脚。

你发现了——？`
);



//帐篷堆
const tentApproachText=()=>`你来到帐篷堆旁。

几顶帐篷被整齐地卷起，用绳子简单固定，像是刚被收走不久。
`;

const tentLookText=()=>{
  const ok = S.check.tent?.ok; // tf
  const suc=`
你看起来运气不错。

你注意到其中一顶帐篷的绑绳系法和其他的不太一样。
帐篷底部的防潮垫被重新折叠过，折痕很新。
这不像是外行游客随手收拾的痕迹。
这里显然被人刻意整理过。
`;

  const fail=`
你检查了帐篷堆。

帐篷内部干净而普通，
只有常见的露营用品和残留的泥土痕迹。
虽然看起来有人整理过，但更像是正常的收营行为。
暂时看不出明显异常。
`;

  return (ok?suc:fail).trim();
};

const tentContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;

/* tent page 2: 深入 + 暗骰提示 */
const tentDeepText = (mode)=>(
`你蹲下身，把帐篷稍微挪开。

布料摩擦着地面，露出下面被压得很实的泥土。
防潮垫下方明显比周围要干燥，可能是为了防潮而特意处理过。

这里确实有人提前动过手脚。

你发现了——？`
);


//垃圾分类点
const trashApproachText=()=>`你走近垃圾分类点。

几个垃圾袋被扎得很紧，分类牌歪歪斜斜地挂着。
最上面一层看起来像是刚被人翻动过，但又压回了原位。
`;

const trashLookText=()=>{
  const ok = S.check.trash?.ok; // tf
  const suc=`
你看起来运气不错。

你注意到其中一个“可回收”袋子的扎口方式很怪：打的是双结，而且结口朝内。
更奇怪的是，袋子外侧几乎没有油渍，却有一小块干净的塑料膜反光。

这不像是普通游客的垃圾处理方式。
`;

  const fail=`
你仔细检查了垃圾分类点。

袋子里大多是正常的食物包装、纸杯和湿纸巾，
还有一些被雨水浸得发软的纸板。
看起来只是普通的露营垃圾堆放处。

如果这里真的藏了什么，至少第一眼并不明显。
`;

  return (ok ? suc : fail).trim();
};

const trashContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;

/* trash page 2: 深入 + 暗骰提示 */
const trashDeepText = (mode)=>(
`你蹲下身，戴上手套，把袋口慢慢松开一点。

气味并不算重，反而像是有人刻意把“真正的垃圾”放在外层做遮掩。
你把几层包装拨开，指尖碰到一处不该出现的硬挺触感。

这里确实有人提前动过手脚。

你发现了——？`
);


/* scenes */
const SC={
  camp_intro:{
    t:"露营地 · 开场",
    b:`你正身处于山脚的露营地。

这里显然是一处经常被登山者使用的地点，地面被无数来往的旅者踩的很实。 
不远处的篝火堆里还残留着未烧尽的木柴，几顶帐篷被随意收起，像是有人刻意留下的“布景”
——当然啦，节目组怎么可能让嘉宾们风餐露宿呢！哎？不会吗？ 

节目组显然提前进入过这里，但真正有用的东西不可能像陷入热恋的人类一样留在明面上为你张开双臂。
但不管怎么说，你最好尽快找到你需要的东西。

不远处是一栋无人值守的应急旅游中心，
再往里走，是通向密林的旧小路，
另一侧则能听见河水流动的声音。`,
    o:[
      ["A","保守点，留在露营地查找 (运气)","camp_search"],
      ["B","聪明点，前往旅游中心（方向感，运气）","center"],
      ["C","大胆点，顺着小路进入密林（方向感，耐力）","forest"],
      ["D","随意点，沿着河流查看情况（耐力）","river"]
    ]
  },

  camp_search:{
    t:"露营地 · 搜索点",
    b:`你选择留在露营地搜寻。

这里看起来最普通，但也正因为如此，很多人不会仔细检查。
如果节目组真的藏了什么，这里未必是最差的选择吧？

一处已经熄灭的篝火堆位于营地正中，焦黑的石块围成一圈，灰烬尚未完全散尽；
几顶被匆忙收起的帐篷堆在一侧，防水布和支架混在一起，像是被随手丢下；
而稍远一些的树林边缘，则堆着几个半满的垃圾箱，气味并不算好闻。

`,
    o:[
      ["A","检查篝火堆","camp_firepit"],
      ["B","检查收起来的帐篷","camp_tent"],
      ["C","检查垃圾分类点","camp_trash"],
      ["D","还是算了，重新想想吧。","camp_intro"]
    ]
  },

  /*和我的篝火说去吧*/
  /* Page 0：接近（不掷骰） */
camp_firepit:{
  t:"露营地 · 篝火堆",
  on:()=>resetRouteTokens("firepit"),
  b:()=>firepitApproachText(),
  o:[
    ["A","仔细看看","camp_firepit_look"],
    ["B","算了，不要浪费时间了","camp_search"]
  ]
},


  /* Page 1：仔细看看（这里才明投） */
  camp_firepit_look:{
    t:"露营地 · 篝火堆（观察）",
    on:()=>checkOnce("firepit","luck","明投运气(篝火堆观察)"),
    b:()=>firepitLookText(),
    o:[
      ["A","用树枝拨开灰烬，检查石头下方","camp_firepit_deepA"],
      ["B","挪动火圈边缘的石头查看底部","camp_firepit_deepB"],
      ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
    ]
  },

    /* Page 2：深入（暗骰） */
  camp_firepit_deepA:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("A"),
    o:[["→","揭晓结果","camp_firepit_result"]]
  },
  camp_firepit_deepB:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("B"),
    o:[["→","揭晓结果","camp_firepit_result"]]
  },

  /* 篝火结算 */
  camp_firepit_result:{
    t:"露营地 · 篝火堆 · 结算",
    b:()=>resultTextFirepit(),
  },



/*和我的帐篷堆说去吧*/
    /* 帐篷堆：Page 0 接近（不掷骰） */
camp_tent:{
  t:"露营地 · 帐篷堆",
  on:()=>resetRouteTokens("tent"),
  b:()=>tentApproachText(),
  o:[
    ["A","仔细看看","camp_tent_look"],
    ["B","算了，不要浪费时间了","camp_search"]
  ]
},


  /* 帐篷堆：Page 1 仔细看看（这里才明投） */
  camp_tent_look:{
    t:"露营地 · 帐篷堆（观察）",
    on:()=>checkOnce("tent","luck","明投运气(帐篷堆观察)"),
    b:()=>tentLookText(),
    o:[
          ["A","解开帐篷绑绳，查看内部和夹层","camp_tent_deepA"],
          ["B","检查帐篷下方的地面和防潮垫","camp_tent_deepB"],
          ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
    ]
  },

  /* 帐篷堆：Page 2 深入（暗骰） */
  camp_tent_deepA:{
    t:"露营地 · 帐篷堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>tentDeepText("A"),
    o:[["→","揭晓结果","camp_tent_result"]]
  },
  camp_tent_deepB:{
    t:"露营地 · 帐篷堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>tentDeepText("B"),
    o:[["→","揭晓结果","camp_tent_result"]]
  },

  /* 帐篷结算 */
  camp_tent_result:{
    t:"露营地 · 帐篷堆 · 结算",
    b:()=>resultTextTent(),
  },


  /*和我的垃圾分类点说去吧*/
  /* 垃圾点：Page 0 接近（不掷骰） */
camp_trash:{
  t:"露营地 · 垃圾分类点",
  on:()=>resetRouteTokens("trash"),
  b:()=>trashApproachText(),
  o:[
    ["A","仔细看看","camp_trash_look"],
    ["B","算了，不要浪费时间了","camp_search"]
  ]
},


  /* 垃圾点：Page 1 仔细看看（这里才明投） */
  camp_trash_look:{
    t:"露营地 · 垃圾分类点（观察）",
    on:()=>checkOnce("trash","luck","明投运气(垃圾分类点观察)"),
    b:()=>trashLookText(),
    o:[
          ["A","掀开外层包装，摸索袋子内层","camp_trash_deepA"],
          ["B","检查扎口和袋底夹层","camp_trash_deepB"],
          ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
        ]
  },


  /* 垃圾点：Page 2 深入（暗骰） */
  camp_trash_deepA:{
    t:"露营地 · 垃圾分类点（继续）",
    on:()=>hiddenLuck(),
    b:()=>trashDeepText("A"),
    o:[["→","揭晓结果","camp_trash_result"]]
  },
  camp_trash_deepB:{
    t:"露营地 · 垃圾分类点（继续）",
    on:()=>hiddenLuck(),
    b:()=>trashDeepText("B"),
    o:[["→","揭晓结果","camp_trash_result"]]
  },

  /* 垃圾点结算 */
  camp_trash_result:{
    t:"露营地 · 垃圾分类点 · 结算",
    b:()=>resultTextTrash(),
  },

// 旅游中心
// Page 0：接近
center:{
  t:"旅游中心 · 门口",
  on:()=>resetRouteTokens("center"),
  b:`你走到了旅游中心门口。

虽然外观略显窘迫，但这座应急旅游中心的内部比你想象中大得多。

出于某种原因，这里似乎被节目组征用并“清理”过。
大厅、走廊、储藏间彼此相连，杂物被随意堆放。
如果想在这里过夜，大概也不会有人阻止你——前提是你别太招摇。

这里很大，也很乱。想不浪费时间就需要选对方向。`,
  o:[
    ["A","进去看看","center_route"],
    ["B","算了，不在这里浪费时间了，换个地方吧。","camp_intro"]
  ]
},

// Page 1：路线判断
center_route:{
  t:"旅游中心 · 选路",
  on:()=>checkOnce("center","direction","明投方向感(旅游中心选路)"),
  b:()=>{
    const ok = S.check.center?.ok;
    const suc = `
你对室内结构有一种直觉般的把握。

你扫了一眼指示牌残留的胶痕、地面拖拽的灰印，立刻判断出人流更可能去过的区域。
如果节目组藏了什么，大概率就在最不显眼、但最方便取走的地方。`;

    const fail = `
你在门口停了几秒。

走廊四通八达，指示牌残缺不全。
你只能凭感觉随便挑一条路走——反正时间也不会因为你犹豫而变多。`;

    return (ok ? suc : fail).trim();
  },
  o:[
    ["A","进入服务大厅与前台区域","center_hall"],
    ["B","沿走廊往深处找储藏区","center_storage"],
    ["C","绕到后方，看看员工休息室","center_staff"],
    ["D","算了，不在这里浪费时间了，换个地方吧。","camp_intro"]
  ]
},

// Page 2：深入
center_hall:{
  t:"旅游中心 · 前台区域",
  b:()=>`
你进入服务大厅，空气里有一股消毒水混着潮味的味道。

前台台面被擦得过分干净，干净到不自然，像是节目组为了收视率做出的努力。
而前台后方的钥匙墙空了一大半。
显然有人刻意把你不该摸的东西全部撤走，只留下可见的壳。

你注意到两处细节：
一是抽屉缝里卡着一小片塑封纸角；
二是台面边缘有一圈很浅的胶带残痕，像贴过告示或清单。`.trim(),
  o:[
    ["A","靠近前台抽屉与台面边缘，继续检查","center_hall_continue"],
    ["B","算了，不在这里浪费时间了，换个地方吧。","center"]
  ]
},


center_hall_continue:{
  t:"旅游中心 · 前台区域（继续）",
  b:`你看了一眼走廊深处的阴影，又把注意力拉回前台。

你蹲下身，把手指伸进抽屉缝隙，沿着台面边缘一点点摸过去。
灰尘很薄，说明有人不久前来过。

你摸到了那片塑封纸角—————`,


  o:[["→","轻轻一拉","center_hall_deep"]]
},


center_hall_deep:{
  t:"旅游中心 · 前台区域（深入）",
  on:()=>hiddenLuck(),
  b:()=>`你小心翼翼地拉动那张塑料纸———它没有断，反而带出一条更长的塑封条。

塑封条下面压着一张被撕掉一半的打印纸。
字被撕得只剩几行，但足够你确认：这不是游客信息，这是节目组用的投放记录。

虽然只有一小条，但你把能读到的部分迅速记下来，并立刻前往了这些点位寻找。

你发现了———？`,
  o:[["→","揭晓结果","center_result"]]
},



// Page 2：储藏区
center_storage:{
  t:"旅游中心 · 储藏区",
  b:()=>`你沿着走廊往深处走。
地面有很浅的拖拽灰印，越往里，空气越干，消毒水味也淡了，取而代之的是纸箱和干燥剂的味道。

你最终停在一扇虚掩的门前：储藏区。

里面很乱：折叠椅、救援背包、备用雨披堆在一起。
但越乱的地方越适合藏东西，只要你运气好到足够看出哪里是人为造就的杂乱。`,

  o:[
    ["A","翻开角落里堆着的纸箱","center_storage_deepA"],
    ["B","掀开防水布，看看下面压着什么","center_storage_deepB"],
    ["C","算了，不在这里浪费时间了，换个地方吧。","center"]
  ]
},

// Page 3：深入 A（暗骰）
center_storage_deepA:{
  t:"旅游中心 · 储藏区（继续）",
  on:()=>hiddenLuck(),
  b:()=>`
你蹲下身，把那堆纸箱的最上层轻轻挪开。
纸箱发出干燥的摩擦声，声音在狭窄的储藏间里显得格外清楚。

上层的纸箱很轻，里面几乎是空的，只装着几张折叠过的说明纸和塑料包装。

但底层有一只箱子却异常沉。
你刚一碰到，就感觉重量完全不对。
四角贴着新的透明胶带，胶带边缘甚至没有灰尘。


`.trim(),
  o:[["→","用指甲抠开透明胶带","center_storage_deepA_con"]]
},

center_storage_deepA_con:{
  t:"旅游中心 · 储藏区（深入）",
  b:()=>`你用指甲将透明胶带抠开一道缝，然后顺势打开了纸箱。

里面的光线很暗，你先听见的是塑料膜被挤压时发出的细碎声响。
纸箱内壁很干净，没有灰尘，也没有潮气。

你发现了———？`,
  o:[["→","揭晓结果","center_result"]]

},

// Page 3：深入 B（暗骰）
center_storage_deepB:{
  t:"旅游中心 · 储藏区（继续）",
  on:()=>hiddenLuck(),
  b:()=>`
你掀开那张防水布。

布料掀起时扬起一层薄薄的灰尘，空气里混着纸箱和干燥剂的味道。
布下面压着的不是杂物，而是一排被刻意塞得很紧的救援毯和备用物资袋。

最上层的毯子摸起来很薄，但下面那一层却明显多出了一点硬度，似乎有什么东西夹在里面。
`.trim(),
  o:[["→","沿着边缘摸过去","center_storage_deepB_con"]]
},

center_storage_deepB_con:{
  t:"旅游中心 · 储藏区（深入）",
  b:()=>`你沿着最边缘摸过去。

救援毯的触感冰凉而光滑，而后你的指尖很快碰到一处不该存在的塑料轮廓。
那东西被夹在两层毯子之间，外面还多包了一层塑封膜，避免摩擦发出声响。

你小心地把毯子掀开一点。

你发现了——？`,
  o:[["→","揭晓结果","center_result"]]

},



// Page 2：深入 C（进入员工休息室）
center_staff:{
  t:"旅游中心 · 员工休息室",
  b:()=>`
你绕到后方的员工休息室。

门没锁，但卡得有点紧，不知道什么人会擅闯无人看守的员工休息室。
但节目组都把整个旅游中心清空了，进入员工休息室也无可厚非吧。

`.trim(),
o:[
    ["A","打开门并进入员工休息室","center_staff_con"],
    ["B","算了，不在这里浪费时间了，换个地方吧。","center_route"]
  ]
},

center_staff_con:{
t:"旅游中心 · 员工休息室",
  b:()=>`
你走了进去。

这里比大厅更安静，只有老旧灯管发出的轻微电流声。
一张折叠桌靠墙摆着，桌上有几个一次性纸杯，但没有水。
沙发垫被掀起过又压回原位，边缘的褶皱很新。

紧贴着收纳柜的垃圾桶看起来是空的。

你决定先抓住最明显的两处细节继续查。
`.trim(),
  o:[
    ["A","检查沙发与坐垫下方","center_staff_deepA"],
    ["B","检查柜子与垃圾桶周围","center_staff_deepB"],
    ["C","算了，不在这里浪费时间了，换个地方吧。","center_route"]
  ]
},


// Page 3：深入 A（暗骰）
center_staff_deepA:{
  t:"旅游中心 · 员工休息室（继续）",
  on:()=>hiddenLuck(),
  b:()=>`
你走到沙发前，把坐垫掀起一点。
灰尘不多，说明这里不久前被人动过。

沙发底下的木板边缘还有一圈胶带残痕，像曾经固定过某样东西。

你伸手进去摸索，指尖碰到一层塑封膜的滑感。
`.trim(),
  o:[["→","把塑封膜慢慢抽出来","center_staff_deepA_con"]]
},

center_staff_deepA_con:{
  t:"旅游中心 · 员工休息室（深入）",
  b:()=>`你把那层塑封膜一点点抽出来。

它被折得很薄，边缘还压着一小片干燥剂纸包，明显是为了防潮防异味。

塑封膜里包着一个扁平的硬物，
重量不大，但摸起来非常规整，像一份被刻意保护的物资。

你发现了——？`,
  o:[["→","揭晓结果","center_result"]]
},


// Page 3：深入 B（暗骰）
center_staff_deepB:{
  t:"旅游中心 · 员工休息室（继续）",
  on:()=>hiddenLuck(),
  b:()=>`
你转向柜子和垃圾桶。

柜门半掩着，里面放着几件皱巴巴的雨披和一次性手套，看起来像是救援人员用过的备用物品。

你蹲下查看垃圾桶。
桶里几乎是空的，只剩下一点薄薄的灰尘。
但当你从侧面看时，却发现垃圾桶内壁的高度，和外壳的高度似乎对不上。

内胆比你预想的要浅一截。
`.trim(),
  o:[["→","手伸到垃圾桶底部摸摸看","center_staff_deepB_con"]]
},

center_staff_deepB_con:{
  t:"旅游中心 · 员工休息室（深入）",
  b:()=>`你伸手探进桶底边缘，指尖碰到一个不该出现在这里的硬角。不是纸，也不是塑料杯。

你顺着内壁用力一掀。

内胆下面果然藏着一层夹层空间。
那东西被卡在内胆与外壳之间，外面还缠着一层薄薄的塑料膜，
可能是为了避免晃动发声，也避免沾上真正的垃圾气味。

你发现了——？`,
  o:[["→","揭晓结果","center_result"]]
},


// 结算
center_result:{
  t:"旅游中心 · 结算",
  b:()=>{
    const t = tier();
    const got = getLoot(S.group, t);
    console.log(`[RESULT] (center) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

    if(t==="高级") return `你很确定自己找对了位置。
这是被刻意藏起来、并且方便节目组随时回收的食材。
你把能带走的东西迅速收好。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
你带着东西快步离开旅游中心，返回露营地。`;

    if(t==="一般") return `你翻到了被保护起来的补给。
虽然不算多，但总比没有好。
你迅速把能带走的部分收好，决定见好就收。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
你带着找到的东西离开旅游中心，返回露营地。`;

      if(t==="眉笔")    return `这里确实有东西，但似乎不怎么契合你的想象。
也许你走错了，也许节目组已经取走了大部分。
继续耗下去意义不大。节目组总不会让你饿死的。

你获得了：<span class="loot">${got}</span>

你拍了拍手上的灰，离开旅游中心，返回露营地。`;
        }
},


// 密林线

// Page 0：接近
forest:{
  t:"密林 · 入口",
  on:()=>resetRouteTokens("forest"),
  b:`你顺着那条几乎被杂草吞没的小路走进密林。

树冠在头顶合拢，光线一下子暗了下来。
地面覆盖着厚厚一层已经腐败得差不多的落叶，踩上去几乎没有声音。
空气里有湿土和苔藓的气味，偶尔夹着不知名鸟类的叫声。

这里显然不是新手游客常走的路线，被人踩出的小道算不上明显。`,
  o:[
    ["A","继续沿着不明显的小道前进","forest_route"],
    ["B","算了，回去吧","camp_intro"]
  ]
},

// Page 1：方向感明骰
forest_route:{
  t:"密林 · 选路",
  on:()=>checkOnce("forest","direction","明投方向感"),
  b:()=>{
    const ok = S.check.forest?.ok;

    const suc = `
你凭着方向感沿路前行。

有一段落叶被踩得更实，
树干上也出现了几道几乎被时间消磨干净的记号。
它们不明显，但足够让你确认：有人刻意沿着这里来回走过。

密林并不是随机的。
至少对知道路线的人来说不是。

很快你发现了几处值得一查的地方。`;

    const fail = `
你在密林里转了几圈。

所有树看起来都差不多，
地面没有明显分叉，只有杂乱的枝叶和藤蔓。
你只能凭直觉选了一条看起来没那么难走的方向。

也许你已经偏离了真正的路线，
但现在回头只会浪费更多体力。`;

    return (ok ? suc : fail).trim();
  },
  o:()=>{
    const ok = S.check.forest?.ok;
    if(ok){
      return [
        ["A","查看面前的倒木与背包","forest_log"],
        ["B","前去检查岩石缝隙","forest_rocks"],
        ["C","看看右侧干涸的小鱼塘","forest_pond"],
        ["D","算了，回去露营地吧","camp_intro"]
      ];
    }
    return [
      ["→","硬着头皮前进","forest_fail_continue"]
    ];
  }
},

// Page 1.5：方向感失败继续
forest_fail_continue:{
  t:"密林 · 硬着头皮前进",
  b:`你决定别再纠结方向。

无论你走没走对路，接下来都只能靠体力硬顶。
你把呼吸压低，拨开树枝往里钻。

你折腾了好一会，前方终于出现了几处值得检查的位置。`,
  o:[
    ["A","查看灌木后面的倒木与背包","forest_log"],
    ["B","检查前面的岩石缝隙","forest_rocks"],
    ["C","看看左侧干涸的小鱼塘","forest_pond"],
  ]
},

// Page 2：倒木点（暗骰耐力）
forest_log:{
  t:"密林 · 倒木与背包点（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(倒木点)"),
  b:`你拨开灌木，来到一片被倒木挡住的小空地。

一棵粗大的树横倒在地上，树根裸露。
倒木和地面之间形成一道低矮的阴影缝隙。
旁边还散落着几根旧绳子和背包扣件。

树干和地面形成的缝隙似乎正好可以让你钻入检查。
`,
  o:[["→","弯腰钻进去检查","forest_log_con"]]
},

forest_log_con:{
    t:"密林 · 倒木与背包点（深入）",
    b:`你压低身体，钻进倒木下方的阴影里。

腐叶和潮湿的泥土贴在手臂和膝盖上，空间比想象中更窄，你几乎只能用一只手向前摸索。

你顺着树根往最里面探去，指尖碰到一处不属于木头或石头的触感。
外层包着防潮膜，明显是人为放置的物品。

你发现了——？
`,
  o:[["→","j揭晓结果","forest_result"]]
},

// Page 2：岩石点
forest_rocks:{
  t:"密林 · 岩石缝隙（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(岩石缝隙)"),
  b:`你沿着坡地向上走，发现一处被藤蔓遮住的岩石堆。

几块巨石相互挤压，在中间形成狭窄的缝隙。
缝隙内部却异常干燥，几乎没有落叶。
`,
  o:[["→","踩着岩石爬上去查看","forest_rocks_con"]]
},

forest_rocks_con:{
  t:"密林 · 岩石缝隙（深入）",
  b:`你用手撑着石面，小心把身体挤进岩石之间。

岩石表面冰凉而粗糙，摩擦着手臂和肩膀。
缝隙越往里越窄，你只能侧着身子伸手摸索。

最里面的石壁上贴着一层防潮膜，被几块碎石压住，位置刚好藏在视线死角里。
如果不是特意钻进来，几乎不可能发现。

你发现了——？`,
  o:[["→","揭晓结果","forest_result"]]
},


// Page 2：小鱼塘
forest_pond:{
  t:"密林 · 干涸的小鱼塘（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(小鱼塘)"),
  b:`你顺着地势下行，脚下的碎石在落叶中轻轻滑动。

前方出现一个干涸的小鱼塘，可能是之前雨季形成的临时积水洼。
塘底泥土龟裂，边缘堆着几块被垒起的石头，

附近的枯枝被折断后重新摆放过，痕迹很新，与周围自然倒伏的枝叶格格不入。`,
  o:[["→","蹲下扒开枯枝与泥土","forest_pond_con"]]
},

forest_pond_con:{
  t:"密林 · 干涸小鱼塘（深入）",
  b:`你蹲下身，用手拨开泥土和枯枝。

土壤比周围要干燥得多，石头下方形成一个刚好能藏进小包的空洞。
你摸到一层塑料膜包着的硬物，外面还额外垫了防潮材料。

你发现了——？`,
  o:[["→","揭晓结果","forest_result"]]
},


// 结算
forest_result:{
  t:"密林 · 结算",
  b:()=>{
    const t = tier();
    const got = getLoot(S.group, t);
    console.log(`[RESULT] (forest) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

    if(t==="高级") return `你很确定自己找到了真正的藏点。
这里不是随手放置，而是精心挑过的位置，对知道路线的人来说足够方便。

你把能带走的东西迅速收好。

你获得了：<span class="loot">${got}</span>

你没有时间再继续深入密林。
你转身沿着来路离开，返回露营地。`;

    if(t==="一般") return `你在隐蔽的位置翻到了一些补给。
数量不算多，但至少不是空手而归。
你决定见好就收。

你获得了：<span class="loot">${got}</span>

你拍了拍身上的落叶，离开密林，返回露营地。`;

    return `你摸索了好一会儿，却没能拿到想象中的东西。
也许你走偏了路线，也许你来得有点晚了。

继续留在密林里只会消耗体力。节目组总不至于让你饿死。

你获得了：<span class="loot">${got}</span>

你转身离开密林，返回露营地。`;
  }
},

  
// 河流 Page 0：接近
river:{
  t:"河流 · 河岸",
  on:()=>resetRouteTokens("river"),
  b:`你循着水声来到河边。

河水从山上流下，在石块间不断撞击。
水面反着光，看不清底部的情况。

岸边湿滑，石头上长满青苔，
显然不是一个适合久留的地方。
`,
  o:[
    ["A","沿着河岸继续走","river_route"],
    ["B","算了，回露营地","camp_intro"]
  ]
},

// 河流 Page 1：明骰耐力
river_route:{
  t:"河流 · 判断路线",
  on:()=>checkOnce("river","stamina","明投耐力(河流判断)"),
  b:()=>{
    const ok = S.check.river?.ok;

    const suc = `
你很快调整了呼吸和步伐。

虽然水声嘈杂、地面湿滑，但你能控制住身体的重心，不至于被打乱节奏。

这种地形对你来说只是消耗体力，并不会成为阻碍。`;

    const fail = `
你刚靠近河道就感觉脚下发虚。

湿滑的石头和不断变化的水流让你有些吃力，每一步都要花更多力气稳住身体。

不管是前进还是后退都是浪费时间。`;

    return (ok ? suc : fail).trim();
  },
  o:[
    ["A","顺着水流往下走","river_down"],
    ["B","逆着水流往上走","river_up"],
    ["C","直接踏进河道中央","river_mid"],
    ["D","算了，回露营地","camp_intro"]
  ]
},


// Page 2：顺着水流（暗骰耐力）
river_down:{
  t:"河流 · 顺流而下（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(顺流)"),
  b:`你沿着河岸顺着水流方向前行。

河水不算深，但岸边布满湿滑的石头和被水冲倒的枯枝。
你需要不断调整步伐，避免踩进松动的泥土里。

不远处，一片乱石堆挡住了河道的一角，
水流在这里形成一个小小的回旋区。`,
  o:[["→","走近那片乱石堆查看","river_down_con"]]
},

river_down_con:{
  t:"河流 · 顺流而下（深入）",
  b:`你踩着湿滑的石头靠近乱石堆。

几块石头被垒成一个低矮的遮挡结构，内侧却异常干燥。
你伸手探进去，指尖碰到一层塑料膜包裹的硬物，
正好卡在水流打不到的位置。

你发现了——？`,
  o:[["→","揭晓结果","river_result"]]
},


// Page 2：逆着水流（暗骰耐力）
river_up:{
  t:"河流 · 逆流而上（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(逆流)"),
  b:`你选择逆着水流方向前行。

即使你沿着河岸行走，水依旧不断飞溅至你的脚踝，每走一步都要费神稳住身体。
河岸逐渐变窄，两侧的树枝垂得很低，必须低头弯腰才能通过。

前方出现一段被倒木和岩石挡住的河段，
水在这里被迫分成两股，形成一个天然的遮蔽点。`,
  o:[["→","绕过倒木，到河段中央检查","river_up_con"]]
},

river_up_con:{
  t:"河流 · 逆流而上（深入）",
  b:`你扶着倒木，小心挤进岩石与树干之间。

这里几乎听不到远处的水声，只有贴着石壁流动的细小水线。
你发现石头下方有一处被挖开的空隙，外面被枯枝和水草遮住。

空隙内部包着防水布，奖励给逆流而上的勇者——吗？

你发现了——？`,
  o:[["→","揭晓结果","river_result"]]
},

// Page 2：河中央（暗骰耐力）
river_mid:{
  t:"河流 · 河道中央（继续）",
  on:()=>hiddenRoll("stamina","暗骰耐力(河中央)"),
  b:`你决定直接踏入河水中央。

水流比岸边要急得多，冰冷的水瞬间没过小腿。
你不得不用双手扶着石头，一点点向前移动。

河中央有一块被水冲刷得很平的岩石，
石头后方形成一道水流的盲区，从岸上几乎看不到那里。`,
  o:[["→","扶着岩石走到水流盲区","river_mid_con"]]
},

river_mid_con:{
  t:"河流 · 河道中央（深入）",
  b:`你咬牙站稳身体，绕到岩石背后。

这里的水流明显减缓，岩石底部被凿出一个浅浅的凹槽。
凹槽里塞着一包用防水袋层层包裹的物品，还被石头压住固定位置。

你发现了——？`,
  o:[["→","揭晓结果","river_result"]]
},

river_result:{
  t:"河流 · 结算",
  b:()=>{
    const t = tier();
    const got = getLoot(S.group, t);
    console.log(`[RESULT] (river) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

    if(t==="高级") return `你很确定自己找到了真正的藏点。
这些物资被放在只有靠近河道才能发现的位置，既防水，又避开普通人的视线。

你迅速把能带走的东西收好。

你获得了：<span class="loot">${got}</span>

你没有再继续沿河探索，而是返回了露营地。`;

    if(t==="一般") return `你在河道附近翻到了被保护起来的补给。
数量不多，但足够带走。

你获得了：<span class="loot">${got}</span>

你离开河边，返回露营地。`;

    if(t==="眉笔") return `你沿着河流摸索了许久了，却没能获得最想要的东西。
也许你错过了真正的位置，也可能你只是运气太差。

继续停留只会消耗体力。节目组总不至于让你饿死。

你获得了：<span class="loot">${got}</span>

你转身离开河边，返回露营地。`;
  }
}
}




/* render */
function sidebar(){
  $("#who").textContent=S.name||"—";
  $("#grp").textContent=gLabel(S.group);
  $("#luck").textContent=S.stats.luck;
  $("#dir").textContent=S.stats.direction;
  $("#sta").textContent=S.stats.stamina;
}

/*固定流程*/
function render(){
  const sc = SC[S.scene]; if(!sc) return;
  if(sc.on) sc.on();

  $("#t").textContent = sc.t;
  $("#b").innerHTML = (typeof sc.b==="function" ? sc.b() : sc.b).replace(/\n/g,"<br>");

  const box = $("#c"); box.innerHTML = "";
  const opts = (typeof sc.o==="function") ? sc.o() : (sc.o || []);

  opts.forEach(([k,lab,next])=>{
    const btn=document.createElement("button");
    btn.className="choice";
    btn.innerHTML=`<b>${k}｜${lab}</b>`;
    btn.onclick=()=>go(next);
    box.appendChild(btn);
  });

  sidebar();
}

/* nav */
function go(id){ S.hist.push(S.scene); S.scene=id; render(); }

/* start */
function start(name,group){

  if(shouldOpenNamePicker(name)){
    showNamePicker();
    return;
  }

  name=(name||"").trim(); if(!group) return alert("先选择组别。");
  S.name=name||"游客"; S.group=group;
  const key = normalizeName(name);
  S.stats = DB_NORMALIZED[key] || {luck:4,direction:4,stamina:4};
  S.tokens=0; S.scene="camp_intro"; S.hist=[]; S.lastRoll=null;
  S.check = {};
  console.log(`[START] name=${S.name} group=${S.group}`, S.stats);
  $("#setup").style.display="none";
  $("#stats").style.display="block";
  $("#placeholder").style.display="none";
  $("#flow").style.display="block";
  render();
}

/* wire + hard reset on load */
reset();

const startBtn = $("#start");
if(startBtn) startBtn.onclick = ()=>start($("#name").value,$("#group").value);



const isEnglishName = (n) => /^[A-Za-z]/.test(n);

function buildNamePicker(){
  const wrap = document.getElementById("namePicker");
  const zhBox = document.getElementById("nameListZh");
  const enBox = document.getElementById("nameListEn");
  if(!wrap || !zhBox || !enBox) return;

  // 拿 DB 
  const names = Object.keys(DB);

  const zh = names.filter(n => !isEnglishName(n))
    .sort((a,b)=>a.localeCompare(b, "zh-Hans-CN"));

  const en = names.filter(isEnglishName)
    .sort((a,b)=>a.localeCompare(b, "en", { sensitivity:"base" }));

  const makeChip = (name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = name;
    btn.onclick = () => {
      const input = document.getElementById("name");
      if(input) input.value = name;
      hideNamePicker();
    };
    return btn;
  };

  zhBox.innerHTML = "";
  enBox.innerHTML = "";
  zh.forEach(n => zhBox.appendChild(makeChip(n)));
  en.forEach(n => enBox.appendChild(makeChip(n)));

  // 关闭
  wrap.querySelectorAll("[data-close='1']").forEach(el=>{
    el.onclick = hideNamePicker;
  });

  // 右下角打开按钮
  const launch = document.getElementById("namePickerLaunch");
  if(launch) launch.onclick = showNamePicker;
}

function showNamePicker(){
  const wrap = document.getElementById("namePicker");
  if(!wrap) return;

  wrap.hidden = false;
  wrap.inert = false;
  wrap.classList.add("show");

  const closeBtn = wrap.querySelector(".close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function hideNamePicker(){
  const wrap = document.getElementById("namePicker");
  if(!wrap) return;

  // 移焦点
  if (wrap.contains(document.activeElement)) document.activeElement.blur();

  wrap.classList.remove("show");
  wrap.inert = true;
  wrap.hidden = true;

  const input = document.getElementById("name");
  if (input) input.focus({ preventScroll: true });
}

// name 为空 或 不在 DB 
function shouldOpenNamePicker(rawName){
  const n = (rawName || "").trim();
  if(!n) return true;


  if(typeof normalizeName === "function" && typeof DB_NORMALIZED === "object"){
    const key = normalizeName(n);
    return !DB_NORMALIZED[key];
  }


  return !DB[n];
}

// 初始化一次
buildNamePicker();
