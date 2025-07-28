const qrcode = require('qrcode-terminal');
const { spawn } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && 
          !iface.address.startsWith('172.') && 
          !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await checkPort(port))) {
    port++;
  }
  return port;
}

async function waitForServer(url, maxAttempts = 10) {
  const http = require('http');
  const { URL } = require('url');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const parsedUrl = new URL(url);
      await new Promise((resolve, reject) => {
        const req = http.get({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname,
          timeout: 1000
        }, (res) => {
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', reject);
      });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function startMobileDev() {
  const ip = getLocalIP();
  const frontendPort = await findAvailablePort(5173);
  const backendPort = 3001;
  
  const frontendUrl = `http://${ip}:${frontendPort}`;
  const backendUrl = `http://${ip}:${backendPort}`;

  console.log('\n🚀 Boligplattform Mobile Development Server');
  console.log('='.repeat(60));
  console.log(`💻 Frontend Desktop: http://localhost:${frontendPort}`);
  console.log(`📱 Frontend Mobile:  ${frontendUrl}`);
  console.log(`🔧 Backend Desktop:  http://localhost:${backendPort}`);
  console.log(`🌐 Backend Mobile:   ${backendUrl}`);
  console.log('\n📲 Scan QR code to open app on mobile:');
  console.log('='.repeat(60));

  qrcode.generate(frontendUrl, { small: true }, (qr) => {
    console.log(qr);
    console.log('='.repeat(60));
    console.log('📋 Frontend URL: ' + frontendUrl);
    console.log('🔧 Backend API:  ' + backendUrl + '/api');
    console.log('📡 Test backend:  curl ' + backendUrl + '/api/ping');
    console.log('🔄 Both servers auto-restart on changes');
    console.log('⏹️  Press Ctrl+C to stop both servers\n');
  });

  // Check if backend is already running
  console.log('🔍 Checking if backend is already running...');
  const backendRunning = await waitForServer(`http://localhost:${backendPort}/api/ping`, 3);
  
  let backendProcess = null;
  if (!backendRunning) {
    console.log('🔧 Starting Backend API Server (with mobile access)...');
    backendProcess = spawn('node', ['server.js'], {
      cwd: 'apps/api/finn-scraper',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('🔧 Backend:', output.trim());
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('DeprecationWarning') && error.trim()) {
        console.warn('🔧 Backend Warning:', error.trim());
      }
    });

    // Wait for backend to start
    console.log('⏳ Waiting for backend to start...');
    const backendStarted = await waitForServer(`http://localhost:${backendPort}/api/ping`, 10);
    if (backendStarted) {
      console.log('✅ Backend API ready on port ' + backendPort);
    } else {
      console.warn('⚠️ Backend may not have started properly. Continuing anyway...');
    }
  } else {
    console.log('✅ Backend already running on port ' + backendPort);
  }

  console.log('💻 Starting Frontend Development Server...');
  const frontendProcess = spawn('npm', [
    'run', 'dev', 
    '--workspace=@boligplattform/web', 
    '--', 
    '--host', '0.0.0.0', 
    '--port', frontendPort.toString()
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let frontendReady = false;

  frontendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('💻 Frontend:', output.trim());
    
    if (output.includes('ready in') && !frontendReady) {
      console.log('✅ Frontend ready on port ' + frontendPort);
      console.log('🎉 Both servers ready! Scan QR code above to test on mobile!');
      console.log('📱 Full functionality: Frontend + Backend + API calls');
      frontendReady = true;
    }
  });

  frontendProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('DeprecationWarning') && 
        !error.includes('Re-optimizing') && 
        !error.includes('Use `node --trace-deprecation') &&
        error.trim()) {
      console.warn('💻 Frontend Warning:', error.trim());
    }
  });

  const cleanup = () => {
    console.log('\n👋 Shutting down mobile development servers...');
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
    }
    frontendProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (backendProcess) {
        backendProcess.kill('SIGKILL');
      }
      frontendProcess.kill('SIGKILL');
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  if (backendProcess) {
    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log('🔧 Backend exited with code:', code);
      }
    });
  }

  frontendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log('💻 Frontend exited with code:', code);
    }
  });
}

startMobileDev().catch(console.error);
