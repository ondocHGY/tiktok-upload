import React from 'react';
import { Tag } from 'antd';

interface StatusBadgeProps {
  status: 'pending' | 'uploading' | 'published' | 'failed';
}

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'blue', text: '대기중' },
  uploading: { color: 'orange', text: '업로드중' },
  published: { color: 'green', text: '완료' },
  failed: { color: 'red', text: '실패' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
};

export default StatusBadge;
