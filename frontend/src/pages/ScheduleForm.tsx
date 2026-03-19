import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Button,
  Upload,
  message,
  Typography,
  Space,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { TikTokAccount, CreateSchedulePayload } from '../types';
import {
  getAccounts,
  getVideoFiles,
  createSchedule,
  updateSchedule,
  getSchedule,
  uploadVideoFile,
} from '../api/client';

const { Title } = Typography;
const { TextArea } = Input;

const privacyOptions = [
  { value: 'PUBLIC_TO_EVERYONE', label: '전체 공개' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: '서로 팔로우 친구만' },
  { value: 'FOLLOWER_OF_CREATOR', label: '팔로워만' },
  { value: 'SELF_ONLY', label: '나만 보기' },
];

const ScheduleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const [accountsData, videosData] = await Promise.all([
          getAccounts(),
          getVideoFiles(),
        ]);
        setAccounts(accountsData);
        setVideoFiles(videosData);

        if (isEdit && id) {
          const schedule = await getSchedule(Number(id));
          form.setFieldsValue({
            account_id: schedule.account_id,
            video_filename: schedule.video_filename,
            title: schedule.title,
            scheduled_time: dayjs(schedule.scheduled_time),
            privacy_level: schedule.privacy_level,
            disable_comment: schedule.disable_comment,
            disable_duet: schedule.disable_duet,
            disable_stitch: schedule.disable_stitch,
            product_id: schedule.product_id || '',
          });
        }
      } catch (error) {
        message.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, isEdit, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: CreateSchedulePayload = {
        account_id: values.account_id,
        video_filename: values.video_filename,
        title: values.title,
        privacy_level: values.privacy_level,
        disable_comment: values.disable_comment || false,
        disable_duet: values.disable_duet || false,
        disable_stitch: values.disable_stitch || false,
        product_id: values.product_id || null,
        scheduled_time: values.scheduled_time.toISOString(),
      };

      if (isEdit && id) {
        await updateSchedule(Number(id), payload);
        message.success('예약이 수정되었습니다.');
      } else {
        await createSchedule(payload);
        message.success('예약이 생성되었습니다.');
      }
      navigate('/');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || '저장에 실패했습니다.';
      message.error(typeof errorMsg === 'string' ? errorMsg : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          돌아가기
        </Button>
      </Space>

      <Title level={4}>{isEdit ? '예약 수정' : '새 업로드 예약'}</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        }}
      >
        <Form.Item
          name="account_id"
          label="계정 선택"
          rules={[{ required: true, message: '계정을 선택해주세요.' }]}
        >
          <Select placeholder="TikTok 계정을 선택하세요">
            {accounts.map((account) => (
              <Select.Option key={account.id} value={account.id}>
                {account.display_name} ({account.open_id})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="video_filename"
          label="영상 파일"
          rules={[{ required: true, message: '영상 파일을 선택해주세요.' }]}
        >
          <Select placeholder="업로드할 영상 파일을 선택하세요"
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
                  <Upload
                    accept="video/*"
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      setUploading(true);
                      try {
                        const filename = await uploadVideoFile(file);
                        setVideoFiles((prev) => [...prev, filename]);
                        form.setFieldValue('video_filename', filename);
                        message.success(`${filename} 업로드 완료`);
                      } catch {
                        message.error('파일 업로드에 실패했습니다.');
                      } finally {
                        setUploading(false);
                      }
                      return false;
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading} block>
                      영상 파일 업로드
                    </Button>
                  </Upload>
                </div>
              </>
            )}
          >
            {videoFiles.map((file) => (
              <Select.Option key={file} value={file}>
                {file}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="title"
          label="제목"
          rules={[{ required: true, message: '제목을 입력해주세요.' }]}
        >
          <TextArea
            rows={3}
            placeholder="영상 제목 및 해시태그를 입력하세요"
            maxLength={2200}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="scheduled_time"
          label="예약 시간"
          rules={[{ required: true, message: '예약 시간을 선택해주세요.' }]}
        >
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            placeholder="예약 날짜와 시간을 선택하세요"
            style={{ width: '100%' }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="privacy_level"
          label="공개 설정"
          rules={[{ required: true, message: '공개 설정을 선택해주세요.' }]}
        >
          <Select options={privacyOptions} />
        </Form.Item>

        <Form.Item
          name="disable_comment"
          label="댓글 비활성화"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="disable_duet"
          label="듀엣 비활성화"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="disable_stitch"
          label="스티치 비활성화"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item name="product_id" label="상품 ID (선택사항)">
          <Input placeholder="TikTok Shop 상품 ID" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEdit ? '수정하기' : '예약하기'}
            </Button>
            <Button onClick={() => navigate('/')}>취소</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ScheduleForm;
