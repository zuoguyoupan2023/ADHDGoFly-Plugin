// Debug测试脚本
console.log('=== ADHD Plugin Debug Test ===');

// 导入模块
const EnglishMorphology = require('./content/en-noun-morphology.js');

// 测试EnglishMorphology类
try {
  const morphology = new EnglishMorphology();
  console.log('✓ EnglishMorphology 实例化成功');
  
  // 测试名词复数形式
  console.log('--- 名词复数测试 ---');
  const nounWords = ['books', 'cities', 'knives', 'children'];
  nounWords.forEach(word => {
    const stems = morphology.getPossibleStems(word);
    console.log(`${word} -> [${stems.join(', ')}]`);
  });
  
  // 测试动词变位形式
  console.log('--- 动词变位测试 ---');
  const verbWords = ['walked', 'walks', 'running', 'runs', 'ran'];
  verbWords.forEach(word => {
    const stems = morphology.getPossibleStems(word);
    console.log(`${word} -> [${stems.join(', ')}]`);
  });
  
  // 测试形容词比较级/最高级
  console.log('--- 形容词比较级测试 ---');
  const adjWords = ['bigger', 'biggest', 'better', 'best'];
  adjWords.forEach(word => {
    const stems = morphology.getPossibleStems(word);
    console.log(`${word} -> [${stems.join(', ')}]`);
  });
} catch (e) {
  console.error('✗ EnglishMorphology 错误:', e);
}

// 测试TextSegmenter类
try {
  const segmenter = new TextSegmenter();
  console.log('✓ TextSegmenter 实例化成功');
  
  // 测试基本功能
  const testText = 'The books are on the tables.';
  console.log('测试文本:', testText);
  
  // 模拟词典数据
  const mockDictionary = {
    'book': 'n',
    'table': 'n',
    'the': 'det'
  };
  
  const result = segmenter.segmentSpaceBasedText(testText, mockDictionary);
  console.log('分词结果:', result);
} catch (e) {
  console.error('✗ TextSegmenter 错误:', e);
}

console.log('=== Debug Test Complete ===');