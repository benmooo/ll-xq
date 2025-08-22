export class AudioManager {
  private activeAudios: Set<HTMLAudioElement> = new Set();

  play(effectName: string, ext = 'mp3', volume = 0.7): HTMLAudioElement {
    const audio = new Audio(`/sounds/${effectName}.${ext}`);
    audio.volume = volume;

    this.activeAudios.add(audio);

    audio.play().catch(console.error);

    audio.addEventListener('ended', () => this.cleanupAudio(audio));
    audio.addEventListener('error', () => this.cleanupAudio(audio));

    return audio;
  }

  private cleanupAudio(audio: HTMLAudioElement) {
    audio.pause();
    audio.src = '';
    audio.load();
    this.activeAudios.delete(audio);
  }

  // 强制停止所有音频
  stopAll() {
    this.activeAudios.forEach((audio) => {
      audio.pause();
      audio.src = '';
      audio.load();
    });
    this.activeAudios.clear();
  }

  // 销毁管理器
  destroy() {
    this.stopAll();
  }
}
