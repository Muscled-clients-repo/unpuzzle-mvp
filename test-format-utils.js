// Test the format utilities
const { formatDuration, formatFileSize } = require('./src/lib/format-utils.ts')

console.log('🧪 Testing formatDuration:')
console.log('30 seconds:', formatDuration(30))        // 0:30
console.log('330 seconds:', formatDuration(330))      // 5:30
console.log('1530 seconds:', formatDuration(1530))    // 25:30
console.log('3600 seconds:', formatDuration(3600))    // 1h
console.log('4830 seconds:', formatDuration(4830))    // 1h 20m
console.log('9930 seconds:', formatDuration(9930))    // 2h 45m

console.log('\n🧪 Testing formatFileSize:')
console.log('500 bytes:', formatFileSize(500))              // 500 B
console.log('1500 bytes:', formatFileSize(1500))            // 1.5 KB
console.log('1500000 bytes:', formatFileSize(1500000))      // 1.4 MB
console.log('1500000000 bytes:', formatFileSize(1500000000)) // 1.4 GB