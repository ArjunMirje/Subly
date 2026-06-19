const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\avmir\\.gemini\\antigravity-ide\\brain\\7214523b-8cb7-4c78-a1ea-613d990d7c5e\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('part 2')) {
      console.log(`Line ${lineCount}:`);
      console.log(line.substring(0, 500) + '...');
    }
  }
}

run().catch(console.error);
