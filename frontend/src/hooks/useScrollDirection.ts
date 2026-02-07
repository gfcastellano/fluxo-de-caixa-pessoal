import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect scroll direction
 * Returns 'up' or 'down' based on the user's scroll direction.
 * Defaults to 'up' (meaning header should be visible).
 */
export function useScrollDirection() {
    const [direction, setDirection] = useState<'up' | 'down'>('up');
    const [scrollY, setScrollY] = useState(0);
    const prevScrollY = useRef(0);
    const blocking = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrollY(currentScrollY);

            if (blocking.current) return;
            blocking.current = true;

            window.requestAnimationFrame(() => {
                const prevY = prevScrollY.current;

                // Always show at the top
                if (currentScrollY <= 0) {
                    setDirection('up');
                }
                // Going down
                else if (currentScrollY > prevY && currentScrollY > 10) {
                    setDirection('down');
                }
                // Scroll up logic removed to keep header hidden until top

                prevScrollY.current = currentScrollY;
                blocking.current = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return direction;
}
