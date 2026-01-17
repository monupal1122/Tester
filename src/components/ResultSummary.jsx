import React from 'react';
import { RefreshCw, Download, Upload, Activity, Zap } from 'lucide-react';

const ResultSummary = ({ results, onRestart }) => {
    return (
        <div className="w-full max-w-2xl mx-auto animate-fade-in p-6">
            <div className="bg-surface/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center">
                <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    Test Complete
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {/* Download */}
                    <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-xl">
                        <div className="flex items-center gap-2 text-primary">
                            <Download className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase">Download</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {results.download}<span className="text-sm font-medium text-gray-500 ml-1">Mbps</span>
                        </div>
                    </div>

                    {/* Upload */}
                    <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-xl">
                        <div className="flex items-center gap-2 text-secondary">
                            <Upload className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase">Upload</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {results.upload}<span className="text-sm font-medium text-gray-500 ml-1">Mbps</span>
                        </div>
                    </div>

                    {/* Ping */}
                    <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-xl">
                        <div className="flex items-center gap-2 text-accent">
                            <Activity className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase">Ping</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {results.ping}<span className="text-sm font-medium text-gray-500 ml-1">ms</span>
                        </div>
                    </div>

                    {/* Jitter */}
                    <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-xl">
                        <div className="flex items-center gap-2 text-orange-400">
                            <Zap className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase">Jitter</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {results.jitter}<span className="text-sm font-medium text-gray-500 ml-1">ms</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onRestart}
                    className="group relative inline-flex items-center gap-3 px-8 py-3 bg-white text-black font-bold rounded-full transition-transform hover:scale-105 active:scale-95"
                >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>Test Again</span>
                </button>
            </div>
        </div>
    );
};

export default ResultSummary;
