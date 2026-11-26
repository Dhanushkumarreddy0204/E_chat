import { useState } from 'react';
import { mediaUrl as resolveMediaUrl } from '../../api/urls';

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
  '2xl': 'w-28 h-28 text-2xl',
};

const dotSizeMap = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

export const Avatar = ({ 
  src, 
  alt = 'User', 
  size = 'md', 
  isOnline = false, 
  showOnlineStatus = false,
  className = '',
  hasStory = false,
  hasUnseenStory = false
}) => {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const dotClass = dotSizeMap[size] || dotSizeMap.md;

  const [failedSrc, setFailedSrc] = useState(null);
  const fallbackLetter = alt ? alt.charAt(0).toUpperCase() : 'U';

  const avatarElement = (
    <div className={`relative inline-block ${className}`}>
      <div className={`rounded-full overflow-hidden flex items-center justify-center bg-brand-100 text-brand-900 font-semibold ${sizeClass}`}>
        {src && failedSrc !== src ? (
          <img 
            src={resolveMediaUrl(src)}
            alt={alt} 
            className="w-full h-full object-cover"
            loading="lazy" decoding="async" onError={() => setFailedSrc(src)}
          />
        ) : (
          <span>{fallbackLetter}</span>
        )}
      </div>

      {showOnlineStatus && isOnline && (
        <span className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-surface ${dotClass}`} />
      )}
    </div>
  );

  if (hasStory) {
    return (
      <div className={hasUnseenStory ? 'story-ring-unseen cursor-pointer' : 'story-ring-seen cursor-pointer'}>
        <div className="p-0.5 rounded-full">
          {avatarElement}
        </div>
      </div>
    );
  }

  return avatarElement;
};
