import { useState, useCallback, useRef } from 'react';

const CONFIG = {
    PING_URL: 'https://speed.cloudflare.com/cdn-cgi/trace',
    DOWNLOAD_URL: 'https://speed.cloudflare.com/__down?bytes=',
    UPLOAD_URL: 'https://speed.cloudflare.com/__up',
    PING_COUNT: 10,
    DL_SIZES: [100000, 1000000, 10000000, 25000000], // 100KB, 1MB, 10MB, 25MB
    UL_SIZE: 5000000, // 5MB chunks
    UL_DURATION: 10000, // 15 seconds max upload test
};

export const useSpeedTest = () => {
    const [phase, setPhase] = useState('idle'); // idle, ping, download, upload, complete
    const [results, setResults] = useState({
        ping: 0,
        jitter: 0,
        download: 0,
        upload: 0,
    });
    const [progress, setProgress] = useState(0); // 0-100 for current phase
    const [realtimeSpeed, setRealtimeSpeed] = useState(0);

    const abortController = useRef(null);

    const reset = useCallback(() => {
        setPhase('idle');
        setResults({ ping: 0, jitter: 0, download: 0, upload: 0 });
        setProgress(0);
        setRealtimeSpeed(0);
        abortController.current = null;
    }, []);

    const runPingTest = async () => {
        setPhase('ping');
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
                setResults(prev => ({ ...prev, ping: Math.round(duration) })); // show live last ping
                setProgress(((i + 1) / CONFIG.PING_COUNT) * 100);
            } catch (e) {
                console.error(e);
            }
        }

        // Calculate Avg Ping and Jitter
        const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
        const jitter = pings.reduce((a, b) => a + Math.abs(b - avgPing), 0) / pings.length;

        setResults(prev => ({
            ...prev,
            ping: Math.round(avgPing),
            jitter: Math.round(jitter)
        }));

        return { ping: avgPing, jitter };
    };

    const runDownloadTest = async () => {
        setPhase('download');
        setProgress(0);

        let totalBytes = 0;
        const startTime = performance.now();
        let measurements = [];

        for (let size of CONFIG.DL_SIZES) {
            if (abortController.current?.signal.aborted) break;

            const iterStart = performance.now();
            try {
                await fetch(CONFIG.DOWNLOAD_URL + size, {
                    signal: abortController.current?.signal
                });
                const iterDuration = (performance.now() - iterStart) / 1000; // seconds
                const speedMbps = (size * 8) / (iterDuration * 1000000);

                measurements.push(speedMbps);
                setRealtimeSpeed(parseFloat(speedMbps.toFixed(1)));
                setResults(prev => ({ ...prev, download: parseFloat(speedMbps.toFixed(1)) }));

                // Heuristic progress
                totalBytes += size;
                const totalEstimated = CONFIG.DL_SIZES.reduce((a, b) => a + b, 0);
                setProgress(Math.min((totalBytes / totalEstimated) * 100, 100));

            } catch (e) {
                console.error(e);
            }
        }

        // Weighted max average for stability
        const finalDownload = measurements.length ? Math.max(...measurements) : 0;
        setResults(prev => ({ ...prev, download: parseFloat(finalDownload.toFixed(1)) }));
    };

    const runUploadTest = async () => {
        setPhase("upload");
        setProgress(0);

        const STREAMS = navigator.hardwareConcurrency >= 6 ? 6 : 4;
        const CHUNK_SIZE = 1024 * 1024; // 1MB
        const TEST_DURATION = 4000; // 4 seconds

        const data = new Uint8Array(CHUNK_SIZE);
        let speeds = [];

        const startTime = performance.now();
        const endTime = startTime + TEST_DURATION;

        const uploadStream = async () => {
            while (performance.now() < endTime) {
                const start = performance.now();

                // 🔥 Fire-and-forget upload
                fetch("https://speed.cloudflare.com/__up", {
                    method: "POST",
                    body: data,
                    mode: "no-cors",
                    keepalive: true,
                }).catch(() => {}); // REQUIRED

                // controlled pacing
                await new Promise(r => setTimeout(r, 600));

                const duration = (performance.now() - start) / 1000;
                const mbps = (CHUNK_SIZE * 8) / (duration * 1e6);

                speeds.push(mbps);
                setRealtimeSpeed(parseFloat(mbps.toFixed(1)));
                setResults(prev => ({ ...prev, upload: parseFloat(mbps.toFixed(1)) }));

                const elapsed = performance.now() - startTime;
                setProgress(Math.min((elapsed / TEST_DURATION) * 100, 100));
            }
        };

        // Actually run the parallel upload streams
        await Promise.all(
            Array.from({ length: STREAMS }, () => uploadStream())
        );

        // Calculate final upload speed
        if (speeds.length > 0) {
            const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            setResults(prev => ({ ...prev, upload: parseFloat(avgSpeed.toFixed(1)) }));
        }
    };

    const startTest = async () => {
        if (phase !== 'idle' && phase !== 'complete') return;

        reset();
        abortController.current = new AbortController();

        try {
            await runPingTest();
            await runDownloadTest();
            await runUploadTest();
            setPhase('complete');
        } catch (e) {
            console.error("Test failed", e);
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