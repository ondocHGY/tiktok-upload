import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Popconfirm, message, Typography, Empty, Spin, Row, Col, Descriptions, Modal, Form, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { TikTokAccount } from '../types';
import { getAccounts, deleteAccount, loginTikTok, updateAccount } from '../api/client';

const { Title } = Typography;

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TikTokAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      message.error('계정 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openEdit = (account: TikTokAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({ display_name: account.display_name });
  };

  const handleRename = async (values: { display_name: string }) => {
    if (!editingAccount) return;
    setSubmitting(true);
    try {
      const updated = await updateAccount(editingAccount.id, values);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      message.success('계정 이름이 변경되었습니다.');
      setEditingAccount(null);
    } catch {
      message.error('이름 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAccount(id);
      message.success('계정이 삭제되었습니다.');
      fetchAccounts();
    } catch (error) {
      message.error('계정 삭제에 실패했습니다.');
    }
  };

  const isTokenExpired = (expiresAt: string) => {
    return dayjs(expiresAt).isBefore(dayjs());
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          TikTok 계정 관리
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={loginTikTok}>
          TikTok 계정 연결
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="연결된 계정이 없습니다."
        >
          <Button type="primary" onClick={loginTikTok}>
            TikTok 계정 연결하기
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {accounts.map((account) => (
            <Col key={account.id} xs={24} sm={24} md={12} lg={8}>
              <Card
                hoverable
                actions={[
                  <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(account)}>
                    이름 변경
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="계정 삭제"
                    description="이 계정을 삭제하시겠습니까? 관련된 예약도 함께 확인해주세요."
                    onConfirm={() => handleDelete(account.id)}
                    okText="삭제"
                    cancelText="취소"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                      삭제
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#1677ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
                    </div>
                  }
                  title={account.display_name}
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Open ID">
                          <span style={{ fontSize: 12, color: '#999' }}>
                            {account.open_id.substring(0, 16)}...
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="토큰 만료">
                          <span
                            style={{
                              color: isTokenExpired(account.token_expires_at) ? '#ff4d4f' : '#52c41a',
                            }}
                          >
                            {dayjs(account.token_expires_at).format('YYYY-MM-DD HH:mm')}
                            {isTokenExpired(account.token_expires_at) && ' (만료됨)'}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="연결일">
                          {dayjs(account.created_at).format('YYYY-MM-DD')}
                        </Descriptions.Item>
                      </Descriptions>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
      <Modal
        title="계정 이름 변경"
        open={!!editingAccount}
        onCancel={() => setEditingAccount(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleRename} style={{ marginTop: 16 }}>
          <Form.Item
            name="display_name"
            label="계정 이름"
            rules={[{ required: true, message: '이름을 입력해주세요.' }]}
          >
            <Input placeholder="표시할 계정 이름" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditingAccount(null)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>저장</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
