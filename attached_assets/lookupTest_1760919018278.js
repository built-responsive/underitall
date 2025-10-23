import lookupPrice from './lookupPrice.js';

async function run() {
  const argv = process.argv.slice(2);
  // usage: node lookupTest.js W L [thickness]
  const W = argv[0] ? Number(argv[0]) : 10;
  const L = argv[1] ? Number(argv[1]) : 12;
  const thickness = argv[2] || 'thin';
  const widthKeyOffset = argv[3] ? Number(argv[3]) : 0;

  try {
  const res = await lookupPrice({ W, L, thickness, widthKeyOffset });
    console.log(`Lookup for W=${W}, L=${L}, thickness=${thickness}:`);
    console.log(res);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
