import React, { useState } from 'react';
import { Play } from 'lucide-react';
import Speedometer from './components/Speedometer';
import MetricCard from './components/MetricCard';
import ResultSummary from './components/ResultSummary';
import { useSpeedTest } from './hooks/useSpeedTest';
import { Upload, Download, Activity, Zap } from 'lucide-react';

function App() {
  const { phase, results, progress, realtimeSpeed, startTest, reset } = useSpeedTest();
  const [hasStarted, setHasStarted] = useState(false);

  // Status text map
  const statusMap = {
    idle: 'READY',
    ping: 'MEASURING PING...',
    download: 'TESTING DOWNLOAD...',
    upload: 'TESTING UPLOAD...',
    complete: 'COMPLETE'
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="w-full max-w-4xl relative z-10 text-center">
          {/* Header */}
          <h1 className="text-3xl md:text-5xl font-extrabold mb-122 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500">
            SPEEDTEST<span className="text-primary">.PLUS</span>
          </h1>

         <div className='flex items-center justify-center'>
           {/* GO Button */}
          <button
            onClick={() => { setHasStarted(true); startTest(); }}
            className="w-32 h-32 rounded-full bg-white/5 backdrop-blur-md mb-23 border border-white/10 flex items-center justify-center text-white font-bold tracking-widest hover:scale-110 hover:bg-white hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-pulse"
          >
            GO
          </button>
         </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ResultSummary results={results} onRestart={() => { setHasStarted(false); reset(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-12 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500">
          SPEEDTEST<span className="text-primary">.PLUS</span>
        </h1>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

          {/* Left Metrics */}
          <div className="flex flex-col gap-4 order-2 md:order-1">
            <MetricCard
              label="Ping"
              value={parseFloat(results.ping) > 0 ? results.ping : null}
              unit="ms"
              icon={Activity}
              active={phase === 'ping'}
            />
            <MetricCard
              label="Jitter"
              value={parseFloat(results.jitter) > 0 ? results.jitter : null}
              unit="ms"
              icon={Zap}
              active={phase === 'ping'}
            />
          </div>

          {/* Center Speedometer */}
          <div className="flex flex-col items-center order-1 md:order-2">
            <div className="relative group cursor-pointer" onClick={phase === 'idle' ? startTest : undefined}>
              <Speedometer
                speed={phase === 'idle' ? 0 : realtimeSpeed}
                progress={progress}
                status={statusMap[phase]}
                phase={phase}
              />

              {/* Start Button Overlay */}
              {phase === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <button
                    className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white font-bold tracking-widest hover:scale-110 hover:bg-white hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.4)]"
                  >
                    GO
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Metrics */}
          <div className="flex flex-col gap-4 order-3">
            <MetricCard
              label="Download"
              value={parseFloat(results.download) > 0 ? results.download : null}
              unit="Mbps"
              icon={Download}
              active={phase === 'download'}
            />
            <MetricCard
              label="Upload"
              value={parseFloat(results.upload) > 0 ? results.upload : null}
              unit="Mbps"
              icon={Upload}
              active={phase === 'upload'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
