import React, { useEffect, useState } from 'react';
import { trackingService } from '../services/trackingService';

export const withTracking = (WrappedComponent) => {
  return function TrackingComponent(props) {
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
      setStartTime(Date.now());

      return () => {
        if (startTime && props.id && props.type) {
          const duration = Date.now() - startTime;
          // Chỉ track nếu xem ít nhất 5 giây
          if (duration >= 5000) {
            trackingService.trackInteraction(
              props.id,
              props.type,
              trackingService.INTERACTION_TYPES.TIME_SPENT,
              { duration }
            );
          }
        }
      };
    }, [props.id]);

    const handleMouseEnter = () => {
      trackingService.trackInteraction(
        props.id,
        props.type,
        trackingService.INTERACTION_TYPES.HOVER
      );
    };

    const handleClick = () => {
      trackingService.trackInteraction(
        props.id,
        props.type,
        trackingService.INTERACTION_TYPES.CLICK
      );
    };

    return (
      <div onMouseEnter={handleMouseEnter} onClick={handleClick}>
        <WrappedComponent {...props} />
      </div>
    );
  };
};