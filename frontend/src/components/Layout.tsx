import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import {
  DashboardOutlined,
  ScheduleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Sider, Content, Header } = AntLayout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/accounts')) return 'accounts';
    if (location.pathname.startsWith('/schedules')) return 'schedules';
    return 'dashboard';
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '대시보드',
      onClick: () => navigate('/'),
    },
    {
      key: 'schedules',
      icon: <ScheduleOutlined />,
      label: '업로드 예약',
      onClick: () => navigate('/schedules/new'),
    },
    {
      key: 'accounts',
      icon: <UserOutlined />,
      label: '계정 관리',
      onClick: () => navigate('/accounts'),
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="80"
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1677ff' }}>
            TikTok 스케줄러
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, color: '#333' }}>TikTok 영상 업로드 스케줄러</h3>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;
