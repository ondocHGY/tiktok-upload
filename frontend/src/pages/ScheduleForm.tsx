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
  Modal,
  Typography,
  Space,
  Spin,
  Alert,
  Checkbox,
  Divider,
} from 'antd';
import { ArrowLeftOutlined, UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { TikTokAccount, CreateSchedulePayload, Product } from '../types';
import {
  getAccounts,
  getVideoFiles,
  createSchedule,
  updateSchedule,
  getSchedule,
  uploadVideoFile,
  getProducts,
  getCreatorInfo,
} from '../api/client';

const { Title, Text, Link } = Typography;
const { TextArea } = Input;

const ALL_PRIVACY_OPTIONS = [
  { value: 'PUBLIC_TO_EVERYONE', label: '전체 공개' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: '서로 팔로우 친구만' },
  { value: 'FOLLOWER_OF_CREATOR', label: '팔로워만' },
  { value: 'SELF_ONLY', label: '나만 보기' },
];

interface CreatorInfo {
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

const ScheduleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [musicConsent, setMusicConsent] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const [accountsData, videosData, productsData] = await Promise.all([
          getAccounts(),
          getVideoFiles(),
          getProducts(),
        ]);
        setAccounts(accountsData);
        setVideoFiles(videosData);
        setProducts(productsData);

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
          setSelectedProductId(schedule.product_id || null);
          await fetchCreatorInfo(schedule.account_id);
        }
      } catch (error) {
        message.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, isEdit, form]);

  const fetchCreatorInfo = async (accountId: number) => {
    setCreatorLoading(true);
    setCreatorInfo(null);
    try {
      const resp = await getCreatorInfo(accountId);
      const data: CreatorInfo = resp?.data ?? {};
      setCreatorInfo(data);

      // creator_info 기반으로 상호작용 옵션 강제 적용
      if (data.comment_disabled) form.setFieldValue('disable_comment', true);
      if (data.duet_disabled) form.setFieldValue('disable_duet', true);
      if (data.stitch_disabled) form.setFieldValue('disable_stitch', true);

      // privacy_level이 허용 목록에 없으면 초기화
      const current = form.getFieldValue('privacy_level');
      if (current && data.privacy_level_options?.length && !data.privacy_level_options.includes(current)) {
        form.setFieldValue('privacy_level', undefined);
      }
    } catch {
      message.warning('크리에이터 정보를 불러오지 못했습니다. 계속 진행할 수 있지만 일부 옵션이 제한될 수 있습니다.');
    } finally {
      setCreatorLoading(false);
    }
  };

  const handleAccountChange = (accountId: number) => {
    fetchCreatorInfo(accountId);
    form.setFieldValue('privacy_level', undefined);
  };

  const privacyOptions = creatorInfo?.privacy_level_options?.length
    ? ALL_PRIVACY_OPTIONS.filter((o) => creatorInfo.privacy_level_options.includes(o.value))
    : ALL_PRIVACY_OPTIONS;

  const isBrandedContent = Boolean(selectedProductId);

  const handleSubmit = async (values: any, force = false) => {
    if (!musicConsent) {
      message.error('음악 사용 정책에 동의해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateSchedulePayload = {
        account_id: values.account_id,
        video_filename: values.video_filename,
        title: values.title,
        privacy_level: isBrandedContent ? 'PUBLIC_TO_EVERYONE' : values.privacy_level,
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
        await createSchedule(payload, force);
        message.success('예약이 생성되었습니다.');
      }
      navigate('/');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (error?.response?.status === 409 && detail?.code === 'DUPLICATE_VIDEO') {
        setSubmitting(false);
        Modal.confirm({
          title: '중복 영상 감지',
          content: detail.message,
          okText: '그래도 등록',
          cancelText: '취소',
          onOk: () => handleSubmit(values, true),
        });
        return;
      }
      message.error(typeof detail === 'string' ? detail : '저장에 실패했습니다.');
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
          <Select placeholder="TikTok 계정을 선택하세요" onChange={handleAccountChange}>
            {accounts.map((account) => (
              <Select.Option key={account.id} value={account.id}>
                {account.display_name} ({account.open_id})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Creator Info 표시 */}
        {creatorLoading && (
          <div style={{ marginBottom: 16 }}>
            <Spin size="small" /> <Text type="secondary"> 크리에이터 정보 확인 중...</Text>
          </div>
        )}
        {creatorInfo && !creatorLoading && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
            message={
              <span>
                <Text strong>{creatorInfo.creator_nickname}</Text> 계정으로 게시됩니다.
                {creatorInfo.max_video_post_duration_sec && (
                  <Text type="secondary">
                    {' '}(최대 영상 길이: {Math.floor(creatorInfo.max_video_post_duration_sec / 60)}분)
                  </Text>
                )}
              </span>
            }
          />
        )}

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

        <Form.Item name="product_id" label="연결 상품 (선택사항)">
          <Select
            placeholder="연결할 상품을 선택하세요"
            allowClear
            showSearch
            optionFilterProp="label"
            onChange={(val) => {
              setSelectedProductId(val || null);
              if (val) form.setFieldValue('privacy_level', 'PUBLIC_TO_EVERYONE');
            }}
            options={products.map((p) => ({
              value: p.item_id,
              label: `${p.name} (${p.item_id})`,
            }))}
          />
        </Form.Item>

        {/* Branded Content 고지 */}
        {isBrandedContent && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="브랜디드 콘텐츠 (Branded Content)"
            description={
              <span>
                상품이 연결된 영상은 TikTok의{' '}
                <Link href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">
                  브랜디드 콘텐츠 정책
                </Link>
                에 따라 <Text strong>전체 공개(Public)</Text>로만 게시됩니다.
                이 영상에는 유료 파트너십 라벨이 표시됩니다.
              </span>
            }
          />
        )}

        <Form.Item
          name="privacy_level"
          label="공개 설정"
          rules={[{ required: true, message: '공개 설정을 선택해주세요.' }]}
        >
          <Select
            placeholder="공개 범위를 선택해주세요"
            options={privacyOptions}
            disabled={isBrandedContent}
          />
        </Form.Item>
        {isBrandedContent && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            브랜디드 콘텐츠는 전체 공개로 고정됩니다.
          </Text>
        )}

        <Form.Item
          name="disable_comment"
          label="댓글 비활성화"
          valuePropName="checked"
        >
          <Switch disabled={creatorInfo?.comment_disabled} />
        </Form.Item>
        {creatorInfo?.comment_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 댓글이 비활성화되어 있습니다.
          </Text>
        )}

        <Form.Item
          name="disable_duet"
          label="듀엣 비활성화"
          valuePropName="checked"
        >
          <Switch disabled={creatorInfo?.duet_disabled} />
        </Form.Item>
        {creatorInfo?.duet_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 듀엣이 비활성화되어 있습니다.
          </Text>
        )}

        <Form.Item
          name="disable_stitch"
          label="스티치 비활성화"
          valuePropName="checked"
        >
          <Switch disabled={creatorInfo?.stitch_disabled} />
        </Form.Item>
        {creatorInfo?.stitch_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 스티치가 비활성화되어 있습니다.
          </Text>
        )}

        <Divider />

        {/* Music Usage Declaration */}
        <div style={{ marginBottom: 24 }}>
          <Text strong>음악 사용 고지</Text>
          <div style={{ marginTop: 8, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            <Checkbox
              checked={musicConsent}
              onChange={(e) => setMusicConsent(e.target.checked)}
            >
              <Text style={{ fontSize: 13 }}>
                이 영상에 사용된 음악은 TikTok의{' '}
                <Link href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">
                  음악 사용 정책
                </Link>
                을 준수하며, {isBrandedContent && (
                  <>
                    <Link href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">
                      브랜디드 콘텐츠 정책
                    </Link>
                    {' '}및{' '}
                  </>
                )}
                해당 콘텐츠에 대한 모든 권리를 보유하고 있음을 확인합니다.
              </Text>
            </Checkbox>
          </div>
        </div>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!musicConsent}
            >
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
