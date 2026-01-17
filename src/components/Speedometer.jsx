import React from 'react';
import { Loader2 } from 'lucide-react';

const Speedometer = ({ speed, progress, status, phase }) => {
    // SVG Configuration
    const radius = 120;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Color logic based on phase
    const getPhaseColor = () => {
        switch (phase) {
            case 'ping': return 'text-primary';
            case 'download': return 'text-primary';
            case 'upload': return 'text-secondary';
            default: return 'text-slate-600';
        }
    };

    const isTesting = phase !== 'idle' && phase !== 'complete';

    return (
        <div className="relative flex flex-col items-center justify-center">
            {/* Glow Effect */}
            <div className={`absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110 transition-opacity duration-500 ${isTesting ? 'opacity-100' : 'opacity-0'}`} />

            {/* Speedometer Circle */}
            <div className="relative w-80 h-80 flex items-center justify-center">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="rotate-[-90deg] transition-all duration-300 transform"
                >
                    {/* Background Ring */}
                    <circle
                        className="text-surface"
                        strokeWidth={stroke}
                        stroke="currentColor"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Progress Ring */}
                    <circle
                        className={`${getPhaseColor()} transition-all duration-300 ease-out`}
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute flex flex-col items-center">
                    {phase === 'ping' ? (
                        <div className="text-4xl font-bold text-white animate-pulse">
                            PING
                        </div>
                    ) : (
                        <>
                            <div className="text-6xl font-bold text-white tracking-tighter">
                                {speed.toFixed(1)}
                            </div>
                            <div className="text-xl text-gray-400 mt-2 font-medium">
                                {phase === 'idle' ? 'Mbps' : phase.toUpperCase()}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status Label */}
            <div className="mt-8 flex items-center gap-2 text-gray-400">
                {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="uppercase tracking-widest text-sm font-semibold">
                    {status || 'READY TO TEST'}
                </span>
            </div>
        </div>
    );
};

export default Speedometer;
