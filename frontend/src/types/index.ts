export interface TikTokAccount {
  id: number;
  open_id: string;
  display_name: string;
  token_expires_at: string;
  created_at: string;
}

export interface ScheduledUpload {
  id: number;
  account_id: number;
  video_filename: string;
  title: string;
  privacy_level: string;
  disable_comment: boolean;
  disable_duet: boolean;
  disable_stitch: boolean;
  product_id: string | null;
  scheduled_time: string;
  status: 'pending' | 'uploading' | 'published' | 'failed';
  publish_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulePayload {
  account_id: number;
  video_filename: string;
  title: string;
  privacy_level: string;
  disable_comment: boolean;
  disable_duet: boolean;
  disable_stitch: boolean;
  product_id?: string | null;
  scheduled_time: string;
}
