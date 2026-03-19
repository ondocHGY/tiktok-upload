import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Popconfirm, Tabs, message, Tooltip, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ScheduledUpload, TikTokAccount } from '../types';
import { getSchedules, deleteSchedule, getAccounts, uploadNow } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledUpload[]>([]);
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'all' ? undefined : activeTab;
      const [schedulesData, accountsData] = await Promise.all([
        getSchedules(statusFilter),
        getAccounts(),
      ]);
      setSchedules(schedulesData);
      setAccounts(accountsData);
    } catch (error) {
      message.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      await deleteSchedule(id);
      message.success('예약이 삭제되었습니다.');
      fetchData();
    } catch (error) {
      message.error('삭제에 실패했습니다.');
    }
  };

  const handleUploadNow = async (id: number) => {
    try {
      await uploadNow(id);
      message.success('즉시 업로드가 시작되었습니다.');
      fetchData();
    } catch (error) {
      message.error('즉시 업로드에 실패했습니다.');
    }
  };

  const getAccountName = (accountId: number): string => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.display_name : `ID: ${accountId}`;
  };

  const columns = [
    {
      title: '영상파일',
      dataIndex: 'video_filename',
      key: 'video_filename',
      ellipsis: true,
      width: 180,
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '계정',
      dataIndex: 'account_id',
      key: 'account_id',
      width: 140,
      render: (accountId: number) => getAccountName(accountId),
    },
    {
      title: '예약시간',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
      sorter: (a: ScheduledUpload, b: ScheduledUpload) =>
        dayjs(a.scheduled_time).unix() - dayjs(b.scheduled_time).unix(),
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ScheduledUpload['status']) => <StatusBadge status={status} />,
    },
    {
      title: '액션',
      key: 'action',
      width: 160,
      render: (_: unknown, record: ScheduledUpload) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="즉시 업로드"
                description="지금 바로 업로드하시겠습니까?"
                onConfirm={() => handleUploadNow(record.id)}
                okText="업로드"
                cancelText="취소"
              >
                <Tooltip title="즉시 업로드">
                  <Button type="text" icon={<PlayCircleOutlined />} size="small" style={{ color: '#52c41a' }} />
                </Tooltip>
              </Popconfirm>
              <Tooltip title="수정">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => navigate(`/schedules/${record.id}/edit`)}
                />
              </Tooltip>
              <Popconfirm
                title="예약 삭제"
                description="이 예약을 삭제하시겠습니까?"
                onConfirm={() => handleDelete(record.id)}
                okText="삭제"
                cancelText="취소"
              >
                <Tooltip title="삭제">
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'failed' && record.error_message && (
            <Tooltip title={record.error_message}>
              <Button type="text" size="small" danger>
                오류 확인
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '대기중' },
    { key: 'uploading', label: '업로드중' },
    { key: 'published', label: '완료' },
    { key: 'failed', label: '실패' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          업로드 예약 목록
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            새로고침
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/schedules/new')}>
            새 예약
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={schedules}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}건`,
        }}
        locale={{ emptyText: '예약된 업로드가 없습니다.' }}
      />
    </div>
  );
};

export default Dashboard;
