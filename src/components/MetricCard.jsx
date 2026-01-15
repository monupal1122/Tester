import React from 'react';

const MetricCard = ({ label, value, unit, icon: Icon, active }) => {
    return (
        <div className={`
        relative overflow-hidden
        bg-surface/50 backdrop-blur-sm 
        border border-white/5 rounded-2xl p-6 
        flex flex-col items-start gap-2
        transition-all duration-300
        ${active ? 'border-primary/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'opacity-60'}
    `}>
            {/* Header */}
            <div className="flex items-center gap-2 text-gray-400 mb-2">
                {Icon && <Icon className="w-4 h-4" />}
                <span className="text-sm font-bold tracking-wider uppercase">{label}</span>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${value ? 'text-white' : 'text-gray-600'}`}>
                    {value !== null ? value : '- -'}
                </span>
                <span className="text-sm text-gray-500 font-medium">{unit}</span>
            </div>

            {/* Active Indicator */}
            {active && (
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
            )}
        </div>
    );
};

export default MetricCard;
