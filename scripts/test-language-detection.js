// 测试语言检测器对中文词汇的检测结果
// 这个脚本用于验证语言检测器是否能正确识别中文词汇
// 
// 使用方法：
// 1. 在浏览器中打开任意页面
// 2. 打开开发者工具控制台
// 3. 复制并粘贴这个脚本到控制台运行

console.log('开始测试语言检测器...');

// 检查是否有语言检测器
if (typeof LanguageDetector === 'undefined') {
  console.error('LanguageDetector 未定义，请确保在有ADHD插件的页面中运行此测试');
} else {
  // 创建语言检测器实例
  const detector = new LanguageDetector();

// 测试中文词汇
const chineseWords = [
  '中国', '人民', '发展', '经济', '社会', '建设', '改革', '开放',
  '政府', '国家', '企业', '市场', '投资', '技术', '创新', '科技',
  '教育', '文化', '健康', '环境', '能源', '交通', '城市', '农村'
];

// 测试英文词汇
const englishWords = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his'
];

console.log('=== 语言检测器测试结果 ===\n');

console.log('中文词汇检测结果:');
chineseWords.forEach(word => {
  const detected = detector.detectLanguage(word);
  console.log(`"${word}" -> ${detected}`);
});

console.log('\n英文词汇检测结果:');
englishWords.forEach(word => {
  const detected = detector.detectLanguage(word);
  console.log(`"${word}" -> ${detected}`);
});

// 统计检测结果
const chineseResults = chineseWords.map(word => detector.detectLanguage(word));
const englishResults = englishWords.map(word => detector.detectLanguage(word));

const chineseCorrect = chineseResults.filter(lang => lang === 'zh').length;
const englishCorrect = englishResults.filter(lang => lang === 'en').length;

console.log('\n=== 检测准确率统计 ===');
console.log(`中文词汇检测准确率: ${chineseCorrect}/${chineseWords.length} (${(chineseCorrect/chineseWords.length*100).toFixed(1)}%)`);
console.log(`英文词汇检测准确率: ${englishCorrect}/${englishWords.length} (${(englishCorrect/englishWords.length*100).toFixed(1)}%)`);

  // 检查是否存在问题
  if (chineseCorrect < chineseWords.length * 0.8) {
    console.log('\n⚠️  警告: 中文词汇检测准确率过低！');
  }

  if (englishCorrect < englishWords.length * 0.8) {
    console.log('\n⚠️  警告: 英文词汇检测准确率过低！');
  }
}