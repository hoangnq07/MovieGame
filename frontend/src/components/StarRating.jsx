import { useState } from 'react';
import { FaStar } from 'react-icons/fa';

const StarRating = ({ rating, onRate }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {[...Array(5)].map((_, index) => {
        const currentRating = index + 1;
        return (
          <FaStar
            key={index}
            size={20}
            color={currentRating <= rating ? '#FFD700' : '#ccc'}
            style={{ cursor: 'pointer' }}
            onClick={() => onRate(currentRating)}
          />
        );
      })}
    </div>
  );
};

export default StarRating;