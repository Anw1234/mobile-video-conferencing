import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  health() {
    return { ok: true, ts: Date.now() };
  }

  version() {
    return { name: 'mobile-video-conferencing', apiVersion: 'v1' };
  }
}