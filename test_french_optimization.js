// 法语优化功能测试文件
// 测试省音、缩写、动词变位和形容词一致性处理

// 引入必要的类
const EnglishMorphology = require('./content/en-noun-morphology.js');
const TextSegmenter = require('./content/text-segmenter.js');

// 创建测试用的法语词典
const frenchDictionary = {
  words: {
    // 基本词汇
    'le': { pos: ['det'] },
    'de': { pos: ['prep'] },
    'à': { pos: ['prep'] },
    'les': { pos: ['det'] },
    'je': { pos: ['pron'] },
    'ce': { pos: ['pron'] },
    'que': { pos: ['conj'] },
    'au': { pos: ['prep'] },
    'du': { pos: ['prep'] },
    'aux': { pos: ['prep'] },
    'des': { pos: ['prep'] },
    
    // 动词原形
    'parler': { pos: ['v'] },
    'finir': { pos: ['v'] },
    'vendre': { pos: ['v'] },
    'être': { pos: ['v'] },
    'avoir': { pos: ['v'] },
    'aller': { pos: ['v'] },
    'faire': { pos: ['v'] },
    'dire': { pos: ['v'] },
    'voir': { pos: ['v'] },
    'savoir': { pos: ['v'] },
    'pouvoir': { pos: ['v'] },
    'vouloir': { pos: ['v'] },
    
    // 形容词基本形式
    'beau': { pos: ['adj'] },
    'nouveau': { pos: ['adj'] },
    'vieux': { pos: ['adj'] },
    'bon': { pos: ['adj'] },
    'grand': { pos: ['adj'] },
    'petit': { pos: ['adj'] },
    'rouge': { pos: ['adj'] },
    'bleu': { pos: ['adj'] },
    'vert': { pos: ['adj'] },
    'noir': { pos: ['adj'] },
    'blanc': { pos: ['adj'] },
    'heureux': { pos: ['adj'] },
    'actif': { pos: ['adj'] },
    'premier': { pos: ['adj'] },
    
    // 名词
    'maison': { pos: ['n'] },
    'chat': { pos: ['n'] },
    'chien': { pos: ['n'] },
    'livre': { pos: ['n'] },
    'table': { pos: ['n'] },
    'voiture': { pos: ['n'] },
    'école': { pos: ['n'] },
    'ami': { pos: ['n'] },
    'temps': { pos: ['n'] },
    'travail': { pos: ['n'] },
    'accord': { pos: ['n'] },
    'centre': { pos: ['n'] },
    'ville': { pos: ['n'] },
    'une': { pos: ['det'] }
  }
};

// 创建TextSegmenter实例
const segmenter = new TextSegmenter();

// 启用高亮开关
segmenter.updateHighlightingToggles({
  noun: true,
  verb: true,
  adjective: true
});

// 测试用例
const testCases = [
  // 省音测试
  {
    name: "省音测试 - l'école",
    text: "l'école",
    expected: "le" // 应该识别为定冠词
  },
  {
    name: "省音测试 - j'ai",
    text: "j'ai",
    expected: "je" // 应该识别为代词
  },
  {
    name: "省音测试 - d'accord",
    text: "d'accord",
    expected: "de" // 应该识别为介词
  },
  
  // 缩写测试（介词不高亮，这是正确的行为）
  {
    name: "缩写测试 - au",
    text: "au",
    expected: "au" // 介词不高亮
  },
  {
    name: "缩写测试 - du",
    text: "du",
    expected: "du" // 介词不高亮
  },
  {
    name: "缩写测试 - aux",
    text: "aux",
    expected: "aux" // 介词不高亮
  },
  {
    name: "缩写测试 - des",
    text: "des",
    expected: "des" // 介词不高亮
  },
  
  // 动词变位测试
  {
    name: "动词变位测试 - parle (-er动词)",
    text: "parle",
    expected: "parler" // 应该识别为动词
  },
  {
    name: "动词变位测试 - finit (-ir动词)",
    text: "finit",
    expected: "finir" // 应该识别为动词
  },
  {
    name: "动词变位测试 - vend (-re动词)",
    text: "vend",
    expected: "vendre" // 应该识别为动词
  },
  {
    name: "动词变位测试 - suis (不规则动词)",
    text: "suis",
    expected: "être" // 应该识别为动词
  },
  {
    name: "动词变位测试 - vais (不规则动词)",
    text: "vais",
    expected: "aller" // 应该识别为动词
  },
  
  // 形容词一致性测试
  {
    name: "形容词一致性测试 - belle",
    text: "belle",
    expected: "beau" // 应该识别为形容词
  },
  {
    name: "形容词一致性测试 - heureuse",
    text: "heureuse",
    expected: "heureux" // 应该识别为形容词
  },
  {
    name: "形容词一致性测试 - active",
    text: "active",
    expected: "actif" // 应该识别为形容词
  },
  {
    name: "形容词一致性测试 - première",
    text: "première",
    expected: "premier" // 应该识别为形容词
  },
  
  // 复合测试
  {
    name: "复合测试 - 完整句子",
    text: "J'ai une belle maison au centre-ville",
    expected: "multiple" // 应该识别多个词性
  }
];

// 运行测试
console.log('=== 法语优化功能测试开始 ===\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  console.log(`测试: ${testCase.name}`);
  console.log(`输入: "${testCase.text}"`);
  
  try {
    const result = segmenter.segmentFrLangText(testCase.text, frenchDictionary);
    console.log(`输出: ${result}`);
    
    // 检查结果是否包含高亮标签
    const hasHighlight = result.includes('<span class="adhd-');
    
    if (hasHighlight) {
      console.log('✅ 测试通过 - 词汇被正确识别并高亮');
      passedTests++;
    } else {
      console.log('❌ 测试失败 - 词汇未被识别或高亮');
    }
  } catch (error) {
    console.log(`❌ 测试出错: ${error.message}`);
  }
  
  console.log('---\n');
}

console.log(`=== 测试结果 ===`);
console.log(`通过: ${passedTests}/${totalTests}`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！法语优化功能工作正常。');
} else {
  console.log('⚠️  部分测试失败，需要进一步调试。');
}

console.log('\n=== 法语优化功能测试结束 ===');