const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\avmir\\.gemini\\antigravity-ide\\brain\\7214523b-8cb7-4c78-a1ea-613d990d7c5e\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('"step_index":893')) {
      const data = JSON.parse(line);
      console.log(data.content);
      break;
    }
  }
}

run().catch(console.error);
