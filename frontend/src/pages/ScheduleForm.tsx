import React, { useEffect, useState, useRef } from 'react';
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
  Card,
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
  { value: 'PUBLIC_TO_EVERYONE', label: '전체 공개 (Public to Everyone)' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: '서로 팔로우 친구만 (Mutual Follow Friends)' },
  { value: 'FOLLOWER_OF_CREATOR', label: '팔로워만 (Followers Only)' },
  { value: 'SELF_ONLY', label: '나만 보기 (Self Only)' },
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

  // Content Disclosure state
  const [contentDisclosureOn, setContentDisclosureOn] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [musicConsent, setMusicConsent] = useState(false);
  const creatorInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            allow_comment: !schedule.disable_comment,
            allow_duet: !schedule.disable_duet,
            allow_stitch: !schedule.disable_stitch,
            product_id: schedule.product_id || '',
          });
          const hasDisclosure = schedule.brand_organic_toggle || schedule.brand_content_toggle;
          setContentDisclosureOn(hasDisclosure);
          setYourBrand(schedule.brand_organic_toggle || false);
          setBrandedContent(schedule.brand_content_toggle || false);
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

      if (data.comment_disabled) form.setFieldValue('allow_comment', false);
      if (data.duet_disabled) form.setFieldValue('allow_duet', false);
      if (data.stitch_disabled) form.setFieldValue('allow_stitch', false);

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
    form.setFieldValue('privacy_level', undefined);
    if (creatorInfoTimer.current) clearTimeout(creatorInfoTimer.current);
    creatorInfoTimer.current = setTimeout(() => fetchCreatorInfo(accountId), 500);
  };

  const privacyOptions = creatorInfo?.privacy_level_options?.length
    ? ALL_PRIVACY_OPTIONS.filter((o) => creatorInfo.privacy_level_options.includes(o.value))
    : ALL_PRIVACY_OPTIONS;

  const handleContentDisclosureToggle = (checked: boolean) => {
    setContentDisclosureOn(checked);
    if (!checked) {
      setYourBrand(false);
      setBrandedContent(false);
      setSelectedProductId(null);
      form.setFieldValue('product_id', undefined);
    }
  };

  const handleBrandedContentChange = (checked: boolean) => {
    setBrandedContent(checked);
    if (checked) {
      form.setFieldValue('privacy_level', 'PUBLIC_TO_EVERYONE');
    } else {
      setSelectedProductId(null);
      form.setFieldValue('product_id', undefined);
      form.setFieldValue('privacy_level', undefined);
    }
  };

  const privacyDisabled = brandedContent;

  const disclosureValid = !contentDisclosureOn || yourBrand || brandedContent;

  const handleSubmit = async (values: any, force = false) => {
    if (!musicConsent) {
      message.error('음악 사용 정책에 동의해주세요.');
      return;
    }
    if (!disclosureValid) {
      message.error('콘텐츠 공개 설정을 완료해주세요. Your Brand 또는 Branded Content 중 하나를 선택해야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateSchedulePayload = {
        account_id: values.account_id,
        video_filename: values.video_filename,
        title: values.title,
        privacy_level: brandedContent ? 'PUBLIC_TO_EVERYONE' : values.privacy_level,
        disable_comment: !values.allow_comment,
        disable_duet: !values.allow_duet,
        disable_stitch: !values.allow_stitch,
        brand_organic_toggle: yourBrand,
        brand_content_toggle: brandedContent,
        product_id: brandedContent ? (selectedProductId || null) : null,
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
          돌아가기 (Back)
        </Button>
      </Space>

      <Title level={4}>{isEdit ? '예약 수정 (Edit Schedule)' : '새 업로드 예약 (New Upload Schedule)'}</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          allow_comment: false,
          allow_duet: false,
          allow_stitch: false,
        }}
      >
        {/* ── Point 1: 계정 선택 + Creator Info ── */}
        <Form.Item
          name="account_id"
          label="계정 선택 (Account)"
          rules={[{ required: true, message: '계정을 선택해주세요.' }]}
        >
          <Select placeholder="TikTok 계정을 선택하세요 (Select Account)" onChange={handleAccountChange}>
            {accounts.map((account) => (
              <Select.Option key={account.id} value={account.id}>
                {account.display_name} ({account.open_id})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {creatorLoading && (
          <div style={{ marginBottom: 16 }}>
            <Spin size="small" /> <Text type="secondary"> 크리에이터 정보 확인 중... (Loading creator info...)</Text>
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
                <Text strong>{creatorInfo.creator_nickname}</Text> 계정으로 게시됩니다. (Posting as this account)
                {creatorInfo.max_video_post_duration_sec && (
                  <Text type="secondary">
                    {' '}— 최대 영상 길이 (Max Video Duration): {Math.floor(creatorInfo.max_video_post_duration_sec / 60)}분 (min)
                  </Text>
                )}
              </span>
            }
          />
        )}

        <Form.Item
          name="video_filename"
          label="영상 파일 (Video File)"
          rules={[{ required: true, message: '영상 파일을 선택해주세요.' }]}
        >
          <Select
            placeholder="업로드할 영상 파일을 선택하세요"
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
                      영상 파일 업로드 (Upload Video File)
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
          label="제목 / 캡션 (Title / Caption)"
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
          label="예약 시간 (Scheduled Time)"
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

        {/* ── Point 2: Privacy Level ── */}
        <Form.Item
          name="privacy_level"
          label="공개 설정 (Privacy Level)"
          rules={[{ required: true, message: '공개 설정을 선택해주세요.' }]}
        >
          <Select
            placeholder="공개 범위를 선택해주세요 (Select Privacy Level)"
            options={privacyOptions}
            disabled={privacyDisabled}
          />
        </Form.Item>
        {privacyDisabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            Branded Content는 전체 공개로 고정됩니다.
          </Text>
        )}

        {/* Point 2c: Interaction settings — all OFF by default, user manually enables */}
        <Form.Item name="allow_comment" label="댓글 허용 (Allow Comment)" valuePropName="checked">
          <Switch disabled={creatorInfo?.comment_disabled} />
        </Form.Item>
        {creatorInfo?.comment_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 댓글이 허용되지 않습니다. (Comment not available for this account)
          </Text>
        )}

        <Form.Item name="allow_duet" label="듀엣 허용 (Allow Duet)" valuePropName="checked">
          <Switch disabled={creatorInfo?.duet_disabled} />
        </Form.Item>
        {creatorInfo?.duet_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 듀엣이 허용되지 않습니다. (Duet not available for this account)
          </Text>
        )}

        <Form.Item name="allow_stitch" label="스티치 허용 (Allow Stitch)" valuePropName="checked">
          <Switch disabled={creatorInfo?.stitch_disabled} />
        </Form.Item>
        {creatorInfo?.stitch_disabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>
            이 계정은 스티치가 허용되지 않습니다. (Stitch not available for this account)
          </Text>
        )}

        <Divider />

        {/* ── Point 3: Content Disclosure Setting ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 15 }}>콘텐츠 공개 설정 (Content Disclosure)</Text>
            <Switch checked={contentDisclosureOn} onChange={handleContentDisclosureToggle} />
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            이 영상이 상품이나 서비스를 홍보하는 대가로 무언가를 제공받은 경우 켜주세요.
            본인 브랜드 또는 제3자 브랜드 홍보 여부를 선택할 수 있습니다.
          </Text>

          {contentDisclosureOn && (
            <Card size="small" style={{ marginTop: 12, background: '#fafafa' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div>
                  <Checkbox
                    checked={yourBrand}
                    onChange={(e) => setYourBrand(e.target.checked)}
                  >
                    <Text strong>Your Brand</Text>
                  </Checkbox>
                  <div style={{ marginLeft: 24, marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      본인 또는 본인 사업을 홍보하는 영상입니다. Brand Organic Content로 분류됩니다.
                    </Text>
                  </div>
                </div>

                <div>
                  <Checkbox
                    checked={brandedContent}
                    onChange={(e) => handleBrandedContentChange(e.target.checked)}
                  >
                    <Text strong>Branded Content</Text>
                  </Checkbox>
                  <div style={{ marginLeft: 24, marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      다른 브랜드 또는 제3자를 홍보하는 영상입니다. &apos;유료 파트너십&apos; 라벨이 표시되며{' '}
                      <Link href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">
                        브랜디드 콘텐츠 정책
                      </Link>
                      이 적용됩니다.
                    </Text>
                  </div>
                </div>

                {!disclosureValid && (
                  <Alert type="error" showIcon message="Your Brand 또는 Branded Content 중 하나 이상을 선택해야 합니다." />
                )}

                {brandedContent && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Branded Content 선택됨"
                    description="공개 설정이 전체 공개(Public)로 고정되며, 유료 파트너십 라벨이 자동으로 표시됩니다."
                    style={{ marginTop: 4 }}
                  />
                )}

                {brandedContent && (
                  <Form.Item name="product_id" label="연결 상품 (Linked Product, Optional)" style={{ marginBottom: 0 }}>
                    <Select
                      placeholder="연결할 TikTok Shop 상품을 선택하세요 (Select linked product)"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      onChange={(val) => setSelectedProductId(val || null)}
                      options={products.map((p) => ({
                        value: p.item_id,
                        label: `${p.name} (${p.item_id})`,
                      }))}
                    />
                  </Form.Item>
                )}
              </Space>
            </Card>
          )}
        </div>

        <Divider />

        {/* ── Point 4: Music Usage Confirmation — declaration must be clickable ── */}
        <div style={{ marginBottom: 24 }}>
          <Text strong>음악 사용 확인 (Music Usage Confirmation)</Text>
          <div style={{ marginTop: 8, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: 10 }}>
              <Link
                href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13 }}
              >
                TikTok 음악 사용 정책 확인하기 (View TikTok Music Usage Policy) →
              </Link>
              {brandedContent && (
                <>
                  {'  '}
                  <Link
                    href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13 }}
                  >
                    브랜디드 콘텐츠 정책 확인하기 (View Branded Content Policy) →
                  </Link>
                </>
              )}
            </div>
            <Checkbox
              checked={musicConsent}
              onChange={(e) => setMusicConsent(e.target.checked)}
            >
              <Text style={{ fontSize: 13 }}>
                위 정책을 확인하였으며, 이 영상에 사용된 음악에 대한 모든 권리를 보유하고 있음을 확인합니다.
              </Text>
            </Checkbox>
          </div>
        </div>

        {/* ── Point 5: Direct Post 고지 + 처리 시간 안내 (Point 5d) ── */}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message="직접 게시 안내 (Direct Post)"
          description="예약 시간이 되면 이 영상은 별도 검토 없이 TikTok에 즉시 게시됩니다. 게시 후 콘텐츠가 프로필에 표시되기까지 몇 분 정도 소요될 수 있습니다. 예약 전에 영상 내용, 공개 설정, 콘텐츠 공개 정보를 다시 한번 확인해주세요."
        />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!musicConsent || !disclosureValid}
            >
              {isEdit ? '수정하기 (Save)' : '예약하기 (Schedule)'}
            </Button>
            <Button onClick={() => navigate('/')}>취소 (Cancel)</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ScheduleForm;
