import { cn } from '../utils/cn';
import { Users } from 'lucide-react';

interface SharedDataBadgeProps {
    ownerName: string;
    photoURL?: string;
    className?: string;
    size?: 'sm' | 'md';
}

export function SharedDataBadge({ ownerName, photoURL, className, size = 'sm' }: SharedDataBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full font-medium bg-violet-100/50 text-violet-700 border border-violet-200/50 backdrop-blur-sm",
                size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                className
            )}
        >
            {photoURL ? (
                <img
                    src={photoURL}
                    alt={ownerName}
                    className={cn(
                        "rounded-full object-cover border border-white/50",
                        size === 'sm' ? "w-3 h-3" : "w-4 h-4"
                    )}
                />
            ) : (
                <Users size={size === 'sm' ? 10 : 12} />
            )}
            <span className="truncate max-w-[100px]">{ownerName.split(' ')[0]}</span>
        </span>
    );
}
