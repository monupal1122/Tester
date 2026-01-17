import { useState, useCallback, useRef } from 'react';

const CONFIG = {
    PING_URL: 'https://speed.cloudflare.com/cdn-cgi/trace',
    DOWNLOAD_URL: 'https://speed.cloudflare.com/__down?bytes=',
    UPLOAD_URL: 'https://speed.cloudflare.com/__up',
    
    PING_COUNT: 10,
    
    // Thread configuration
    DOWNLOAD_THREADS: 6,
    UPLOAD_THREADS: 4,
    
    // Adaptive test settings
    MIN_TEST_DURATION: 10000, // Minimum 10 seconds
    MAX_TEST_DURATION: 20000, // Maximum 20 seconds
    STABILITY_THRESHOLD: 5, // Speed must vary less than 5 Mbps to be considered stable
    STABILITY_WINDOW: 15, // Check last 15 measurements for stability
    STABILITY_SAMPLES_NEEDED: 10, // Need 10 consecutive stable samples to complete
    
    // Measurement
    MEASUREMENT_INTERVAL: 100,
    
    // Chunk sizes
    DOWNLOAD_SIZES: [10000000, 25000000, 50000000],
    UPLOAD_CHUNK_SIZE: 1000000,
};

export const useSpeedTest = () => {
    const [phase, setPhase] = useState('idle');
    const [results, setResults] = useState({
        ping: 0,
        jitter: 0,
        download: 0,
        upload: 0,
    });
    const [progress, setProgress] = useState(0);
    const [realtimeSpeed, setRealtimeSpeed] = useState(0);

    const abortController = useRef(null);

    const reset = useCallback(() => {
        setPhase('idle');
        setResults({ ping: 0, jitter: 0, download: 0, upload: 0 });
        setProgress(0);
        setRealtimeSpeed(0);
        if (abortController.current) {
            abortController.current.abort();
            abortController.current = null;
        }
    }, []);

    // Check if speeds are stable
    const isSpeedStable = (speedHistory) => {
        if (speedHistory.length < CONFIG.STABILITY_WINDOW) return false;
        
        const recent = speedHistory.slice(-CONFIG.STABILITY_WINDOW);
        const max = Math.max(...recent);
        const min = Math.min(...recent);
        const variance = max - min;
        
        return variance <= CONFIG.STABILITY_THRESHOLD;
    };

    // ====== PING TEST ======
    const runPingTest = async () => {
        console.log('🏓 Testing latency...');
        setPhase('ping');
        setProgress(0);
        const pings = [];

        for (let i = 0; i < CONFIG.PING_COUNT; i++) {
            if (abortController.current?.signal.aborted) return;

            const start = performance.now();
            try {
                await fetch(`${CONFIG.PING_URL}?t=${Date.now()}`, {
                    cache: 'no-store',
                    signal: abortController.current?.signal
                });
                const duration = performance.now() - start;
                pings.push(duration);
                setProgress(((i + 1) / CONFIG.PING_COUNT) * 100);
            } catch (e) {
                if (e.name !== 'AbortError') console.error('Ping error:', e);
            }
        }

        if (pings.length < 3) return;

        const sorted = [...pings].sort((a, b) => a - b);
        const filtered = sorted.slice(1, -1);
        const avgPing = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        const jitter = filtered.reduce((sum, p) => sum + Math.abs(p - avgPing), 0) / filtered.length;

        const finalPing = Math.round(avgPing);
        const finalJitter = Math.round(jitter * 10) / 10;

        setResults(prev => ({
            ...prev,
            ping: finalPing,
            jitter: finalJitter
        }));

        console.log(`✅ Ping: ${finalPing}ms | Jitter: ${finalJitter}ms`);
    };

    // ====== ADAPTIVE DOWNLOAD TEST ======
    const runDownloadTest = async () => {
        console.log('⬇️ Testing download speed (adaptive duration)...');
        setPhase('download');
        setProgress(0);
        setRealtimeSpeed(0);

        const testStart = performance.now();
        
        let globalBytesDownloaded = 0;
        let lastUpdateTime = testStart;
        let speedHistory = [];
        let running = true;
        let consecutiveStableCount = 0;

        // Worker function
        const worker = async (id) => {
            let chunkIndex = 0;
            
            while (running) {
                if (abortController.current?.signal.aborted) {
                    running = false;
                    return;
                }

                const size = CONFIG.DOWNLOAD_SIZES[chunkIndex % CONFIG.DOWNLOAD_SIZES.length];
                chunkIndex++;

                try {
                    const res = await fetch(`${CONFIG.DOWNLOAD_URL}${size}&t=${Date.now()}`, {
                        cache: 'no-store',
                        signal: abortController.current?.signal
                    });

                    const reader = res.body.getReader();
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done || !running) break;
                        globalBytesDownloaded += value.length;
                    }

                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error(`DL thread ${id} error:`, e.message);
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
            }
        };

        // Speed calculator with stability detection
        const speedMonitor = setInterval(() => {
            const now = performance.now();
            const elapsed = (now - lastUpdateTime) / 1000;
            const totalElapsed = now - testStart;
            
            if (elapsed > 0 && globalBytesDownloaded > 0) {
                const mbps = (globalBytesDownloaded * 8) / (elapsed * 1000000);
                speedHistory.push(mbps);
                
                // Show current speed
                setRealtimeSpeed(Math.round(mbps * 10) / 10);
                
                // Check stability after minimum duration
                if (totalElapsed >= CONFIG.MIN_TEST_DURATION) {
                    if (isSpeedStable(speedHistory)) {
                        consecutiveStableCount++;
                        console.log(`📊 Stable for ${consecutiveStableCount} samples (need ${CONFIG.STABILITY_SAMPLES_NEEDED})`);
                        
                        if (consecutiveStableCount >= CONFIG.STABILITY_SAMPLES_NEEDED) {
                            console.log('✅ Download speed stabilized!');
                            running = false;
                        }
                    } else {
                        consecutiveStableCount = 0;
                    }
                }
                
                // Force stop at max duration
                if (totalElapsed >= CONFIG.MAX_TEST_DURATION) {
                    console.log('⏱️ Max duration reached');
                    running = false;
                }
                
                // Reset
                globalBytesDownloaded = 0;
                lastUpdateTime = now;
            }
            
            // Progress (0-100% based on max duration)
            const progress = Math.min((totalElapsed / CONFIG.MAX_TEST_DURATION) * 100, 100);
            setProgress(progress);
            
        }, CONFIG.MEASUREMENT_INTERVAL);

        // Run workers
        await Promise.all(
            Array.from({ length: CONFIG.DOWNLOAD_THREADS }, (_, i) => worker(i))
        );

        running = false;
        clearInterval(speedMonitor);

        // Calculate final speed - use the stable measurements
        if (speedHistory.length >= 10) {
            // Skip first 10% warmup
            const skipStart = Math.floor(speedHistory.length * 0.1);
            const validSpeeds = speedHistory.slice(skipStart);
            
            // Take average of all valid speeds (they should be stable now)
            const avgSpeed = validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length;
            
            const finalDownload = Math.round(avgSpeed * 10) / 10;
            
            setResults(prev => ({
                ...prev,
                download: finalDownload
            }));
            
            console.log(`✅ Download: ${finalDownload} Mbps (${speedHistory.length} samples, stability achieved)`);
        } else {
            console.warn('⚠️ Not enough download samples:', speedHistory.length);
        }

        setProgress(100);
    };

    // ====== ADAPTIVE UPLOAD TEST ======
    const runUploadTest = async () => {
        console.log('⬆️ Testing upload speed (adaptive duration)...');
        setPhase('upload');
        setProgress(0);
        setRealtimeSpeed(0);

        const testStart = performance.now();
        
        let globalBytesUploaded = 0;
        let lastUpdateTime = testStart;
        let speedHistory = [];
        let running = true;
        let consecutiveStableCount = 0;

        // Generate upload data
        const uploadData = new Uint8Array(CONFIG.UPLOAD_CHUNK_SIZE);
        for (let i = 0; i < uploadData.length; i += 65536) {
            const chunk = uploadData.subarray(i, Math.min(i + 65536, uploadData.length));
            crypto.getRandomValues(chunk);
        }

        // Worker function
        const worker = async (id) => {
            while (running) {
                if (abortController.current?.signal.aborted) {
                    running = false;
                    return;
                }

                const startUpload = performance.now();

                try {
                    const res = await fetch(CONFIG.UPLOAD_URL, {
                        method: 'POST',
                        body: uploadData,
                        signal: abortController.current?.signal
                    });

                    await res.blob();
                    
                    const uploadDuration = performance.now() - startUpload;
                    
                    // Only count if upload completed reasonably fast
                    if (uploadDuration < 10000) {
                        globalBytesUploaded += uploadData.length;
                    }

                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error(`UL thread ${id} error:`, e.message);
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            }
        };

        // Speed calculator with stability detection
        const speedMonitor = setInterval(() => {
            const now = performance.now();
            const elapsed = (now - lastUpdateTime) / 1000;
            const totalElapsed = now - testStart;
            
            if (elapsed > 0) {
                if (globalBytesUploaded > 0) {
                    const mbps = (globalBytesUploaded * 8) / (elapsed * 1000000);
                    speedHistory.push(mbps);
                    
                    // Show current speed
                    const displaySpeed = Math.round(mbps * 10) / 10;
                    setRealtimeSpeed(displaySpeed);
                    
                    // Also update results in real-time so it shows on card
                    setResults(prev => ({
                        ...prev,
                        upload: displaySpeed
                    }));
                    
                    // Check stability after minimum duration
                    if (totalElapsed >= CONFIG.MIN_TEST_DURATION) {
                        if (isSpeedStable(speedHistory)) {
                            consecutiveStableCount++;
                            console.log(`📊 Upload stable for ${consecutiveStableCount} samples (need ${CONFIG.STABILITY_SAMPLES_NEEDED})`);
                            
                            if (consecutiveStableCount >= CONFIG.STABILITY_SAMPLES_NEEDED) {
                                console.log('✅ Upload speed stabilized!');
                                running = false;
                            }
                        } else {
                            consecutiveStableCount = 0;
                        }
                    }
                    
                    // Reset
                    globalBytesUploaded = 0;
                } else {
                    // No bytes uploaded in this interval
                    console.log('⚠️ No upload progress in last interval');
                }
                
                lastUpdateTime = now;
                
                // Force stop at max duration
                if (totalElapsed >= CONFIG.MAX_TEST_DURATION) {
                    console.log('⏱️ Max upload duration reached');
                    running = false;
                }
            }
            
            // Progress
            const progress = Math.min((totalElapsed / CONFIG.MAX_TEST_DURATION) * 100, 100);
            setProgress(progress);
            
        }, CONFIG.MEASUREMENT_INTERVAL);

        // Run workers
        await Promise.all(
            Array.from({ length: CONFIG.UPLOAD_THREADS }, (_, i) => worker(i))
        );

        running = false;
        clearInterval(speedMonitor);

        // Calculate final speed - use the stable measurements
        if (speedHistory.length >= 10) {
            // Skip first 10% warmup
            const skipStart = Math.floor(speedHistory.length * 0.1);
            const validSpeeds = speedHistory.slice(skipStart);
            
            // Take average of all valid speeds (they should be stable now)
            const avgSpeed = validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length;
            
            const finalUpload = Math.round(avgSpeed * 10) / 10;
            
            setResults(prev => ({
                ...prev,
                upload: finalUpload
            }));
            
            console.log(`✅ Upload: ${finalUpload} Mbps (${speedHistory.length} samples, stability achieved)`);
        } else {
            console.warn('⚠️ Not enough upload samples:', speedHistory.length);
            console.warn('Upload may have failed - check network/CORS errors');
        }

        setProgress(100);
    };

    // ====== MAIN TEST RUNNER ======
    const startTest = async () => {
        if (phase !== 'idle' && phase !== 'complete') return;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 ADAPTIVE SPEED TEST STARTED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        reset();
        abortController.current = new AbortController();

        try {
            await runPingTest();
            await new Promise(r => setTimeout(r, 500));

            await runDownloadTest();
            await new Promise(r => setTimeout(r, 500));

            await runUploadTest();

            setPhase('complete');
            setProgress(100);
            
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ TEST COMPLETE');
            console.log(`📊 Download: ${results.download} Mbps`);
            console.log(`📊 Upload: ${results.upload} Mbps`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("❌ Test failed:", e);
            }
            setPhase('idle');
        }
    };

    return {
        phase,
        results,
        progress,
        realtimeSpeed,
        startTest,
        reset
    };
};