import { Injectable, Logger } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';

interface CachedTranscript {
  transcript: string;
  cachedAt: number;
}

@Injectable()
export class YouTubeTranscriptService {
  private readonly logger = new Logger(YouTubeTranscriptService.name);

  // Bộ nhớ đệm Cache phụ đề (TTL: 12 giờ, tối đa 100 video) để tối ưu tốc độ và tránh rò rỉ bộ nhớ
  private readonly cache = new Map<string, CachedTranscript>();
  private readonly CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  private readonly MAX_CACHE_ENTRIES = 100;

  /**
   * Trích xuất YouTube Video ID chuẩn (11 ký tự) từ URL hoặc mã ID
   */
  extractVideoId(urlOrId: string | null | undefined): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }
    const match = clean.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
    );
    return match?.[1] || null;
  }

  /**
   * Bóc tách phụ đề / lời thoại tự động từ YouTube video ID
   * Trả về chuỗi văn bản kèm mốc thời gian [MM:SS]
   */
  async fetchTranscript(urlOrId: string | null | undefined): Promise<string | null> {
    const videoId = this.extractVideoId(urlOrId);
    if (!videoId) return null;

    // Kiểm tra cache
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.transcript;
    }

    try {
      this.logger.log(`Đang bóc tách phụ đề video YouTube: ${videoId}...`);

      // 1. Ưu tiên tìm phụ đề tiếng Việt
      let items: Array<{ text: string; offset: number; duration: number }> = [];
      try {
        items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'vi' });
      } catch {
        // 2. Nếu không có phụ đề tiếng Việt riêng, lấy phụ đề mặc định / tự động tạo
        items = await YoutubeTranscript.fetchTranscript(videoId);
      }

      if (!items || items.length === 0) {
        this.logger.warn(`Video ${videoId} không có phụ đề (caption/transcript).`);
        return null;
      }

      // 3. Chuẩn hóa thành danh sách mốc thời gian [MM:SS]
      const lines: string[] = [];
      for (const item of items) {
        const text = (item.text || '')
          .replace(/\n/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (!text) continue;

        const totalSec = Math.floor((item.offset || 0) / 1000);
        const min = Math.floor(totalSec / 60)
          .toString()
          .padStart(2, '0');
        const sec = (totalSec % 60).toString().padStart(2, '0');
        lines.push(`[${min}:${sec}] ${text}`);
      }

      const formattedTranscript = lines.join('\n');
      // Giới hạn độ dài tối đa 20.000 ký tự để vừa vặn context window của mô hình
      const trimmedTranscript =
        formattedTranscript.length > 20000
          ? `${formattedTranscript.slice(0, 20000)}\n...[Đã cắt ngắn phần còn lại của video]`
          : formattedTranscript;

      // Giới hạn bộ nhớ đệm: Xóa mục cũ nhất nếu đạt giới hạn
      if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }

      // Lưu vào cache
      this.cache.set(videoId, {
        transcript: trimmedTranscript,
        cachedAt: Date.now(),
      });

      this.logger.log(
        `Bóc tách thành công ${lines.length} câu thoại từ video YouTube (${videoId})!`,
      );
      return trimmedTranscript;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể bóc tách phụ đề video ${videoId}: ${msg}`);
      return null;
    }
  }
}
