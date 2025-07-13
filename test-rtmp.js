const net = require('net');

// Test RTMP handshake with Nimble
function testRTMPConnection(host, port, app, streamKey) {
  return new Promise((resolve, reject) => {
    console.log(`Testing RTMP connection to ${host}:${port}/${app}/${streamKey}`);
    
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log('✅ TCP connection established');
      
      // Send basic RTMP handshake C0+C1
      const c0 = Buffer.from([0x03]); // RTMP version
      const c1 = Buffer.alloc(1536, 0); // Random data
      c1.writeUInt32BE(Math.floor(Date.now() / 1000), 0); // Timestamp
      
      socket.write(Buffer.concat([c0, c1]));
      
      let responseReceived = false;
      
      socket.on('data', (data) => {
        if (!responseReceived) {
          responseReceived = true;
          console.log('✅ RTMP handshake response received');
          console.log(`Response length: ${data.length} bytes`);
          socket.destroy();
          resolve(true);
        }
      });
      
      setTimeout(() => {
        if (!responseReceived) {
          console.log('❌ No RTMP handshake response');
          socket.destroy();
          resolve(false);
        }
      }, 3000);
    });
    
    socket.on('timeout', () => {
      console.log('❌ Connection timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`❌ Connection error: ${err.message}`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Test different scenarios
async function runTests() {
  console.log('🎯 Testing RTMP Server Functionality\n');
  
  const tests = [
    { host: '37.27.201.26', port: 1935, app: 'live', streamKey: 'test' },
    { host: '37.27.201.26', port: 1935, app: 'live', streamKey: 'e004b3cdefa6785cf305ab71640d217e' }
  ];
  
  for (const test of tests) {
    await testRTMPConnection(test.host, test.port, test.app, test.streamKey);
    console.log('');
  }
  
  console.log('📋 Summary:');
  console.log('- If TCP connects but no RTMP response: Nimble needs RTMP module configuration');
  console.log('- If connection refused: Nimble not listening or firewall issue');
  console.log('- If RTMP handshake works: Stream publishing should work');
}

runTests().catch(console.error);