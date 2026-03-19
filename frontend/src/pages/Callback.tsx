import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message, Result } from 'antd';
import { sendCallback } from '../api/client';

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('인증 코드가 없습니다.');
      return;
    }

    const handleCallback = async () => {
      try {
        await sendCallback(code, state || '');
        message.success('TikTok 계정이 연결되었습니다.');
        navigate('/accounts');
      } catch {
        setError('계정 연결에 실패했습니다.');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <Result
        status="error"
        title="연결 실패"
        subTitle={error}
        extra={<a href="/accounts">계정 페이지로 돌아가기</a>}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Spin size="large" />
      <p style={{ marginTop: 16 }}>TikTok 계정 연결 중...</p>
    </div>
  );
};

export default Callback;
