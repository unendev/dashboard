import React, { useState } from 'react';

interface ExpandableCardProps {
  children: React.ReactNode;
  onExpand?: () => void;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({ children, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (onExpand) {
      onExpand();
    }
  };

  return (
    <div
      className="glass-effect rounded-xl p-4 hover-lift group cursor-pointer animate-fade-in-up"
      onClick={handleClick}
    >
      {children}
      {isExpanded && (
        <div className="mt-4">
          {/* 这里将是第二层级的内容或者输入框 */}
        </div>
      )}
    </div>
  );
};

export default ExpandableCard;



