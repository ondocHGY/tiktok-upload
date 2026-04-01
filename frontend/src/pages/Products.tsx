import React, { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Product } from '../types';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client';

const { Title } = Typography;

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } catch {
      message.error('상품 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      item_id: product.item_id,
      description: product.description || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: { name: string; item_id: string; description?: string }) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        message.success('상품이 수정되었습니다.');
      } else {
        await createProduct(values);
        message.success('상품이 등록되었습니다.');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      message.success('상품이 삭제되었습니다.');
      fetchProducts();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '상품명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '상품 ID (item_id)',
      dataIndex: 'item_id',
      key: 'item_id',
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      render: (v: string | null) => v || '-',
    },
    {
      title: '등록일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('ko-KR'),
    },
    {
      title: '관리',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="이 상품을 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button size="small" icon={<DeleteOutlined />} danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>상품 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          상품 등록
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingProduct ? '상품 수정' : '상품 등록'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="상품명"
            rules={[{ required: true, message: '상품명을 입력해주세요.' }]}
          >
            <Input placeholder="예) 기초 스킨케어 세트" />
          </Form.Item>

          <Form.Item
            name="item_id"
            label="상품 ID (item_id)"
            rules={[{ required: true, message: '상품 ID를 입력해주세요.' }]}
          >
            <Input placeholder="TikTok Shop 상품 ID" />
          </Form.Item>

          <Form.Item name="description" label="설명 (선택)">
            <Input.TextArea rows={2} placeholder="상품에 대한 간단한 메모" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingProduct ? '수정' : '등록'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
