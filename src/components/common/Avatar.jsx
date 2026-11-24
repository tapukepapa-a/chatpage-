import React, { useState } from 'react';
import './Avatar.css';

export default function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl', '2xl'
  status = null, // 'online', 'away', 'offline', 'dnd'
  ring = false,
  className = '',
  onClick
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (text) => {
    if (!text) return 'JU';
    const parts = text.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  return (
    <div 
      className={`avatar-wrapper avatar-${size} ${ring ? 'avatar-ring' : ''} ${className}`}
      onClick={onClick}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="avatar-image"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className="avatar-fallback">
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span 
          className={`avatar-status-dot status-${status}`} 
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
