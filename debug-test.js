// 调试测试脚本
console.log('=== ADHD Plugin Debug Test ===');

// 测试EnglishNounMorphology类
try {
  const morphology = new EnglishNounMorphology();
  console.log('✓ EnglishNounMorphology 实例化成功');
  
  // 测试复数形式
  const testWords = ['books', 'children', 'tables', 'walked'];
  testWords.forEach(word => {
    const stems = morphology.getPossibleStems(word);
    console.log(`${word} -> stems:`, stems);
  });
} catch (e) {
  console.error('✗ EnglishNounMorphology 错误:', e);
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