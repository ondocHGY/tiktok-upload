import axios from 'axios';
import { ScheduledUpload, TikTokAccount, CreateSchedulePayload } from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSchedules = async (status?: string): Promise<ScheduledUpload[]> => {
  const params = status && status !== 'all' ? { status } : {};
  const response = await api.get('/api/schedules', { params });
  return response.data;
};

export const createSchedule = async (data: CreateSchedulePayload): Promise<ScheduledUpload> => {
  const response = await api.post('/api/schedules', data);
  return response.data;
};

export const getSchedule = async (id: number): Promise<ScheduledUpload> => {
  const response = await api.get(`/api/schedules/${id}`);
  return response.data;
};

export const updateSchedule = async (id: number, data: Partial<CreateSchedulePayload>): Promise<ScheduledUpload> => {
  const response = await api.put(`/api/schedules/${id}`, data);
  return response.data;
};

export const deleteSchedule = async (id: number): Promise<void> => {
  await api.delete(`/api/schedules/${id}`);
};

export const getVideoFiles = async (): Promise<string[]> => {
  const response = await api.get('/api/schedules/videos/list');
  return response.data.files;
};

export const uploadVideoFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/schedules/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.filename;
};

export const uploadNow = async (id: number): Promise<void> => {
  await api.post(`/api/schedules/${id}/upload-now`);
};

export const getAccounts = async (): Promise<TikTokAccount[]> => {
  const response = await api.get('/auth/accounts');
  return response.data;
};

export const deleteAccount = async (id: number): Promise<void> => {
  await api.delete(`/auth/accounts/${id}`);
};

export const loginTikTok = async (): Promise<void> => {
  const response = await api.get('/auth/login');
  window.location.href = response.data.auth_url;
};

export const sendCallback = async (code: string, state: string): Promise<void> => {
  await api.post('/auth/callback', { code, state });
};

export default api;
