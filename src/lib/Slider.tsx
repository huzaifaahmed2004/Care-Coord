import React, { useState, useEffect, useRef } from 'react';

interface SliderProps {
  children: React.ReactNode[];
  autoPlay?: boolean;
  speed?: number;
  slidesToShow?: number;
  slidesToScroll?: number;
  pauseOnHover?: boolean;
  infinite?: boolean;
  responsive?: {
    breakpoint: number;
    settings: {
      slidesToShow: number;
      slidesToScroll: number;
    };
  }[];
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  children,
  autoPlay = true,
  speed = 3000,
  slidesToShow = 4,
  slidesToScroll = 1,
  pauseOnHover = true,
  infinite = true,
  responsive = [],
  className = '',
}) => {
  const [position, setPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleSlides, setVisibleSlides] = useState(slidesToShow);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const pixelsPerSecond = useRef<number>(50); // Speed of animation in pixels per second
  
  // Clone children to create a continuous loop effect
  const totalItems = React.Children.count(children);
  const clonedChildren = [...React.Children.toArray(children), ...React.Children.toArray(children)];
  
  // Handle responsive settings
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      let newVisibleSlides = slidesToShow;
      
      // Apply responsive settings
      responsive.forEach(item => {
        if (windowWidth <= item.breakpoint) {
          newVisibleSlides = item.settings.slidesToShow;
        }
      });
      
      setVisibleSlides(newVisibleSlides);
      
      // Adjust animation speed based on screen size
      if (windowWidth < 640) {
        pixelsPerSecond.current = 30;
      } else if (windowWidth < 1024) {
        pixelsPerSecond.current = 40;
      } else {
        pixelsPerSecond.current = 50;
      }
    };
    
    // Initial check and event listener
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [slidesToShow, responsive]);
  
  // Continuous animation function
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = timestamp - lastTimeRef.current;
    
    if (elapsed > 16) { // Cap at roughly 60fps
      lastTimeRef.current = timestamp;
      
      // Calculate how much to move based on elapsed time
      const pixelsToMove = (pixelsPerSecond.current * elapsed) / 1000;
      
      // Update position
      setPosition(prevPosition => {
        const newPosition = prevPosition + pixelsToMove;
        
        // Reset position when we've scrolled through all original items
        if (sliderRef.current) {
          const itemWidth = sliderRef.current.offsetWidth / visibleSlides;
          const totalWidth = itemWidth * totalItems;
          
          if (newPosition >= totalWidth) {
            return 0;
          }
          
          return newPosition;
        }
        
        return newPosition;
      });
    }
    
    // Continue animation loop
    if (autoPlay && !isPaused) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };
  
  // Start/stop animation based on autoPlay and isPaused
  useEffect(() => {
    if (autoPlay && !isPaused) {
      lastTimeRef.current = 0; // Reset time tracking
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoPlay, isPaused, visibleSlides]);
  
  // Handle mouse events for pause on hover
  const handleMouseEnter = () => {
    if (pauseOnHover && autoPlay) {
      setIsPaused(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (pauseOnHover && autoPlay) {
      setIsPaused(false);
    }
  };
  
  // Calculate slider styles for continuous movement
  const getSliderStyles = () => {
    return {
      display: 'flex',
      transform: `translateX(-${position}px)`,
      transition: 'none' // No transition for smooth animation
    };
  };
  
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider container */}
      <div className="overflow-hidden" ref={sliderRef}>
        <div style={getSliderStyles()}>
          {clonedChildren.map((child, index) => {
            // Calculate width based on visible slides
            const itemWidth = sliderRef.current ? 
              `${sliderRef.current.offsetWidth / visibleSlides}px` : 
              `${100 / visibleSlides}%`;
            
            return (
              <div 
                key={index}
                className="px-2"
                style={{ width: itemWidth, flexShrink: 0 }}
              >
                {child}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Slider;
